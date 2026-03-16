import type { FastifyInstance } from 'fastify';
import { db, schema } from '../db/index.js';
import { eq, desc, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { parseWorkflow, WorkflowParseError } from '@automesh/workflow-engine';
import type { EventRouter } from '@automesh/workflow-engine';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { WorkflowDefinition } from '@automesh/shared-types';
import { workflowQueue } from '../queue/queue.js';

export async function workflowRoutes(app: FastifyInstance, eventRouter?: EventRouter) {
  // List all workflows
  app.get('/api/workflows', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const user = (request as any).user;
    const rows = await db
      .select()
      .from(schema.workflows)
      .where(eq(schema.workflows.userId, user.sub))
      .orderBy(desc(schema.workflows.createdAt));

    // Fetch latest version definition for each workflow
    const results = await Promise.all(
      rows.map(async (row) => {
        const versions = await db
          .select()
          .from(schema.workflowVersions)
          .where(eq(schema.workflowVersions.workflowId, row.id))
          .orderBy(desc(schema.workflowVersions.version))
          .limit(1);

        return {
          ...row,
          definition: versions[0]?.definition ?? null,
        };
      })
    );

    return reply.send(results);
  });

  // Get single workflow
  app.get('/api/workflows/:id', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const [workflow] = await db
      .select()
      .from(schema.workflows)
      .where(and(eq(schema.workflows.id, id), eq(schema.workflows.userId, user.sub)));

    if (!workflow) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }

    const versions = await db
      .select()
      .from(schema.workflowVersions)
      .where(eq(schema.workflowVersions.workflowId, id))
      .orderBy(desc(schema.workflowVersions.version));

    const runs = await db
      .select()
      .from(schema.workflowRuns)
      .where(eq(schema.workflowRuns.workflowId, id))
      .orderBy(desc(schema.workflowRuns.startedAt))
      .limit(20);

    return reply.send({
      ...workflow,
      versions,
      recentRuns: runs,
      definition: versions[0]?.definition ?? null,
    });
  });

  // Create workflow from YAML
  app.post('/api/workflows', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    try {
      const user = (request as any).user;
      const body = request.body as { yaml?: string; name?: string };
      const yamlContent = body.yaml;

      if (!yamlContent) {
        return reply.status(400).send({ error: 'Missing "yaml" in request body' });
      }

      const definition = parseWorkflow(yamlContent);
      const id = `wf_${nanoid()}`;
      const versionId = `wfv_${nanoid()}`;
      const name = body.name ?? definition.workflow;

      await (db.insert(schema.workflows) as any).values({
        id,
        userId: user.sub,
        name,
        currentVersion: 1,
      });

      await (db.insert(schema.workflowVersions) as any).values({
        id: versionId,
        workflowId: id,
        version: 1,
        definition: definition as unknown as Record<string, unknown>,
      });

      if (eventRouter && definition.trigger?.event) {
        eventRouter.register(id, definition as unknown as WorkflowDefinition);
      }

      return reply.status(201).send({
        id,
        name,
        version: 1,
        definition,
      });
    } catch (err) {
      if (err instanceof WorkflowParseError) {
        return reply.status(400).send({ error: err.message, details: err.errors });
      }
      throw err;
    }
  });

  // Update workflow (creates new version)
  app.put('/api/workflows/:id', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;
      const body = request.body as { yaml: string };

      const [workflow] = await db
        .select()
        .from(schema.workflows)
        .where(and(eq(schema.workflows.id, id), eq(schema.workflows.userId, user.sub)));

      if (!workflow) {
        return reply.status(404).send({ error: 'Workflow not found' });
      }

      const definition = parseWorkflow(body.yaml);
      const newVersion = workflow.currentVersion + 1;
      const versionId = `wfv_${nanoid()}`;

      await (db.insert(schema.workflowVersions) as any).values({
        id: versionId,
        workflowId: id,
        version: newVersion,
        definition: definition as unknown as Record<string, unknown>,
      });

      await db
        .update(schema.workflows)
        .set({
          currentVersion: newVersion,
          updatedAt: new Date(),
        } as any)
        .where(and(eq(schema.workflows.id, id), eq(schema.workflows.userId, user.sub)));

      if (eventRouter) {
        eventRouter.unregister(id);
        if (definition.trigger?.event) {
          eventRouter.register(id, definition as unknown as WorkflowDefinition);
        }
      }

      return reply.send({
        id,
        version: newVersion,
        definition,
      });
    } catch (err) {
      if (err instanceof WorkflowParseError) {
        return reply.status(400).send({ error: err.message, details: err.errors });
      }
      throw err;
    }
  });

  // Delete workflow
  app.delete('/api/workflows/:id', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const [workflow] = await db
      .select()
      .from(schema.workflows)
      .where(and(eq(schema.workflows.id, id), eq(schema.workflows.userId, user.sub)));

    if (!workflow) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }

    await db.delete(schema.workflows).where(eq(schema.workflows.id, id));

    if (eventRouter) {
      eventRouter.unregister(id);
    }

    return reply.send({ deleted: true });
  });

  // Pause workflow
  app.post('/api/workflows/:id/pause', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const [workflow] = await db
      .select()
      .from(schema.workflows)
      .where(and(eq(schema.workflows.id, id), eq(schema.workflows.userId, user.sub)));

    if (!workflow) return reply.status(404).send({ error: 'Workflow not found' });

    await db
      .update(schema.workflows)
      .set({ status: 'paused', updatedAt: new Date() } as any)
      .where(and(eq(schema.workflows.id, id), eq(schema.workflows.userId, user.sub)));

    if (eventRouter) eventRouter.unregister(id);

    return reply.send({ id, status: 'paused' });
  });

  // Resume workflow
  app.post('/api/workflows/:id/resume', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const [workflow] = await db
      .select()
      .from(schema.workflows)
      .where(and(eq(schema.workflows.id, id), eq(schema.workflows.userId, user.sub)));

    if (!workflow) return reply.status(404).send({ error: 'Workflow not found' });

    await db
      .update(schema.workflows)
      .set({ status: 'active', updatedAt: new Date() } as any)
      .where(and(eq(schema.workflows.id, id), eq(schema.workflows.userId, user.sub)));

    const [latestVersion] = await db
      .select()
      .from(schema.workflowVersions)
      .where(eq(schema.workflowVersions.workflowId, id))
      .orderBy(desc(schema.workflowVersions.version))
      .limit(1);

    if (eventRouter && latestVersion?.definition) {
      const def = latestVersion.definition as unknown as WorkflowDefinition;
      if (def.trigger?.event) {
        eventRouter.register(id, def);
      }
    }

    return reply.send({ id, status: 'active' });
  });

  // Manual trigger
  app.post('/api/workflows/:id/trigger', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const body = (request.body as Record<string, unknown>) ?? {};

    const [workflow] = await db
      .select()
      .from(schema.workflows)
      .where(and(eq(schema.workflows.id, id), eq(schema.workflows.userId, user.sub)));

    if (!workflow) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }

    // Fetch latest version definition
    const [latestVersion] = await db
      .select()
      .from(schema.workflowVersions)
      .where(eq(schema.workflowVersions.workflowId, id))
      .orderBy(desc(schema.workflowVersions.version))
      .limit(1);

    if (!latestVersion) {
      return reply.status(400).send({ error: 'No workflow version found' });
    }

    const runId = `run_${nanoid()}`;

    await (db.insert(schema.workflowRuns) as any).values({
      id: runId,
      userId: user.sub,
      workflowId: id,
      versionId: latestVersion.id,
      status: 'pending',
    });

    // Enqueue to BullMQ for background execution
    await workflowQueue.add('execute', {
      workflowId: id,
      runId,
      definition: latestVersion.definition as Record<string, unknown>,
      context: body,
    });

    return reply.status(202).send({
      runId,
      workflowId: id,
      status: 'pending',
      message: 'Workflow execution queued',
    });
  });
}
