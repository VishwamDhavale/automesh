import { Queue } from 'bullmq';

// ─── Redis Connection Config ────────────────────────────────────

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6380';
const url = new URL(redisUrl);

export const redisConnectionOptions = {
  host: url.hostname,
  port: parseInt(url.port || '6379', 10),
  maxRetriesPerRequest: null,
};

// ─── Workflow Execution Queue ───────────────────────────────────

export interface WorkflowJobData {
  workflowId: string;
  runId: string;
  definition: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export const workflowQueue = new Queue<WorkflowJobData>('workflow-execution', {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  },
});
