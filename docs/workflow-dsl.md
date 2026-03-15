# Automesh Workflow DSL Reference

## Overview

Automesh workflows are defined in YAML. Each workflow specifies a trigger, optional conditions, and a sequence of steps to execute.

## Basic Structure

```yaml
workflow: <name>

trigger:
  event: <source>.<event_type>

conditions:
  - <expression>

steps:
  - action: <plugin_name>
    id: <step_id>
    input:
      <key>: <value>
    retry:
      attempts: <number>
      delay: "<duration>"
    fallback: <fallback_action>
```

## Triggers

### Webhook Event
```yaml
trigger:
  event: stripe.payment_succeeded
```

### Scheduled (Cron)
```yaml
trigger:
  schedule: "0 9 * * 1"  # Every Monday at 9am
```

### Manual
```yaml
trigger:
  manual: true
```

## Conditions

Simple boolean expressions evaluated against the execution context:

```yaml
conditions:
  - order.total > 100
  - status == active
  - type != free
```

Supported operators: `>`, `<`, `>=`, `<=`, `==`, `!=`

## Steps

### Full syntax
```yaml
steps:
  - action: send_email
    id: step1
    input:
      to: user@example.com
      subject: Welcome
    retry:
      attempts: 3
      delay: "10s"
    fallback: notify_slack
```

### Shorthand
```yaml
steps:
  - send_email
  - notify_slack
```

## State Interpolation

Reference previous step results using `{{ stepId.field }}`:

```yaml
steps:
  - action: create_contact
    id: customer
    input:
      email: "{{ event.data.email }}"

  - action: send_email
    input:
      to: "{{ customer.email }}"
      subject: "Welcome {{ customer.name }}!"
```

## Retry Policy

Per-step or workflow-level retry:

```yaml
retry:
  attempts: 3
  delay: "10s"    # Supports: ms, s, m, h
```

Retries use exponential backoff automatically.

## Available Actions

| Action | Description | Inputs | Outputs |
|--------|-------------|--------|---------|
| `send_email` | Send transactional email | `to`, `subject`, `body`, `from` | `message_id` |
| `create_contact` | Create CRM contact | `email`, `name`, `phone`, `company` | `contact_id` |
| `notify_slack` | Send Slack message | `channel`, `message` | `message_ts` |

## Event Sources

| Source | Events |
|--------|--------|
| `stripe` | `payment_intent_succeeded`, `checkout_session_completed`, `customer_created` |
| `github` | `push`, `pull_request`, `issues`, `release` |
| `slack` | `message`, `reaction_added` |
| `resend` | `email_sent`, `email_delivered`, `email_bounced` |
