import { createHmac, timingSafeEqual } from 'crypto';
import { nanoid } from 'nanoid';
import type { NormalizedEvent } from '@automesh/shared-types';
import { BaseAdapter } from '../base-adapter.js';

export class GitHubAdapter extends BaseAdapter {
  readonly name = 'github';
  readonly displayName = 'GitHub';

  verifyWebhookSignature(payload: string | unknown, signature: string, secret: string): boolean {
    if (!signature || !secret || !payload) return false;
    try {
      const body = typeof payload === 'string' ? payload : (payload as Buffer).toString('utf-8');
      const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
      return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  normalizeEvent(rawPayload: Record<string, unknown>, headers: Record<string, string>): NormalizedEvent {
    const eventType = headers['x-github-event'] ?? 'unknown';

    return {
      id: `evt_${nanoid()}`,
      source: 'github',
      type: eventType,
      timestamp: new Date().toISOString(),
      data: rawPayload,
    };
  }
}
