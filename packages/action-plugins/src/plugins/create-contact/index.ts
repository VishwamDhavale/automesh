import type { PluginContext, PluginResult } from '@automesh/shared-types';

export const manifest = {
  name: 'create_contact',
  version: '1.0.0',
  description: 'Create a CRM contact record',
  inputs: ['email', 'name', 'phone', 'company'],
  outputs: ['contact_id'],
};

export async function run(
  context: PluginContext,
  params: Record<string, unknown>
): Promise<PluginResult> {
  const email = params.email as string;
  const name = params.name as string;

  if (!email) {
    return {
      success: false,
      data: {},
      error: 'Missing required param: email',
    };
  }

  // CRM integration stub — in production, connect to HubSpot, Salesforce, etc.
  const contactId = `contact_${Date.now()}`;

  context.logger.info(`Contact created: ${name ?? 'N/A'} (${email})`, { contactId });

  return {
    success: true,
    data: {
      contact_id: contactId,
      email,
      name: name ?? '',
      phone: (params.phone as string) ?? '',
      company: (params.company as string) ?? '',
    },
  };
}
