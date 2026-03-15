import { createHmac, timingSafeEqual } from 'crypto';
import { nanoid } from 'nanoid';
import type { NormalizedEvent, IntegrationRegistryEntry } from '@automesh/shared-types';
import { BaseAdapter } from '../base-adapter.js';

export class StripeAdapter extends BaseAdapter {
  readonly name = 'stripe';
  readonly displayName = 'Stripe';
  readonly category = 'payments' as const;

  verifyWebhookSignature(payload: string | Buffer, signature: string, secret: string): boolean {
    try {
      const parts = signature.split(',');
      const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
      const sig = parts.find(p => p.startsWith('v1='))?.slice(3);

      if (!timestamp || !sig) return false;

      const signedPayload = `${timestamp}.${typeof payload === 'string' ? payload : payload.toString('utf-8')}`;
      const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');

      return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
    } catch {
      return false;
    }
  }

  normalizeEvent(rawPayload: Record<string, unknown>, _headers: Record<string, string>): NormalizedEvent {
    const type = (rawPayload.type as string) ?? 'unknown';
    // Convert Stripe event type: "payment_intent.succeeded" → "payment_succeeded"
    const normalizedType = type.replace(/\./g, '_');

    return {
      id: `evt_${nanoid()}`,
      source: 'stripe',
      type: normalizedType,
      timestamp: new Date().toISOString(),
      data: (rawPayload.data as Record<string, unknown>) ?? rawPayload,
    };
  }

  getRegistryEntry(): IntegrationRegistryEntry {
    return {
      name: 'stripe',
      displayName: 'Stripe',
      logo: '/integrations/stripe.svg',
      category: 'payments',
      description: 'Accept payments and manage subscriptions with Stripe',
      actions: [],
      webhookEvents: [
        'stripe.payment_intent_succeeded',
        'stripe.checkout_session_completed',
        'stripe.customer_created',
        'stripe.invoice_paid',
      ],
      configFields: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    };
  }
}
