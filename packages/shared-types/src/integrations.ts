export interface IntegrationField {
  key: string;
  label: string;
  type: 'text' | 'password';
  placeholder?: string;
  description?: string;
  required?: boolean;
}

export interface IntegrationGuide {
  stepByStep: string[];
  docsUrl?: string;
}

export interface IntegrationDefinition {
  id: string;
  name: string;
  description: string;
  icon?: string;
  fields: IntegrationField[];
  guide?: IntegrationGuide;
}

export const INTEGRATIONS_REGISTRY: Record<string, IntegrationDefinition> = {
  slack: {
    id: 'slack',
    name: 'Slack',
    description: 'Send messages to Slack channels from your workflows.',
    fields: [
      {
        key: 'botToken',
        label: 'Bot User OAuth Token',
        type: 'password',
        placeholder: 'xoxb-...',
        description: 'Found under Features > OAuth & Permissions',
        required: true,
      },
      {
        key: 'signingSecret',
        label: 'Signing Secret',
        type: 'password',
        description: 'Found under Settings > Basic Information',
        required: true,
      },
    ],
    guide: {
      stepByStep: [
        'Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new App.',
        'Under **Features > OAuth & Permissions**, add the `chat:write` scope under Bot Token Scopes.',
        'Install the app to your workspace and copy the **Bot User OAuth Token**.',
        'Under **Settings > Basic Information**, scroll down to App Credentials and copy the **Signing Secret**.',
        'If you want to use Slack events as triggers, go to **Event Subscriptions**, enable events, and paste your Automesh webhook URL.',
      ],
      docsUrl: 'https://api.slack.com/messaging/sending',
    },
  },
  resend: {
    id: 'resend',
    name: 'Resend',
    description: 'Send emails using the Resend API.',
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 're_...',
        required: true,
      },
    ],
    guide: {
      stepByStep: [
        'Log in to your Resend dashboard at [resend.com](https://resend.com).',
        'Navigate to the **API Keys** section.',
        'Click **Create API Key**.',
        'Give it a name (e.g., Automesh) and select "Full Access" or restrict it to sending emails.',
        'Copy the generated key (it starts with `re_`) and paste it here.',
      ],
      docsUrl: 'https://resend.com/docs/api-reference/api-keys/create-api-key',
    },
  },
  github: {
    id: 'github',
    name: 'GitHub Webhooks',
    description: 'Trigger workflows from GitHub repository events.',
    fields: [
      {
        key: 'webhookSecret',
        label: 'Webhook Secret',
        type: 'password',
        description: 'The secret string used when configuring the webhook in GitHub.',
        required: true,
      },
    ],
    guide: {
      stepByStep: [
        'Go to your GitHub repository or organization.',
        'Navigate to **Settings > Webhooks** and click **Add webhook**.',
        'In the **Payload URL** field, paste your Automesh webhook URL.',
        'Set Content type to `application/json`.',
        'In the **Secret** field, type a random secure password. *Paste that exact same password into the field below*.',
        'Select the events you want to trigger workflows (e.g., Pushes, Pull Requests, Issues).',
      ],
      docsUrl: 'https://docs.github.com/en/webhooks',
    },
  },
};
