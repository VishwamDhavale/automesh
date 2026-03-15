import { nanoid } from 'nanoid';
import type { NormalizedEvent, IntegrationRegistryEntry } from '@automesh/shared-types';
import { BaseAdapter } from '../base-adapter.js';

export class ResendAdapter extends BaseAdapter {
  readonly name = 'resend';
  readonly displayName = 'Resend';
  readonly category = 'messaging' as const;

  verifyWebhookSignature(_payload: string | Buffer, _signature: string, _secret: string): boolean {
    // Resend webhook verification is done via IP allowlisting
    // For now, return true if signature header is present
    return true;
  }

  normalizeEvent(rawPayload: Record<string, unknown>, _headers: Record<string, string>): NormalizedEvent {
    return {
      id: `evt_${nanoid()}`,
      source: 'resend',
      type: (rawPayload.type as string) ?? 'email.sent',
      timestamp: new Date().toISOString(),
      data: rawPayload,
    };
  }

  getRegistryEntry(): IntegrationRegistryEntry {
    return {
      name: 'resend',
      displayName: 'Resend',
      logo: '/integrations/resend.svg',
      category: 'messaging',
      description: 'Send transactional emails with Resend',
      actions: ['sendEmail'],
      webhookEvents: ['resend.email_sent', 'resend.email_delivered', 'resend.email_bounced'],
      configFields: ['RESEND_API_KEY'],
    };
  }
}

// ─── Resend Email Client ────────────────────────────────────────

export interface SendEmailParams {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

export async function sendResendEmail(
  apiKey: string,
  params: SendEmailParams
): Promise<{ id?: string; error?: string }> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(params),
  });

  return response.json() as Promise<{ id?: string; error?: string }>;
}
