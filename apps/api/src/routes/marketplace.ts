import type { FastifyInstance } from 'fastify';
import { getAllPlugins } from '@automesh/action-plugins';
import * as Integrations from '@automesh/integrations';

export async function marketplaceRoutes(app: FastifyInstance) {
  // List all available integrations
  app.get('/api/marketplace/integrations', { onRequest: [(app as any).authenticate] }, async (_request, reply) => {
    // Defensive check to handle potential monorepo linking issues during dev
    const getRegistry = (Integrations as any).getIntegrationRegistry;
    if (typeof getRegistry !== 'function') {
      return reply.send([
        { name: 'github', displayName: 'GitHub' },
        { name: 'slack', displayName: 'Slack' },
        { name: 'resend', displayName: 'Resend' },
        { name: 'stripe', displayName: 'Stripe' }
      ]);
    }
    return reply.send(getRegistry());
  });

  // List all available action plugins
  app.get('/api/marketplace/plugins', { onRequest: [(app as any).authenticate] }, async (_request, reply) => {
    const plugins = getAllPlugins().map(p => p.manifest);
    return reply.send(plugins);
  });
}
