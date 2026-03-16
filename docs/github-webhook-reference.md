# Webhook Event Context Structure (Reference)

When Automesh receives a webhook (e.g., from GitHub or Stripe), the `adapter.normalizeEvent()` function wraps the raw payload from the provider into a standardized `NormalizedEvent` object. 

This means that when you are evaluating a `condition` or passing an `input` in your `workflow.yaml`, you **must** prefix all properties from the provider's payload with `event.data.`.

## Standard Automesh Wrapper

Regardless of the provider, the root object exposed to the workflow engine evaluator looks like this:

```json
{
  "event": {
    "id": "evt_12345abcde",
    "source": "github",       // or 'stripe', etc.
    "type": "issues",         // the specific event type
    "timestamp": "2026-03-16T16:12:40.000Z",
    "data": {
      // THE RAW PAYLOAD FROM THE PROVIDER LIVES HERE
    }
  }
}
```

## Example: GitHub Issues Event (`github.issues`)

When an issue is opened on GitHub, the `event.data` object contains the `action` and `issue` object. 

If you want to trigger a workflow only when an issue is **opened**, your YAML condition must be:
```yaml
conditions:
  - "event.data.action == 'opened'"
```

*(Do not use `action == 'opened'` as it will evaluate to `undefined`)*

### Full GitHub Issues Payload Reference

```json
{
  "event": {
    "id": "evt_...",
    "source": "github",
    "type": "issues",
    "timestamp": "...",
    "data": {
      "action": "opened",
      "issue": {
        "url": "https://api.github.com/repos/VishwamDhavale/Backend/issues/6",
        "html_url": "https://github.com/VishwamDhavale/Backend/issues/6",
        "id": 4083439848,
        "number": 6,
        "title": "Recent Deliveries",
        "user": {
          "login": "VishwamDhavale",
          "id": 132768612,
          "html_url": "https://github.com/VishwamDhavale"
        },
        "state": "open",
        "created_at": "2026-03-16T16:12:40Z",
        "body": "The markdown body of the issue..."
      },
      "repository": {
        "name": "Backend",
        "full_name": "VishwamDhavale/Backend",
        "html_url": "https://github.com/VishwamDhavale/Backend"
      },
      "sender": {
        "login": "VishwamDhavale"
      }
    }
  }
}
```

### Accessing Data in Steps
To access the issue URL in a step (like sending a Slack message), you interpolate it like this:

```yaml
steps:
  - action: slack.postMessage
    id: notify_slack
    input:
      channel: engineering
      text: "New Issue: {{ event.data.issue.html_url }}"
```
