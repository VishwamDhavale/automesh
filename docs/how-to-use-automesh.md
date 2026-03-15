# Automesh: What You Can Do & How To Do It

Welcome to Automesh! This is a powerful, event-driven Workflow Engine. It allows you to connect different tools (like Stripe, GitHub, Slack, and Email) and automatically run custom actions when specific events happen.

Everything is defined using simple YAML files, or generated via our AI Builder.

Here is a comprehensive guide to everything you can do in Automesh and how to do it.

---

## 1. Trigger Workflows Automatically via Webhooks

You can make workflows run automatically when something happens in an external app.

### How to do it:
1. In your YAML, set the `trigger` to an `event`.
2. Connect the external app's webhook URL to your Automesh API (`http://your-domain/api/webhooks/<provider>`).

> [!TIP]
> **Local Development:** When testing webhooks locally, the URL from `localtunnel` or `ngrok` changes every time you restart. 
> To get a **permanent static URL** that forwards payloads to your local machine, run:
> ```bash
> pnpm webhooks
> ```
> This will start a Smee.io proxy and print a URL. To make it truly permanent, copy that URL and add it to your `.env` file like this:
> `SMEE_WEBHOOK_URL=https://smee.io/your_random_id`
> 
> Now, `pnpm webhooks` will use exactly that URL every single time, so you can paste it into GitHub/Stripe exactly once!

**Example: Send an email when a Stripe payment succeeds**
```yaml
workflow: welcome-new-customer
trigger:
  event: stripe.payment_intent_succeeded
steps:
  - action: send_email
    input:
      to: "{{ event.data.receipt_email }}"
      subject: "Thanks for your purchase!"
      body: "Your payment of {{ event.data.amount }} was successful."
```

**Available Built-in Events:**
* `stripe`: `stripe.payment_intent_succeeded`, `stripe.checkout_session_completed`, `stripe.customer_created`
* `github`: `github.push`, `github.pull_request`, `github.issues`, `github.release`
* `slack`: `slack.message`, `slack.reaction_added`
* `resend`: `resend.email_sent`, `resend.email_delivered`, `resend.email_bounced`

---

## 2. Trigger Workflows on a Schedule (Cron)

You can run workflows periodically (e.g., every morning, every Monday, every 5 minutes).

### How to do it:
1. In your YAML, set the `trigger` to a `schedule` using a standard Cron expression.

**Example: Send a weekly Slack digest every Monday at 9 AM**
```yaml
workflow: weekly-team-digest
trigger:
  schedule: "0 9 * * 1" # 9:00 AM every Monday
steps:
  - action: notify_slack
    input:
      channel: "general"
      message: "Good morning team! Here is the weekly digest..."
```

---

## 3. Trigger Workflows Manually

You can create workflows that only run when you explicitly click a button in the dashboard or via an API call.

### How to do it:
1. Set the `trigger` to `manual: true`.
2. Go to the Automesh Dashboard, open the workflow, and click **Run Workflow**.

**Example: A manual data cleanup task**
```yaml
workflow: manual-data-cleanup
trigger:
  manual: true
steps:
  - action: notify_slack
    input:
      channel: "devops"
      message: "Data cleanup started manually."
```

---

## 4. Add Conditions to Prevent Unwanted Runs

Sometimes an event happens (like a GitHub push), but you only want the workflow to run if certain conditions are met (e.g., only if it was pushed to the `main` branch).

### How to do it:
1. Add a `conditions` block to your YAML. The workflow will only execute if **all** conditions evaluate to `true`.

**Example: Notify Slack only on main branch pushes**
```yaml
workflow: github-main-push
trigger:
  event: github.push
conditions:
  - event.data.repository.full_name == "my-company/production-repo"
  - event.data.ref == "refs/heads/main" 
steps:
  - action: notify_slack
    input:
      channel: "engineering"
      message: "New code merged to main!"
```

---

## 5. Pass Data Between Steps (Interpolation)

You can use the output of step 1 as the input for step 2.

### How to do it:
1. Give your first step an `id` (e.g., `id: create_user`).
2. Wrap references to that ID in double curly braces `{{ }}` in the next step.

**Example: Create a contact, then email them using the generated ID**
```yaml
workflow: chained-actions
trigger:
  manual: true
steps:
  - action: create_contact
    id: new_contact # We give this step an ID
    input:
      name: "John Doe"
      email: "john@example.com"

  - action: send_email
    input:
      to: "sales@mycompany.com"
      # We use the {{ new_contact.id }} from the previous step!
      subject: "New contact created! CRM ID: {{ new_contact.id }}"
```

---

## 6. Handle Errors Automatically (Retries & Fallbacks)

External APIs fail sometimes. Automesh can automatically retry a step if it fails, or run a backup action if it keeps failing.

### How to do it:
1. Add a `retry` block to specify `attempts` and `delay`.
2. Add a `fallback` to specify a different action to run if all retries fail.

**Example: Try to send an email 3 times. If it fails, alert the dev team on Slack.**
```yaml
workflow: resilient-email
trigger:
  manual: true
steps:
  - action: send_email
    input:
      to: "customer@example.com"
      subject: "Your receipt"
    retry:
      attempts: 3
      delay: "30s" # Wait 30 seconds before retrying
    fallback: notify_slack # If it fails 3 times, do this instead
```

---

## 7. Generate Workflows Using AI

Don't want to learn YAML? You can just type what you want in English, and Automesh will build the workflow for you using the integrated AI.

### How to do it:
1. Go to the Automesh Dashboard.
2. Click **Create Workflow**.
3. In the AI Generator input box, type something like:
   *"When a stripe payment succeeds, send a welcome email to the customer and notify the #sales slack channel."*
4. Click **Generate**. Automesh will instantly write the perfect YAML for you.

---

## 8. Build Workflows Visually

If you prefer a visual approach, Automesh includes a drag-and-drop Visual Builder canvas.

### How to do it:
1. Go to the Automesh Dashboard.
2. Click **Builder** in the sidebar.
3. Drag a "Trigger" node onto the canvas (e.g., Webhook).
4. Drag "Action" nodes below it and connect them with lines.
5. Click on the nodes to configure their inputs.
6. Automesh automatically generates the underlying YAML code for you to save.

---

## 9. Monitor Executions Step-by-Step

When a workflow runs, you can watch exactly what happened, when it happened, and if it succeeded or failed.

### How to do it:
1. Go to the Automesh Dashboard.
2. Click **Runs** in the sidebar.
3. Click on a specific run ID.
4. You will see a visual timeline showing exactly how long each step took, what the inputs/outputs were, and highlighting exactly where any errors occurred.
