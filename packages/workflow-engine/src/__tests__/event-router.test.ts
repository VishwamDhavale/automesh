import { describe, it, expect, beforeEach } from 'vitest';
import { EventRouter } from '../event-router.js';
import type { NormalizedEvent } from '@automesh/shared-types';

function makeEvent(source: string, type: string): NormalizedEvent {
  return {
    id: `evt_test`,
    source,
    type,
    timestamp: new Date().toISOString(),
    data: {},
  };
}

describe('EventRouter', () => {
  let router: EventRouter;

  beforeEach(() => {
    router = new EventRouter();
  });

  it('should match exact event types', () => {
    router.register('wf1', {
      workflow: 'test',
      trigger: { event: 'stripe.payment_succeeded' },
      steps: [{ action: 'a' }],
    });

    const matches = router.match(makeEvent('stripe', 'payment_succeeded'));
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe('wf1');
  });

  it('should match wildcard patterns', () => {
    router.register('wf1', {
      workflow: 'test',
      trigger: { event: 'stripe.*' },
      steps: [{ action: 'a' }],
    });

    const matches = router.match(makeEvent('stripe', 'payment_succeeded'));
    expect(matches).toHaveLength(1);
  });

  it('should not match different sources', () => {
    router.register('wf1', {
      workflow: 'test',
      trigger: { event: 'stripe.payment_succeeded' },
      steps: [{ action: 'a' }],
    });

    const matches = router.match(makeEvent('github', 'push'));
    expect(matches).toHaveLength(0);
  });

  it('should match multiple workflows', () => {
    router.register('wf1', {
      workflow: 'test1',
      trigger: { event: 'stripe.payment_succeeded' },
      steps: [{ action: 'a' }],
    });
    router.register('wf2', {
      workflow: 'test2',
      trigger: { event: 'stripe.payment_succeeded' },
      steps: [{ action: 'b' }],
    });

    const matches = router.match(makeEvent('stripe', 'payment_succeeded'));
    expect(matches).toHaveLength(2);
  });

  it('should unregister workflows', () => {
    router.register('wf1', {
      workflow: 'test',
      trigger: { event: 'stripe.payment_succeeded' },
      steps: [{ action: 'a' }],
    });

    router.unregister('wf1');

    const matches = router.match(makeEvent('stripe', 'payment_succeeded'));
    expect(matches).toHaveLength(0);
  });

  it('should skip non-event triggers', () => {
    router.register('wf1', {
      workflow: 'test',
      trigger: { manual: true },
      steps: [{ action: 'a' }],
    });

    expect(router.size).toBe(0);
  });

  it('should return registered events', () => {
    router.register('wf1', {
      workflow: 'test',
      trigger: { event: 'stripe.payment_succeeded' },
      steps: [{ action: 'a' }],
    });

    expect(router.getRegisteredEvents()).toEqual(['stripe.payment_succeeded']);
  });
});
