import { Worker, type Job } from 'bullmq';
import { redisConnectionOptions, type WorkflowJobData } from './queue.js';
import { executeWorkflow } from '@automesh/workflow-engine';
import { runAction } from '@automesh/action-plugins';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { WorkflowDefinition, PluginContext, PluginResult } from '@automesh/shared-types';

// ─── Logger for plugins ─────────────────────────────────────────

const pluginLogger = {
  info: (msg: string, data?: unknown) => console.log(`[WORKER:INFO] ${msg}`, data ?? ''),
  warn: (msg: string, data?: unknown) => console.warn(`[WORKER:WARN] ${msg}`, data ?? ''),
  error: (msg: string, data?: unknown) => console.error(`[WORKER:ERROR] ${msg}`, data ?? ''),
};

// ─── Job Processor ──────────────────────────────────────────────

async function processWorkflowJob(job: Job<WorkflowJobData>) {
  const { workflowId, runId, definition, context } = job.data;

  pluginLogger.info(`Processing workflow "${workflowId}" run "${runId}"`);

  // Mark run as "running"
  await db
    .update(schema.workflowRuns)
    .set({ status: 'running' })
    .where(eq(schema.workflowRuns.id, runId));

  try {
    // Build a mapping from stepId → action name for the actionRunner
    const steps = (definition.steps ?? []) as Array<{ action: string; id?: string }>;
    const stepActionMap = new Map<string, string>();
    steps.forEach((s, i) => {
      const stepId = s.id ?? `step_${i}`;
      stepActionMap.set(stepId, s.action);
    });

    // Execute the workflow using the engine
    const result = await executeWorkflow(
      definition as unknown as WorkflowDefinition,
      {
        workflowId,
        runId,
        logger: pluginLogger,
        initialContext: context,
        actionRunner: async (
          pluginContext: PluginContext,
          params: Record<string, unknown>
        ): Promise<PluginResult> => {
          const actionName = stepActionMap.get(pluginContext.stepId) ?? pluginContext.stepId;
          return runAction(actionName, pluginContext, params);
        },
      }
    );

    // Save each step result to the DB
    for (const stepResult of result.steps) {
      await db.insert(schema.workflowSteps).values({
        id: `ws_${nanoid()}`,
        runId,
        stepName: stepResult.stepName,
        status: stepResult.status,
        result: stepResult.result ? (stepResult.result as Record<string, unknown>) : null,
        error: stepResult.error ?? null,
        startedAt: new Date(stepResult.startedAt),
        completedAt: stepResult.completedAt ? new Date(stepResult.completedAt) : null,
      });
    }

    // Update run with final status
    await db
      .update(schema.workflowRuns)
      .set({
        status: result.status,
        context: result.context as Record<string, unknown>,
        completedAt: result.completedAt ? new Date(result.completedAt) : new Date(),
      })
      .where(eq(schema.workflowRuns.id, runId));

    pluginLogger.info(`Workflow "${workflowId}" run "${runId}" finished: ${result.status}`);

    return result;
  } catch (err) {
    // Mark run as failed on unexpected errors
    const errorMsg = err instanceof Error ? err.message : String(err);
    pluginLogger.error(`Workflow "${workflowId}" run "${runId}" crashed: ${errorMsg}`);

    await db
      .update(schema.workflowRuns)
      .set({
        status: 'failed',
        completedAt: new Date(),
      })
      .where(eq(schema.workflowRuns.id, runId));

    throw err;
  }
}

// ─── Worker Instance ────────────────────────────────────────────

export function startWorker() {
  const worker = new Worker<WorkflowJobData>(
    'workflow-execution',
    processWorkflowJob,
    {
      connection: redisConnectionOptions,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    pluginLogger.info(`Job ${job.id} completed for run ${job.data.runId}`);
  });

  worker.on('failed', (job, err) => {
    pluginLogger.error(`Job ${job?.id} failed: ${err.message}`);
  });

  pluginLogger.info('🔧 Workflow worker started, listening for jobs...');

  return worker;
}
