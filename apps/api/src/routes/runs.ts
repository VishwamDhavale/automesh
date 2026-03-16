import type { FastifyInstance } from 'fastify';
import { db, schema } from '../db/index.js';
import { eq, desc } from 'drizzle-orm';

export async function runRoutes(app: FastifyInstance) {
  // List all runs
  app.get('/api/runs', async (request, reply) => {
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

    if (query.workflowId) {
      q = q.where(eq(schema.workflowRuns.workflowId, query.workflowId)) as typeof q;
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
  app.get('/api/runs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const [run] = await db
      .select({
        run: schema.workflowRuns,
        workflowName: schema.workflows.name,
      })
      .from(schema.workflowRuns)
      .leftJoin(schema.workflows, eq(schema.workflowRuns.workflowId, schema.workflows.id))
      .where(eq(schema.workflowRuns.id, id));

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
  app.post('/api/runs/:id/cancel', async (request, reply) => {
    const { id } = request.params as { id: string };

    const [run] = await db
      .select()
      .from(schema.workflowRuns)
      .where(eq(schema.workflowRuns.id, id));

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
      })
      .where(eq(schema.workflowRuns.id, id));

    return reply.send({ success: true, status: 'cancelled' });
  });
}
