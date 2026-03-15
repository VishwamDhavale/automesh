import { describe, it, expect } from 'vitest';
import { executeWorkflow, interpolate, evaluateCondition } from '../executor.js';
import type { WorkflowDefinition, PluginResult, PluginContext } from '@automesh/shared-types';

describe('interpolate', () => {
  it('should resolve full template expressions', () => {
    const state = { step1: { email: 'test@test.com' } };
    expect(interpolate('{{ step1.email }}', state)).toBe('test@test.com');
  });

  it('should resolve partial template in strings', () => {
    const state = { step1: { name: 'John' } };
    expect(interpolate('Hello {{ step1.name }}!', state)).toBe('Hello John!');
  });

  it('should resolve nested objects', () => {
    const state = { step1: { email: 'test@test.com' } };
    const input = { to: '{{ step1.email }}', subject: 'Welcome' };
    expect(interpolate(input, state)).toEqual({ to: 'test@test.com', subject: 'Welcome' });
  });

  it('should return undefined for missing paths', () => {
    // Full template expression returns raw resolved value (undefined)
    expect(interpolate('{{ missing.path }}', {})).toBeUndefined();
    // Partial template in string replaces with empty string
    expect(interpolate('Hello {{ missing.path }}!', {})).toBe('Hello !');
  });

  it('should pass through non-template values', () => {
    expect(interpolate(42, {})).toBe(42);
    expect(interpolate(true, {})).toBe(true);
  });
});

describe('evaluateCondition', () => {
  it('should evaluate greater than', () => {
    expect(evaluateCondition('order.total > 100', { order: { total: 150 } })).toBe(true);
    expect(evaluateCondition('order.total > 100', { order: { total: 50 } })).toBe(false);
  });

  it('should evaluate equality', () => {
    expect(evaluateCondition('status == active', { status: 'active' })).toBe(true);
    expect(evaluateCondition('status == inactive', { status: 'active' })).toBe(false);
  });

  it('should evaluate inequality', () => {
    expect(evaluateCondition('type != free', { type: 'paid' })).toBe(true);
  });

  it('should return true for unparseable conditions', () => {
    expect(evaluateCondition('some random text', {})).toBe(true);
  });
});

describe('executeWorkflow', () => {
  function createMockRunner(results: PluginResult[] = []) {
    let callIndex = 0;
    return async (_ctx: PluginContext, _params: Record<string, unknown>): Promise<PluginResult> => {
      const result = results[callIndex] ?? { success: true, data: { mock: true } };
      callIndex++;
      return result;
    };
  }

  it('should execute all steps sequentially', async () => {
    const definition: WorkflowDefinition = {
      workflow: 'test',
      trigger: { manual: true },
      steps: [
        { action: 'step_a', id: 'a' },
        { action: 'step_b', id: 'b' },
      ],
    };

    const result = await executeWorkflow(definition, {
      workflowId: 'wf1',
      runId: 'run1',
      actionRunner: createMockRunner(),
    });

    expect(result.status).toBe('completed');
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].status).toBe('success');
    expect(result.steps[1].status).toBe('success');
  });

  it('should stop on failure', async () => {
    const definition: WorkflowDefinition = {
      workflow: 'test',
      trigger: { manual: true },
      steps: [
        { action: 'step_a' },
        { action: 'step_b' },
      ],
    };

    const result = await executeWorkflow(definition, {
      workflowId: 'wf1',
      runId: 'run1',
      actionRunner: createMockRunner([
        { success: true, data: {} },
        { success: false, data: {}, error: 'Step B failed' },
      ]),
    });

    expect(result.status).toBe('failed');
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].status).toBe('success');
    expect(result.steps[1].status).toBe('failed');
    expect(result.steps[1].error).toBe('Step B failed');
  });

  it('should skip workflow when conditions not met', async () => {
    const definition: WorkflowDefinition = {
      workflow: 'test',
      trigger: { manual: true },
      conditions: ['order.total > 100'],
      steps: [{ action: 'step_a' }],
    };

    const result = await executeWorkflow(definition, {
      workflowId: 'wf1',
      runId: 'run1',
      actionRunner: createMockRunner(),
      initialContext: { order: { total: 50 } },
    });

    expect(result.status).toBe('completed');
    expect(result.steps).toHaveLength(0);
  });

  it('should pass state between steps via interpolation', async () => {
    const definition: WorkflowDefinition = {
      workflow: 'test',
      trigger: { manual: true },
      steps: [
        { action: 'step_a', id: 'step1' },
        { action: 'step_b', id: 'step2', input: { email: '{{ step1.email }}' } },
      ],
    };

    let capturedParams: Record<string, unknown>[] = [];

    const runner = async (_ctx: PluginContext, params: Record<string, unknown>): Promise<PluginResult> => {
      capturedParams.push(params);
      return { success: true, data: { email: 'test@test.com' } };
    };

    await executeWorkflow(definition, {
      workflowId: 'wf1',
      runId: 'run1',
      actionRunner: runner,
    });

    // Step 2 should have received the interpolated email
    expect(capturedParams[1]).toEqual({ email: 'test@test.com' });
  });
});
