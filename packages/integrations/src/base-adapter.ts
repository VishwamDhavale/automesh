import type { NormalizedEvent } from '@automesh/shared-types';

// ─── Base Adapter ───────────────────────────────────────────────

export abstract class BaseAdapter {
  abstract readonly name: string;
  abstract readonly displayName: string;

  /**
   * Verify the webhook signature from the provider.
   * Returns true if valid.
   */
  abstract verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): boolean;

  /**
   * Normalize a raw webhook payload into an internal NormalizedEvent.
   */
  abstract normalizeEvent(
    rawPayload: Record<string, unknown>,
    headers: Record<string, string>
  ): NormalizedEvent;
}
