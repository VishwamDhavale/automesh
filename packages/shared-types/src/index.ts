// ─── Workflow DSL Types ─────────────────────────────────────────

export interface WorkflowDefinition {
  workflow: string;
  version?: number;
  trigger: WorkflowTrigger;
  conditions?: string[];
  steps: WorkflowStep[];
  retry?: RetryPolicy;
}

export interface WorkflowTrigger {
  event?: string;       // e.g. "stripe.payment_succeeded"
  schedule?: string;    // cron expression e.g. "0 9 * * 1"
  manual?: boolean;     // manual trigger
}

export interface WorkflowStep {
  action: string;
  id?: string;
  input?: Record<string, unknown>;
  retry?: RetryPolicy;
  fallback?: string;    // fallback action on failure
}

export interface RetryPolicy {
  attempts: number;
  delay: string;        // e.g. "10s", "1m", "5m"
}

// ─── Event Types ────────────────────────────────────────────────

export interface NormalizedEvent {
  id: string;
  source: string;       // "stripe", "github", "slack", "manual"
  type: string;         // "payment_succeeded", "push"
  timestamp: string;    // ISO 8601
  data: Record<string, unknown>;
}

// ─── Execution Types ────────────────────────────────────────────

export type WorkflowRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

export interface WorkflowRunResult {
  runId: string;
  workflowId: string;
  status: WorkflowRunStatus;
  steps: StepResult[];
  startedAt: string;
  completedAt?: string;
  context: Record<string, unknown>;
}

export interface StepResult {
  stepName: string;
  status: StepStatus;
  result?: Record<string, unknown>;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

// ─── Plugin Types ───────────────────────────────────────────────

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  inputs: string[];
  outputs: string[];
}

export interface PluginContext {
  workflowId: string;
  runId: string;
  stepId: string;
  state: Record<string, unknown>;      // accumulated state from previous steps
  integrations: Record<string, Record<string, string>>; // Credentials from DB
  logger: PluginLogger;
}

export interface PluginLogger {
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

export interface PluginResult {
  success: boolean;
  data: Record<string, unknown>;
  error?: string;
}

export type PluginRunFn = (
  context: PluginContext,
  params: Record<string, unknown>
) => Promise<PluginResult>;

export * from './integrations.js';

// ─── API Types ──────────────────────────────────────────────────

export interface ApiWorkflow {
  id: string;
  name: string;
  currentVersion: number;
  definition: WorkflowDefinition;
  createdAt: string;
  updatedAt: string;
}

export interface ApiWorkflowRun {
  id: string;
  workflowId: string;
  workflowName: string;
  versionId: string;
  status: WorkflowRunStatus;
  steps: ApiStepRun[];
  startedAt: string;
  completedAt?: string;
}

export interface ApiStepRun {
  id: string;
  stepName: string;
  status: StepStatus;
  result?: Record<string, unknown>;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export interface ApiEvent {
  id: string;
  source: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}
