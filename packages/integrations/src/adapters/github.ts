import { createHmac, timingSafeEqual } from 'crypto';
import { nanoid } from 'nanoid';
import type { NormalizedEvent, IntegrationRegistryEntry } from '@automesh/shared-types';
import { BaseAdapter } from '../base-adapter.js';

export class GitHubAdapter extends BaseAdapter {
  readonly name = 'github';
  readonly displayName = 'GitHub';
  readonly category = 'dev-tools' as const;

  verifyWebhookSignature(payload: string | Buffer, signature: string, secret: string): boolean {
    try {
      const body = typeof payload === 'string' ? payload : payload.toString('utf-8');
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

  getRegistryEntry(): IntegrationRegistryEntry {
    return {
      name: 'github',
      displayName: 'GitHub',
      logo: '/integrations/github.svg',
      category: 'dev-tools',
      description: 'Listen to repository events from GitHub',
      actions: [],
      webhookEvents: ['github.push', 'github.pull_request', 'github.issues', 'github.release'],
      configFields: ['GITHUB_WEBHOOK_SECRET'],
    };
  }
}
