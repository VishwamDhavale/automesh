import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { db, schema } from '../db/index.js';
import { desc, eq } from 'drizzle-orm';
import { getAdapter } from '@automesh/integrations';
import type { EventRouter } from '@automesh/workflow-engine';
import { workflowQueue } from '../queue/queue.js';

export async function webhookRoutes(app: FastifyInstance, eventRouter?: EventRouter) {
  // Webhook ingestion endpoint
  // POST /api/webhooks/:provider (e.g., /api/webhooks/stripe)
  app.post('/api/webhooks/:provider', {
    config: {
      rawBody: true,
    },
  }, async (request, reply) => {
    const { provider } = request.params as { provider: string };
    const adapter = getAdapter(provider);

    if (!adapter) {
      return reply.status(404).send({ error: `Unknown provider: ${provider}` });
    }

    const rawBody = typeof request.body === 'string'
      ? request.body
      : JSON.stringify(request.body);

    // Verify webhook signature (if secret is configured)
    const secrets: Record<string, string | undefined> = {
      stripe: process.env.STRIPE_WEBHOOK_SECRET,
      github: process.env.GITHUB_WEBHOOK_SECRET,
      slack: process.env.SLACK_SIGNING_SECRET,
    };

    const secret = secrets[provider];
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

    // Store event
    await db.insert(schema.events).values({
      id: normalizedEvent.id,
      source: normalizedEvent.source,
      eventType: normalizedEvent.type,
      payload: normalizedEvent.data,
    });

    // Match event against registered workflows and enqueue jobs
    if (eventRouter) {
      const matchedWorkflows = eventRouter.match(normalizedEvent);

      for (const matched of matchedWorkflows) {
        // Fetch latest version definition
        const [latestVersion] = await db
          .select()
          .from(schema.workflowVersions)
          .where(eq(schema.workflowVersions.workflowId, matched.id))
          .orderBy(desc(schema.workflowVersions.version))
          .limit(1);

        if (!latestVersion) continue;

        const runId = `run_${nanoid()}`;

        await db.insert(schema.workflowRuns).values({
          id: runId,
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

    return reply.send({
      received: true,
      eventId: normalizedEvent.id,
      type: `${normalizedEvent.source}.${normalizedEvent.type}`,
    });
  });
}

