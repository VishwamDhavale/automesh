import { parse as parseYaml } from 'yaml';
import type { WorkflowDefinition, WorkflowStep, WorkflowTrigger, RetryPolicy } from '@automesh/shared-types';

// ─── Schema Validation Errors ────────────────────────────────────

export class WorkflowParseError extends Error {
  constructor(
    message: string,
    public readonly errors: string[]
  ) {
    super(message);
    this.name = 'WorkflowParseError';
  }
}

// ─── Parser ──────────────────────────────────────────────────────

export function parseWorkflow(yamlContent: string): WorkflowDefinition {
  let raw: unknown;

  try {
    raw = parseYaml(yamlContent);
  } catch {
    throw new WorkflowParseError('Invalid YAML syntax', ['Failed to parse YAML content']);
  }

  if (!raw || typeof raw !== 'object') {
    throw new WorkflowParseError('Invalid workflow', ['Workflow must be a YAML object']);
  }

  const doc = raw as Record<string, unknown>;
  const errors: string[] = [];

  // Validate required "workflow" name
  if (!doc.workflow || typeof doc.workflow !== 'string') {
    errors.push('Missing or invalid "workflow" name (must be a string)');
  }

  // Validate trigger
  const trigger = validateTrigger(doc.trigger, errors);

  // Validate conditions (optional)
  const conditions = validateConditions(doc.conditions, errors);

  // Validate steps
  const steps = validateSteps(doc.steps, errors);

  // Validate top-level retry (optional)
  const retry = validateRetryPolicy(doc.retry, errors);

  if (errors.length > 0) {
    throw new WorkflowParseError(
      `Workflow validation failed with ${errors.length} error(s)`,
      errors
    );
  }

  return {
    workflow: doc.workflow as string,
    version: typeof doc.version === 'number' ? doc.version : undefined,
    trigger,
    conditions,
    steps,
    retry,
  };
}

// ─── Trigger Validation ─────────────────────────────────────────

function validateTrigger(raw: unknown, errors: string[]): WorkflowTrigger {
  if (!raw || typeof raw !== 'object') {
    errors.push('Missing or invalid "trigger" (must be an object)');
    return {};
  }

  const trigger = raw as Record<string, unknown>;
  const result: WorkflowTrigger = {};

  if (trigger.event) {
    if (typeof trigger.event !== 'string') {
      errors.push('"trigger.event" must be a string (e.g. "stripe.payment_succeeded")');
    } else {
      result.event = trigger.event;
    }
  }

  if (trigger.schedule) {
    if (typeof trigger.schedule !== 'string') {
      errors.push('"trigger.schedule" must be a cron expression string');
    } else {
      result.schedule = trigger.schedule;
    }
  }

  if (trigger.manual !== undefined) {
    result.manual = Boolean(trigger.manual);
  }

  // Must have at least one trigger type
  if (!result.event && !result.schedule && !result.manual) {
    errors.push('Trigger must specify at least one of: event, schedule, or manual');
  }

  return result;
}

// ─── Conditions Validation ──────────────────────────────────────

function validateConditions(raw: unknown, errors: string[]): string[] | undefined {
  if (raw === undefined || raw === null) return undefined;

  if (!Array.isArray(raw)) {
    errors.push('"conditions" must be an array of strings');
    return undefined;
  }

  const conditions: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (typeof raw[i] !== 'string') {
      errors.push(`conditions[${i}] must be a string`);
    } else {
      conditions.push(raw[i]);
    }
  }

  return conditions.length > 0 ? conditions : undefined;
}

// ─── Steps Validation ───────────────────────────────────────────

function validateSteps(raw: unknown, errors: string[]): WorkflowStep[] {
  if (!raw || !Array.isArray(raw)) {
    errors.push('Missing or invalid "steps" (must be an array)');
    return [];
  }

  if (raw.length === 0) {
    errors.push('"steps" must contain at least one step');
    return [];
  }

  const steps: WorkflowStep[] = [];
  const stepIds = new Set<string>();

  for (let i = 0; i < raw.length; i++) {
    const step = raw[i];

    // Support shorthand: string step name → { action: name }
    if (typeof step === 'string') {
      steps.push({ action: step });
      continue;
    }

    if (!step || typeof step !== 'object') {
      errors.push(`steps[${i}] must be an object or string`);
      continue;
    }

    const s = step as Record<string, unknown>;

    if (!s.action || typeof s.action !== 'string') {
      errors.push(`steps[${i}].action is required and must be a string`);
      continue;
    }

    const workflowStep: WorkflowStep = {
      action: s.action,
    };

    if (s.id) {
      if (typeof s.id !== 'string') {
        errors.push(`steps[${i}].id must be a string`);
      } else if (stepIds.has(s.id)) {
        errors.push(`steps[${i}].id "${s.id}" is duplicate`);
      } else {
        workflowStep.id = s.id;
        stepIds.add(s.id);
      }
    }

    if (s.input && typeof s.input === 'object') {
      workflowStep.input = s.input as Record<string, unknown>;
    }

    if (s.retry) {
      workflowStep.retry = validateRetryPolicy(s.retry, errors);
    }

    if (s.fallback && typeof s.fallback === 'string') {
      workflowStep.fallback = s.fallback;
    }

    steps.push(workflowStep);
  }

  return steps;
}

// ─── Retry Policy Validation ────────────────────────────────────

function validateRetryPolicy(raw: unknown, errors: string[]): RetryPolicy | undefined {
  if (raw === undefined || raw === null) return undefined;

  if (typeof raw !== 'object') {
    errors.push('"retry" must be an object with { attempts, delay }');
    return undefined;
  }

  const r = raw as Record<string, unknown>;

  if (typeof r.attempts !== 'number' || r.attempts < 1) {
    errors.push('"retry.attempts" must be a positive number');
    return undefined;
  }

  if (typeof r.delay !== 'string') {
    errors.push('"retry.delay" must be a string (e.g. "10s", "1m")');
    return undefined;
  }

  return {
    attempts: r.attempts,
    delay: r.delay,
  };
}

// ─── Utilities ──────────────────────────────────────────────────

/** Parse delay string like "10s", "1m", "5m" to milliseconds */
export function parseDelay(delay: string): number {
  const match = delay.match(/^(\d+)(ms|s|m|h)$/);
  if (!match) return 10_000; // default 10s

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'ms': return value;
    case 's':  return value * 1_000;
    case 'm':  return value * 60_000;
    case 'h':  return value * 3_600_000;
    default:   return 10_000;
  }
}
