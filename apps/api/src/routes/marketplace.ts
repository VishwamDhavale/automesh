import type { FastifyInstance } from 'fastify';
import { getIntegrationRegistry } from '@automesh/integrations';
import { getAllPlugins } from '@automesh/action-plugins';

export async function marketplaceRoutes(app: FastifyInstance) {
  // List all available integrations
  app.get('/api/marketplace/integrations', async (_request, reply) => {
    const registry = getIntegrationRegistry();
    return reply.send(registry);
  });

  // List all available action plugins
  app.get('/api/marketplace/plugins', async (_request, reply) => {
    const plugins = getAllPlugins().map(p => p.manifest);
    return reply.send(plugins);
  });
}
