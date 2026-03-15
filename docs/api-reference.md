# Automesh API Reference

Base URL: `http://localhost:4000`

## Health

### `GET /api/health`
Returns server status.

```json
{ "status": "ok", "timestamp": "...", "version": "0.1.0" }
```

---

## Authentication

### `POST /api/auth/token`
Generate a JWT token (development mode).

**Body:** `{ "email": "user@example.com" }`

**Response:** `{ "token": "...", "expiresIn": "24h" }`

---

## Workflows

### `GET /api/workflows`
List all workflows with their latest definition.

### `GET /api/workflows/:id`
Get workflow detail including versions and recent runs.

### `POST /api/workflows`
Create a new workflow from YAML.

**Body:**
```json
{
  "yaml": "workflow: my_wf\ntrigger:\n  manual: true\nsteps:\n  - action: notify_slack",
  "name": "My Workflow"
}
```

### `PUT /api/workflows/:id`
Update workflow (creates a new version).

**Body:** `{ "yaml": "..." }`

### `DELETE /api/workflows/:id`
Delete a workflow and all its versions/runs.

### `POST /api/workflows/:id/trigger`
Manually trigger a workflow execution.

---

## Runs

### `GET /api/runs`
List workflow runs. Optional query: `?workflowId=wf_xxx&limit=50`

### `GET /api/runs/:id`
Get run details with step timeline.

---

## Events

### `GET /api/events`
List recent events. Optional query: `?limit=50`

---

## Webhooks

### `POST /api/webhooks/:provider`
Receive webhook from external provider (stripe, github, slack, resend).

Webhook signatures are verified automatically when secrets are configured.

---

## AI Generator

### `POST /api/ai/generate`
Generate workflow YAML from natural language using Groq.

**Body:** `{ "prompt": "When stripe payment succeeds send welcome email" }`

**Response:** `{ "yaml": "...", "model": "llama-3.3-70b-versatile" }`

---

## Marketplace

### `GET /api/marketplace/integrations`
List all available integration adapters.

### `GET /api/marketplace/plugins`
List all available action plugins.
