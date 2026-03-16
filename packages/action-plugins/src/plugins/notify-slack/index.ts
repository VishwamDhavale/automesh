import type { PluginContext, PluginResult } from '@automesh/shared-types';
import { postSlackMessage } from '@automesh/integrations';

export const manifest = {
  name: 'notify_slack',
  version: '1.0.0',
  description: 'Send a notification message to a Slack channel',
  inputs: ['channel', 'message'],
  outputs: ['message_ts'],
};

export async function run(
  context: PluginContext,
  params: Record<string, unknown>
): Promise<PluginResult> {
  const channel = (params.channel as string) ?? '#general';
  const message = params.message as string;

  if (!message) {
    return {
      success: false,
      data: {},
      error: 'Missing required param: message',
    };
  }

  // Fetch token from the dynamic integration context passed by the worker
  const token = context.integrations?.slack?.botToken;

  if (!token) {
    // Mock mode
    context.logger.info(`[MOCK] Slack message sent to ${channel}: "${message}"`);
    return {
      success: true,
      data: { message_ts: `mock_${Date.now()}`, channel },
    };
  }

  try {
    const result = await postSlackMessage(token, channel, message);

    if (!result.ok) {
      return { success: false, data: {}, error: result.error ?? 'Slack API error' };
    }

    return {
      success: true,
      data: { message_ts: result.ts, channel },
    };
  } catch (err) {
    return {
      success: false,
      data: {},
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
