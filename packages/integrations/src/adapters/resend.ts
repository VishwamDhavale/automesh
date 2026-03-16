import { nanoid } from 'nanoid';
import type { NormalizedEvent } from '@automesh/shared-types';
import { BaseAdapter } from '../base-adapter.js';

export class ResendAdapter extends BaseAdapter {
  readonly name = 'resend';
  readonly displayName = 'Resend';

  verifyWebhookSignature(_payload: string | unknown, _signature: string, _secret: string): boolean {
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
