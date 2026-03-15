import type { WorkflowDefinition } from '@automesh/shared-types';

// ─── Scheduler Types ────────────────────────────────────────────

export interface ScheduledWorkflow {
  id: string;
  definition: WorkflowDefinition;
  cronExpression: string;
}

export type OnScheduleTrigger = (workflow: ScheduledWorkflow) => void | Promise<void>;

/**
 * Scheduler manages cron-based workflow triggers.
 * In production, this integrates with BullMQ repeatable jobs.
 * This module provides the scheduling logic and registration.
 */
export class Scheduler {
  private scheduled: Map<string, ScheduledWorkflow> = new Map();
  private onTrigger: OnScheduleTrigger;

  constructor(onTrigger: OnScheduleTrigger) {
    this.onTrigger = onTrigger;
  }

  /**
   * Register a workflow for scheduled execution.
   */
  register(id: string, definition: WorkflowDefinition): void {
    const cronExpression = definition.trigger.schedule;
    if (!cronExpression) return;

    const scheduled: ScheduledWorkflow = {
      id,
      definition,
      cronExpression,
    };

    this.scheduled.set(id, scheduled);
  }

  /**
   * Unregister a scheduled workflow.
   */
  unregister(id: string): void {
    this.scheduled.delete(id);
  }

  /**
   * Get all scheduled workflows.
   */
  getAll(): ScheduledWorkflow[] {
    return Array.from(this.scheduled.values());
  }

  /**
   * Get a scheduled workflow by ID.
   */
  get(id: string): ScheduledWorkflow | undefined {
    return this.scheduled.get(id);
  }

  /**
   * Manually trigger a scheduled workflow (for testing).
   */
  async trigger(id: string): Promise<void> {
    const workflow = this.scheduled.get(id);
    if (!workflow) {
      throw new Error(`Scheduled workflow "${id}" not found`);
    }
    await this.onTrigger(workflow);
  }

  /**
   * Get count of scheduled workflows.
   */
  get size(): number {
    return this.scheduled.size;
  }

  /**
   * Clear all scheduled workflows.
   */
  clear(): void {
    this.scheduled.clear();
  }
}

// ─── Cron Helpers ───────────────────────────────────────────────

/**
 * Validate a cron expression (basic validation).
 * Returns true if the expression has 5 or 6 fields.
 */
export function isValidCron(expression: string): boolean {
  const parts = expression.trim().split(/\s+/);
  return parts.length >= 5 && parts.length <= 6;
}
