import { describe, it, expect } from 'vitest';
import { parseWorkflow, WorkflowParseError, parseDelay } from '../parser.js';

describe('WorkflowParser', () => {
  it('should parse a valid workflow', () => {
    const yaml = `
workflow: test_workflow

trigger:
  event: stripe.payment_succeeded

steps:
  - action: send_email
    id: step1
    input:
      to: user@test.com
      subject: Welcome
`;

    const result = parseWorkflow(yaml);
    expect(result.workflow).toBe('test_workflow');
    expect(result.trigger.event).toBe('stripe.payment_succeeded');
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].action).toBe('send_email');
    expect(result.steps[0].id).toBe('step1');
    expect(result.steps[0].input).toEqual({ to: 'user@test.com', subject: 'Welcome' });
  });

  it('should parse shorthand step strings', () => {
    const yaml = `
workflow: simple
trigger:
  manual: true
steps:
  - send_email
  - notify_slack
`;

    const result = parseWorkflow(yaml);
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].action).toBe('send_email');
    expect(result.steps[1].action).toBe('notify_slack');
  });

  it('should parse conditions', () => {
    const yaml = `
workflow: conditional
trigger:
  event: stripe.payment_succeeded
conditions:
  - order.total > 100
steps:
  - action: send_email
`;

    const result = parseWorkflow(yaml);
    expect(result.conditions).toEqual(['order.total > 100']);
  });

  it('should parse retry policy', () => {
    const yaml = `
workflow: retry_test
trigger:
  manual: true
steps:
  - action: send_email
    retry:
      attempts: 3
      delay: "10s"
`;

    const result = parseWorkflow(yaml);
    expect(result.steps[0].retry).toEqual({ attempts: 3, delay: '10s' });
  });

  it('should parse scheduled trigger', () => {
    const yaml = `
workflow: scheduled
trigger:
  schedule: "0 9 * * 1"
steps:
  - action: send_email
`;

    const result = parseWorkflow(yaml);
    expect(result.trigger.schedule).toBe('0 9 * * 1');
  });

  it('should throw on missing workflow name', () => {
    const yaml = `
trigger:
  event: test
steps:
  - action: send_email
`;

    expect(() => parseWorkflow(yaml)).toThrow(WorkflowParseError);
  });

  it('should throw on missing trigger', () => {
    const yaml = `
workflow: no_trigger
steps:
  - action: send_email
`;

    expect(() => parseWorkflow(yaml)).toThrow(WorkflowParseError);
  });

  it('should throw on empty steps', () => {
    const yaml = `
workflow: no_steps
trigger:
  manual: true
steps: []
`;

    expect(() => parseWorkflow(yaml)).toThrow(WorkflowParseError);
  });

  it('should throw on duplicate step IDs', () => {
    const yaml = `
workflow: dup_ids
trigger:
  manual: true
steps:
  - action: a
    id: same
  - action: b
    id: same
`;

    expect(() => parseWorkflow(yaml)).toThrow(WorkflowParseError);
  });

  it('should throw on invalid YAML', () => {
    expect(() => parseWorkflow('not: valid: yaml: here: : :')).toThrow();
  });
});

describe('parseDelay', () => {
  it('should parse seconds', () => {
    expect(parseDelay('10s')).toBe(10_000);
  });

  it('should parse minutes', () => {
    expect(parseDelay('5m')).toBe(300_000);
  });

  it('should parse milliseconds', () => {
    expect(parseDelay('500ms')).toBe(500);
  });

  it('should parse hours', () => {
    expect(parseDelay('1h')).toBe(3_600_000);
  });

  it('should return default for invalid', () => {
    expect(parseDelay('invalid')).toBe(10_000);
  });
});
