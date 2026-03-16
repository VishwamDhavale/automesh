import type { FastifyInstance } from 'fastify';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { INTEGRATIONS_REGISTRY } from '@automesh/shared-types';

export async function integrationsRoutes(app: FastifyInstance) {
  // Get all configured integrations
  app.get('/api/integrations', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const user = (request as any).user;
    const configured = await db
      .select()
      .from(schema.integrations)
      .where(eq(schema.integrations.userId, user.sub));

    // Mask sensitive config values before sending to the client
    const masked = configured.map((d) => {
      const maskedConfig: Record<string, string> = {};
      
      if (d.config && typeof d.config === 'object') {
        const configObj = d.config as Record<string, string>;
        
        // Find the definition to know which fields are passwords
        const def = INTEGRATIONS_REGISTRY[d.provider];
        if (def) {
          for (const field of def.fields) {
            if (configObj[field.key]) {
              // Mask password type fields, but indicate they are set
              maskedConfig[field.key] = field.type === 'password' ? '********' : configObj[field.key];
            }
          }
        }
      }
      
      return {
        ...d,
        config: maskedConfig,
      };
    });

    return reply.send(masked);
  });

  // Get the registry of available integrations
  app.get('/api/integrations/available', async (_request, reply) => {
    return reply.send(Object.values(INTEGRATIONS_REGISTRY));
  });

  // Create or Update an integration config
  app.post('/api/integrations', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const user = (request as any).user;
    const body = request.body as { provider: string; config: Record<string, string> };

    if (!body.provider || !body.config) {
      return reply.status(400).send({ error: 'Missing provider or config' });
    }

    if (!INTEGRATIONS_REGISTRY[body.provider]) {
      return reply.status(400).send({ error: `Unknown provider: ${body.provider}` });
    }

    // Check if it already exists
    const [existing] = await db
      .select()
      .from(schema.integrations)
      .where(and(eq(schema.integrations.provider, body.provider), eq(schema.integrations.userId, user.sub)));

    if (existing) {
      // Merge new config. If a field comes in as '********', keep the old value.
      const currentConfig = (existing.config as Record<string, string>) || {};
      const newConfig = { ...currentConfig };

      for (const [k, v] of Object.entries(body.config)) {
        if (v && v !== '********') {
          newConfig[k] = v;
        }
      }

      await db
        .update(schema.integrations)
        .set({
          config: newConfig,
          updatedAt: new Date(),
        } as any)
        .where(and(eq(schema.integrations.provider, body.provider), eq(schema.integrations.userId, user.sub)));

      return reply.send({ success: true, id: existing.id });
    } else {
      // Create new
      const id = `int_${nanoid()}`;
      await (db.insert(schema.integrations) as any).values({
        id,
        userId: user.sub,
        provider: body.provider,
        config: body.config,
      });

      return reply.status(201).send({ success: true, id });
    }
  });

  // Delete an integration config
  app.delete('/api/integrations/:provider', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const { provider } = request.params as { provider: string };
    const user = (request as any).user;

    await db
      .delete(schema.integrations)
      .where(and(eq(schema.integrations.provider, provider), eq(schema.integrations.userId, user.sub)));

    return reply.send({ deleted: true });
  });
}
