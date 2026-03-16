import type { FastifyInstance } from 'fastify';
import { db, schema } from '../db/index.js';
import { desc, eq } from 'drizzle-orm';

export async function eventRoutes(app: FastifyInstance) {
  // List recent events
  app.get('/api/events', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const user = (request as any).user;
    const query = request.query as { limit?: string };
    const limit = Math.min(parseInt(query.limit ?? '50', 10), 100);

    const rows = await db
      .select()
      .from(schema.events)
      .where(eq(schema.events.userId, user.sub))
      .orderBy(desc(schema.events.createdAt))
      .limit(limit);

    return reply.send(rows);
  });
}
