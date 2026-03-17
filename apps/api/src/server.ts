import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { workflowRoutes } from './routes/workflows.js';
import { runRoutes } from './routes/runs.js';
import { eventRoutes } from './routes/events.js';
import { webhookRoutes } from './routes/webhooks.js';
import { aiRoutes } from './routes/ai.js';
import { marketplaceRoutes } from './routes/marketplace.js';
import { integrationsRoutes } from './routes/integrations.js';
import { authMiddleware } from './middleware/auth.js';
import { authRoutes } from './routes/auth.js';
import { startWorker } from './queue/worker.js';
import { EventRouter } from '@automesh/workflow-engine';
import { db, schema } from './db/index.js';
import { desc, eq } from 'drizzle-orm';
import type { WorkflowDefinition } from '@automesh/shared-types';

const app = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  },
});

async function start() {
  // Register plugins
  await app.register(cors, {
    origin: process.env.DASHBOARD_URL ?? 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Health check
  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  }));

  // ─── Load EventRouter ───────────────────────────────────────────
  const eventRouter = new EventRouter();

  // Load all workflows with event triggers into the router
  const allWorkflows = await db.select().from(schema.workflows);
  for (const wf of allWorkflows) {
    const [latestVersion] = await db
      .select()
      .from(schema.workflowVersions)
      .where(eq(schema.workflowVersions.workflowId, wf.id))
      .orderBy(desc(schema.workflowVersions.version))
      .limit(1);

    if (latestVersion?.definition) {
      const def = latestVersion.definition as unknown as WorkflowDefinition;
      if (def.trigger?.event) {
        eventRouter.register(wf.id, def);
      }
    }
  }

  app.log.info(`📡 EventRouter loaded ${eventRouter.size} event-triggered workflow(s)`);

  // Register routes
  await app.register(authMiddleware);
  await app.register(authRoutes);
  await app.register(async (instance) => workflowRoutes(instance, eventRouter));
  await app.register(runRoutes);
  await app.register(eventRoutes);
  await app.register(async (instance) => webhookRoutes(instance, eventRouter));
  await app.register(aiRoutes);
  await app.register(marketplaceRoutes);
  await app.register(integrationsRoutes);

  // ─── Start BullMQ Worker ──────────────────────────────────────
  startWorker();

  // Start server
  const port = parseInt(process.env.API_PORT ?? '4000', 10);
  const host = process.env.API_HOST ?? '0.0.0.0';

  try {
    await app.listen({ port, host });
    app.log.info(`🚀 Automesh API running at http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

