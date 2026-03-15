import { createHmac, timingSafeEqual } from 'crypto';
import { nanoid } from 'nanoid';
import type { NormalizedEvent, IntegrationRegistryEntry } from '@automesh/shared-types';
import { BaseAdapter } from '../base-adapter.js';

export class SlackAdapter extends BaseAdapter {
  readonly name = 'slack';
  readonly displayName = 'Slack';
  readonly category = 'messaging' as const;

  verifyWebhookSignature(payload: string | Buffer, signature: string, secret: string): boolean {
    try {
      // Slack uses v0:timestamp:body format
      const body = typeof payload === 'string' ? payload : payload.toString('utf-8');
      const expected = 'v0=' + createHmac('sha256', secret).update(`v0:${body}`).digest('hex');
      return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  normalizeEvent(rawPayload: Record<string, unknown>, _headers: Record<string, string>): NormalizedEvent {
    const eventType = (rawPayload.type as string) ?? 'message';

    return {
      id: `evt_${nanoid()}`,
      source: 'slack',
      type: eventType,
      timestamp: new Date().toISOString(),
      data: rawPayload,
    };
  }

  getRegistryEntry(): IntegrationRegistryEntry {
    return {
      name: 'slack',
      displayName: 'Slack',
      logo: '/integrations/slack.svg',
      category: 'messaging',
      description: 'Send messages and receive events from Slack',
      actions: ['postMessage', 'updateMessage'],
      webhookEvents: ['slack.message', 'slack.reaction_added'],
      configFields: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'],
    };
  }
}

// ─── Slack API Client ───────────────────────────────────────────

export async function postSlackMessage(
  token: string,
  channel: string,
  text: string,
  blocks?: unknown[]
): Promise<{ ok: boolean; ts?: string; error?: string }> {
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ channel, text, blocks }),
  });

  return response.json() as Promise<{ ok: boolean; ts?: string; error?: string }>;
}
