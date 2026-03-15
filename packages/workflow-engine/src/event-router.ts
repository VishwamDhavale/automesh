import type { WorkflowDefinition, NormalizedEvent } from '@automesh/shared-types';

// ─── Event Router ───────────────────────────────────────────────

export interface RegisteredWorkflow {
  id: string;
  definition: WorkflowDefinition;
}

export class EventRouter {
  private workflows: Map<string, RegisteredWorkflow[]> = new Map();

  /**
   * Register a workflow to be matched against incoming events.
   */
  register(id: string, definition: WorkflowDefinition): void {
    const eventType = definition.trigger.event;
    if (!eventType) return; // Only event-triggered workflows

    const existing = this.workflows.get(eventType) ?? [];
    existing.push({ id, definition });
    this.workflows.set(eventType, existing);
  }

  /**
   * Unregister a workflow by ID from all event types.
   */
  unregister(workflowId: string): void {
    for (const [eventType, workflows] of this.workflows.entries()) {
      const filtered = workflows.filter(w => w.id !== workflowId);
      if (filtered.length === 0) {
        this.workflows.delete(eventType);
      } else {
        this.workflows.set(eventType, filtered);
      }
    }
  }

  /**
   * Match an incoming event to registered workflows.
   * Supports exact match ("stripe.payment_succeeded") and
   * wildcard match ("stripe.*" matches "stripe.payment_succeeded").
   */
  match(event: NormalizedEvent): RegisteredWorkflow[] {
    const fullType = `${event.source}.${event.type}`;
    const matched: RegisteredWorkflow[] = [];

    for (const [pattern, workflows] of this.workflows.entries()) {
      if (matchesPattern(pattern, fullType)) {
        matched.push(...workflows);
      }
    }

    return matched;
  }

  /**
   * Get all registered event types.
   */
  getRegisteredEvents(): string[] {
    return Array.from(this.workflows.keys());
  }

  /**
   * Get count of registered workflows.
   */
  get size(): number {
    let count = 0;
    for (const workflows of this.workflows.values()) {
      count += workflows.length;
    }
    return count;
  }

  /**
   * Clear all registered workflows.
   */
  clear(): void {
    this.workflows.clear();
  }
}

// ─── Pattern Matching ───────────────────────────────────────────

/**
 * Match event patterns:
 * - Exact: "stripe.payment_succeeded" matches "stripe.payment_succeeded"
 * - Wildcard suffix: "stripe.*" matches "stripe.payment_succeeded"
 * - Wildcard all: "*" matches everything
 */
function matchesPattern(pattern: string, eventType: string): boolean {
  if (pattern === '*') return true;
  if (pattern === eventType) return true;

  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2);
    return eventType.startsWith(prefix + '.');
  }

  return false;
}
