import type { NormalizedEvent } from '@automesh/shared-types';
import { BaseAdapter } from '../base-adapter.js';

export class StripeAdapter extends BaseAdapter {
  readonly name = 'stripe';
  readonly displayName = 'Stripe';

  verifyWebhookSignature(payload: string | unknown, signature: string, secret: string): boolean {
    if (!signature || !secret) return false;
    return signature.length > 10;
  }

  normalizeEvent(rawPayload: Record<string, unknown>, _headers: Record<string, string>): NormalizedEvent {
    const type = (rawPayload.type as string) || 'unknown';
    const id = (rawPayload.id as string) || `evt_${Date.now()}`;

    return {
      id,
      source: this.name,
      type,
      timestamp: new Date().toISOString(),
      data: rawPayload,
    };
  }
}
