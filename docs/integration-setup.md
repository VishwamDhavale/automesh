# Integration Setup Guide

## Overview

Automesh supports integrating with external SaaS services. Each integration adapter normalizes incoming webhooks into Automesh events and provides action capabilities.

## Available Integrations

### Stripe

**Environment Variables:**
```env
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**Webhook URL:** `POST /api/webhooks/stripe`

**Events:**
- `stripe.payment_intent_succeeded`
- `stripe.checkout_session_completed`
- `stripe.customer_created`
- `stripe.invoice_paid`

**Setup:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events to listen to
4. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

---

### GitHub

**Environment Variables:**
```env
GITHUB_WEBHOOK_SECRET=your_secret
```

**Webhook URL:** `POST /api/webhooks/github`

**Events:**
- `github.push`
- `github.pull_request`
- `github.issues`
- `github.release`

**Setup:**
1. Go to repo Settings → Webhooks → Add webhook
2. Payload URL: `https://your-domain.com/api/webhooks/github`
3. Content type: `application/json`
4. Set secret and add to `.env`

---

### Slack

**Environment Variables:**
```env
SLACK_BOT_TOKEN=xoxb-xxx
SLACK_SIGNING_SECRET=xxx
```

**Actions:** `postMessage`

**Setup:**
1. Create a Slack app at api.slack.com/apps
2. Add Bot Token Scopes: `chat:write`, `channels:read`
3. Install to workspace
4. Copy Bot Token and Signing Secret

---

### Resend

**Environment Variables:**
```env
RESEND_API_KEY=re_xxx
```

**Actions:** `sendEmail`

**Setup:**
1. Sign up at resend.com
2. Create an API key
3. Add verified sending domain

---

## Creating Custom Integrations

Extend `BaseAdapter`:

```ts
import { BaseAdapter } from '@automesh/integrations';

export class MyAdapter extends BaseAdapter {
  readonly name = 'my_service';
  readonly displayName = 'My Service';
  readonly category = 'messaging';

  verifyWebhookSignature(payload, signature, secret) { ... }
  normalizeEvent(rawPayload, headers) { ... }
  getRegistryEntry() { ... }
}
```

Register in `packages/integrations/src/index.ts`:

```ts
registerAdapter(new MyAdapter());
```
