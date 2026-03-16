import type {
  WorkflowDefinition,
  WorkflowStep,
  StepResult,
  WorkflowRunResult,
  WorkflowRunStatus,
  PluginResult,
  PluginContext,
  PluginLogger,
} from '@automesh/shared-types';
import { parseDelay } from './parser.js';

// ─── Types ───────────────────────────────────────────────────────

export type ActionRunner = (
  context: PluginContext,
  params: Record<string, unknown>
) => Promise<PluginResult>;

export interface ExecutionOptions {
  workflowId: string;
  runId: string;
  actionRunner: ActionRunner;
  logger?: PluginLogger;
  initialContext?: Record<string, unknown>;
  checkIfCancelled?: () => Promise<boolean>;
}

// ─── Template Interpolation ─────────────────────────────────────

/**
 * Resolve template expressions like {{ step1.data.email }}
 * Supports nested dot notation access into the state object.
 */
export function interpolate(
  value: unknown,
  state: Record<string, unknown>
): unknown {
  if (typeof value === 'string') {
    // Full replacement: if entire string is one template expression
    const fullMatch = value.match(/^\{\{\s*(.+?)\s*\}\}$/);
    if (fullMatch) {
      return resolveExpression(fullMatch[1], state);
    }

    // Partial replacement: replace all template expressions within string
    return value.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, expr) => {
      const resolved = resolveExpression(expr, state);
      return String(resolved ?? '');
    });
  }

  if (Array.isArray(value)) {
    return value.map(v => interpolate(v, state));
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = interpolate(v, state);
    }
    return result;
  }

  return value;
}

function resolveExpression(expr: string, state: Record<string, unknown>): unknown {
  const parts = expr.split('.');
  let current: unknown = state;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

// ─── Condition Evaluator ────────────────────────────────────────

/**
 * Evaluate simple boolean conditions like "order.total > 100"
 * Supports: >, <, >=, <=, ==, !=
 */
export function evaluateCondition(
  condition: string,
  context: Record<string, unknown>
): boolean {
  const match = condition.match(/^(.+?)\s*(>=|<=|!=|==|>|<)\s*(.+)$/);
  if (!match) return true; // If can't parse, pass through

  const [, leftExpr, operator, rightExpr] = match;
  const left = resolveExpression(leftExpr.trim(), context);
  const rightStr = rightExpr.trim();

  // Try to parse right side as number
  const rightNum = Number(rightStr);
  const right = isNaN(rightNum) ? rightStr.replace(/^["']|["']$/g, '') : rightNum;

  switch (operator) {
    case '>':  return Number(left) > Number(right);
    case '<':  return Number(left) < Number(right);
    case '>=': return Number(left) >= Number(right);
    case '<=': return Number(left) <= Number(right);
    case '==': return String(left) === String(right);
    case '!=': return String(left) !== String(right);
    default:   return true;
  }
}

// ─── Executor ───────────────────────────────────────────────────

const defaultLogger: PluginLogger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data ?? ''),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data ?? ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data ?? ''),
};

export async function executeWorkflow(
  definition: WorkflowDefinition,
  options: ExecutionOptions
): Promise<WorkflowRunResult> {
  const { workflowId, runId, actionRunner, initialContext } = options;
  const logger = options.logger ?? defaultLogger;
  const state: Record<string, unknown> = { ...initialContext };
  const stepResults: StepResult[] = [];
  let overallStatus: WorkflowRunStatus = 'running';
  const startedAt = new Date().toISOString();

  logger.info(`Workflow "${definition.workflow}" starting`, { runId });

  // Evaluate conditions
  if (definition.conditions && definition.conditions.length > 0) {
    const allPass = definition.conditions.every(cond =>
      evaluateCondition(cond, state)
    );

    if (!allPass) {
      logger.info('Conditions not met, skipping workflow');
      return {
        runId,
        workflowId,
        status: 'completed',
        steps: [],
        startedAt,
        completedAt: new Date().toISOString(),
        context: state,
      };
    }
  }

  // Execute steps sequentially
  for (let i = 0; i < definition.steps.length; i++) {
    const step = definition.steps[i];
    const stepId = step.id ?? `step_${i}`;

    if (options.checkIfCancelled) {
      const isCancelled = await options.checkIfCancelled();
      if (isCancelled) {
        logger.info(`Workflow "${definition.workflow}" cancelled before step "${stepId}"`);
        overallStatus = 'cancelled';
        break;
      }
    }
    const stepStartedAt = new Date().toISOString();

    logger.info(`Step "${stepId}" (${step.action}) starting`);

    const retryPolicy = step.retry ?? definition.retry;
    const maxAttempts = retryPolicy?.attempts ?? 1;
    const delay = retryPolicy?.delay ? parseDelay(retryPolicy.delay) : 1000;

    let lastError: string | undefined;
    let result: PluginResult | undefined;

    // Interpolate input params with current state
    const resolvedParams = step.input
      ? (interpolate(step.input, state) as Record<string, unknown>)
      : {};

    // Create plugin context
    const pluginContext: PluginContext = {
      workflowId,
      runId,
      stepId,
      state: { ...state },
      integrations: {},
      logger,
    };

    // Attempt execution with retries
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        result = await actionRunner(pluginContext, resolvedParams);

        if (result.success) {
          // Store step result in state for interpolation by subsequent steps
          state[stepId] = result.data;
          logger.info(`Step "${stepId}" succeeded on attempt ${attempt}`);
          break;
        } else {
          lastError = result.error ?? 'Action returned failure';
          logger.warn(`Step "${stepId}" failed (attempt ${attempt}/${maxAttempts}): ${lastError}`);
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        logger.warn(`Step "${stepId}" threw error (attempt ${attempt}/${maxAttempts}): ${lastError}`);
      }

      if (attempt < maxAttempts) {
        // Wait before retry with exponential backoff
        const backoffDelay = delay * Math.pow(2, attempt - 1);
        await sleep(backoffDelay);
      }
    }

    const stepCompleted = new Date().toISOString();

    if (result?.success) {
      stepResults.push({
        stepName: step.action,
        status: 'success',
        result: result.data,
        startedAt: stepStartedAt,
        completedAt: stepCompleted,
      });
    } else {
      // Try fallback if defined
      if (step.fallback) {
        logger.info(`Step "${stepId}" failed, trying fallback: ${step.fallback}`);

        try {
          const fallbackResult = await actionRunner(
            { ...pluginContext, stepId: `${stepId}_fallback` },
            resolvedParams
          );

          if (fallbackResult.success) {
            state[stepId] = fallbackResult.data;
            stepResults.push({
              stepName: `${step.action} (fallback: ${step.fallback})`,
              status: 'success',
              result: fallbackResult.data,
              startedAt: stepStartedAt,
              completedAt: new Date().toISOString(),
            });
            continue;
          }
        } catch (fallbackErr) {
          logger.error(`Fallback "${step.fallback}" also failed`, fallbackErr);
        }
      }

      // Step failed
      stepResults.push({
        stepName: step.action,
        status: 'failed',
        error: lastError,
        startedAt: stepStartedAt,
        completedAt: stepCompleted,
      });

      overallStatus = 'failed';
      logger.error(`Workflow failed at step "${stepId}"`);
      break;
    }
  }

  if (overallStatus === 'running') {
    overallStatus = 'completed';
  }

  const completedAt = new Date().toISOString();
  logger.info(`Workflow "${definition.workflow}" ${overallStatus}`, { runId });

  return {
    runId,
    workflowId,
    status: overallStatus,
    steps: stepResults,
    startedAt,
    completedAt,
    context: state,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
