import type { FastifyInstance } from 'fastify';
import { db, schema } from '../db/index.js';
import { eq, desc, and } from 'drizzle-orm';

export async function runRoutes(app: FastifyInstance) {
  // List all runs
  app.get('/api/runs', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const user = (request as any).user;
    const query = request.query as { workflowId?: string; limit?: string };
    const limit = Math.min(parseInt(query.limit ?? '50', 10), 100);

    let q = db
      .select({
        run: schema.workflowRuns,
        workflowName: schema.workflows.name,
      })
      .from(schema.workflowRuns)
      .leftJoin(schema.workflows, eq(schema.workflowRuns.workflowId, schema.workflows.id))
      .orderBy(desc(schema.workflowRuns.startedAt))
      .limit(limit);

    q = q.where(eq(schema.workflowRuns.userId, user.sub)) as typeof q;

    if (query.workflowId) {
      q = q.where(and(eq(schema.workflowRuns.workflowId, query.workflowId), eq(schema.workflowRuns.userId, user.sub))) as typeof q;
    }

    const rows = await q;

    return reply.send(
      rows.map(r => ({
        ...r.run,
        workflowName: r.workflowName,
      }))
    );
  });

  // Get run details with steps
  app.get('/api/runs/:id', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const [run] = await db
      .select({
        run: schema.workflowRuns,
        workflowName: schema.workflows.name,
      })
      .from(schema.workflowRuns)
      .leftJoin(schema.workflows, eq(schema.workflowRuns.workflowId, schema.workflows.id))
      .where(and(eq(schema.workflowRuns.id, id), eq(schema.workflowRuns.userId, user.sub)));

    if (!run) {
      return reply.status(404).send({ error: 'Run not found' });
    }

    const steps = await db
      .select()
      .from(schema.workflowSteps)
      .where(eq(schema.workflowSteps.runId, id))
      .orderBy(schema.workflowSteps.startedAt);

    return reply.send({
      ...run.run,
      workflowName: run.workflowName,
      steps,
    });
  });

  // Cancel a running workflow
  app.post('/api/runs/:id/cancel', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const [run] = await db
      .select()
      .from(schema.workflowRuns)
      .where(and(eq(schema.workflowRuns.id, id), eq(schema.workflowRuns.userId, user.sub)));

    if (!run) {
      return reply.status(404).send({ error: 'Run not found' });
    }

    if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
      return reply.status(400).send({ error: `Cannot cancel run in status: ${run.status}` });
    }

    await db
      .update(schema.workflowRuns)
      .set({
        status: 'cancelled',
      } as any)
      .where(and(eq(schema.workflowRuns.id, id), eq(schema.workflowRuns.userId, user.sub)));

    return reply.send({ success: true, status: 'cancelled' });
  });
}
