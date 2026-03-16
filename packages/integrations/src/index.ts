export { BaseAdapter } from './base-adapter.js';
export { StripeAdapter } from './adapters/stripe.js';
export { SlackAdapter, postSlackMessage } from './adapters/slack.js';
export { ResendAdapter, sendResendEmail } from './adapters/resend.js';
export type { SendEmailParams } from './adapters/resend.js';
export { GitHubAdapter } from './adapters/github.js';

import { StripeAdapter } from './adapters/stripe.js';
import { SlackAdapter } from './adapters/slack.js';
import { ResendAdapter } from './adapters/resend.js';
import { GitHubAdapter } from './adapters/github.js';
import { BaseAdapter } from './base-adapter.js';

// ─── Adapter Registry ───────────────────────────────────────────

const adapters: Map<string, BaseAdapter> = new Map();

export function registerAdapter(adapter: BaseAdapter): void {
  adapters.set(adapter.name, adapter);
}

export function getAdapter(name: string): BaseAdapter | undefined {
  return adapters.get(name);
}

export function getAllAdapters(): BaseAdapter[] {
  return Array.from(adapters.values());
}

export function getIntegrationRegistry() {
  return Array.from(adapters.values()).map((a) => ({
    name: a.name,
    displayName: a.displayName,
  }));
}

// Auto-register built-in adapters
registerAdapter(new StripeAdapter());
registerAdapter(new SlackAdapter());
registerAdapter(new ResendAdapter());
registerAdapter(new GitHubAdapter());
