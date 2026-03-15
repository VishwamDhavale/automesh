import type { FastifyInstance } from 'fastify';
import { db, schema } from '../db/index.js';
import { desc } from 'drizzle-orm';

export async function eventRoutes(app: FastifyInstance) {
  // List recent events
  app.get('/api/events', async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = Math.min(parseInt(query.limit ?? '50', 10), 100);

    const rows = await db
      .select()
      .from(schema.events)
      .orderBy(desc(schema.events.createdAt))
      .limit(limit);

    return reply.send(rows);
  });
}
