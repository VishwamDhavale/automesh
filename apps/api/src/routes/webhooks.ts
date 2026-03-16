import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { db, schema } from '../db/index.js';
import { desc, eq, and, inArray } from 'drizzle-orm';
import { getAdapter } from '@automesh/integrations';
import type { EventRouter } from '@automesh/workflow-engine';
import { workflowQueue } from '../queue/queue.js';

export async function webhookRoutes(app: FastifyInstance, eventRouter?: EventRouter) {
  // Webhook ingestion endpoint
  // POST /api/webhooks/:integrationId
  app.post('/api/webhooks/:integrationId', {
    config: {
      rawBody: true,
    },
  }, async (request, reply) => {
    const { integrationId } = request.params as { integrationId: string };
    
    const [integration] = await db
      .select()
      .from(schema.integrations)
      .where(eq(schema.integrations.id, integrationId));

    if (!integration) {
      return reply.status(404).send({ error: 'Integration not found' });
    }

    const provider = integration.provider;
    const adapter = getAdapter(provider);

    if (!adapter) {
      return reply.status(404).send({ error: `Unknown provider: ${provider}` });
    }

    const rawBody = typeof request.body === 'string'
      ? request.body
      : JSON.stringify(request.body);

    // Verify webhook signature (if secret is configured in DB)
    let secret: string | undefined;

    if (integration.config) {
      const config = integration.config as Record<string, string>;
      
      if (provider === 'github') secret = config.webhookSecret;
      else if (provider === 'stripe') secret = config.webhookSecret;
      else if (provider === 'slack') secret = config.signingSecret;
    }

    if (secret) {
      const signatureHeaders: Record<string, string> = {
        stripe: 'stripe-signature',
        github: 'x-hub-signature-256',
        slack: 'x-slack-signature',
      };

      const headerName = signatureHeaders[provider] ?? '';
      const signature = (request.headers[headerName] as string) ?? '';

      if (!adapter.verifyWebhookSignature(rawBody, signature, secret)) {
        return reply.status(401).send({ error: 'Invalid webhook signature' });
      }
    }

    // Normalize event
    const headers = Object.fromEntries(
      Object.entries(request.headers)
        .filter(([, v]) => typeof v === 'string')
        .map(([k, v]) => [k, v as string])
    );

    const normalizedEvent = adapter.normalizeEvent(
      request.body as Record<string, unknown>,
      headers
    );

    // Match event against registered workflows and enqueue jobs
    if (eventRouter) {
      const allMatchedWorkflows = eventRouter.match(normalizedEvent);

      if (allMatchedWorkflows.length > 0) {
        // Fetch statuses of matched workflows to ensure we only trigger active ones
        const workflowIds = allMatchedWorkflows.map(w => w.id);
        const matchedActiveWorkflows = await db
          .select({ id: schema.workflows.id })
          .from(schema.workflows)
          .where(
            and(
              eq(schema.workflows.status, 'active'),
              inArray(schema.workflows.id, workflowIds)
            )
          );
        
        // Intersect matches with active workflows
        const activeMatches = allMatchedWorkflows.filter(mw => 
          matchedActiveWorkflows.some(aw => aw.id === mw.id)
        );

        if (activeMatches.length > 0) {
          // Store event and assign userId (SEC-02)
          await (db.insert(schema.events) as any).values({
            id: normalizedEvent.id,
            userId: integration.userId,
            source: normalizedEvent.source,
            eventType: normalizedEvent.type,
            payload: normalizedEvent.data,
          });

          for (const matched of activeMatches) {
            // Fetch latest version definition
            const [latestVersion] = await db
              .select()
              .from(schema.workflowVersions)
              .where(eq(schema.workflowVersions.workflowId, matched.id))
              .orderBy(desc(schema.workflowVersions.version))
              .limit(1);

            if (!latestVersion) continue;

            const runId = `run_${nanoid()}`;

            await (db.insert(schema.workflowRuns) as any).values({
              id: runId,
              userId: integration.userId,
              workflowId: matched.id,
              versionId: latestVersion.id,
              status: 'pending',
            });

            await workflowQueue.add('execute', {
              workflowId: matched.id,
              runId,
              definition: latestVersion.definition as Record<string, unknown>,
              context: { event: normalizedEvent },
            });
          }
        }
      }
    }

    return reply.send({
      received: true,
      eventId: normalizedEvent.id,
      type: `${normalizedEvent.source}.${normalizedEvent.type}`,
    });
  });
}

