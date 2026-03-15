import type { PluginContext, PluginResult } from '@automesh/shared-types';
import { sendResendEmail } from '@automesh/integrations';

export const manifest = {
  name: 'send_email',
  version: '1.0.0',
  description: 'Send a transactional email using Resend',
  inputs: ['to', 'subject', 'body', 'from'],
  outputs: ['message_id'],
};

export async function run(
  context: PluginContext,
  params: Record<string, unknown>
): Promise<PluginResult> {
  const to = params.to as string;
  const subject = params.subject as string;
  const body = params.body as string;
  const from = (params.from as string) ?? 'noreply@automesh.dev';

  if (!to || !subject) {
    return {
      success: false,
      data: {},
      error: 'Missing required params: to, subject',
    };
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Mock mode when no API key
    context.logger.info(`[MOCK] Email sent to ${to}: "${subject}"`);
    return {
      success: true,
      data: { message_id: `mock_${Date.now()}`, to, subject },
    };
  }

  try {
    const result = await sendResendEmail(apiKey, {
      from,
      to,
      subject,
      html: body,
    });

    if (result.error) {
      return { success: false, data: {}, error: result.error };
    }

    return {
      success: true,
      data: { message_id: result.id, to, subject },
    };
  } catch (err) {
    return {
      success: false,
      data: {},
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
