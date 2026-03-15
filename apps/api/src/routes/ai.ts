import type { FastifyInstance } from 'fastify';
import Groq from 'groq-sdk';

const SYSTEM_PROMPT = `You are an expert workflow automation designer. You generate workflow definitions in YAML format using the Automesh DSL.

The DSL format is:

\`\`\`yaml
workflow: <workflow_name>

trigger:
  event: <source>.<event_type>  # e.g., stripe.payment_succeeded, github.push
  # OR
  schedule: "<cron_expression>"  # e.g., "0 9 * * 1" for every Monday 9am
  # OR
  manual: true

conditions:  # optional
  - <simple_boolean_expression>

steps:
  - action: <plugin_name>
    id: <step_id>  # optional, for referencing in later steps
    input:
      <param>: <value>
      <param>: "{{ previous_step_id.field }}"  # template interpolation
    retry:  # optional
      attempts: 3
      delay: "10s"
    fallback: <fallback_action>  # optional
\`\`\`

Available actions:
- send_email (inputs: to, subject, body, from)
- create_contact (inputs: email, name, phone, company)
- notify_slack (inputs: channel, message)

Available event sources:
- stripe (payment_intent_succeeded, checkout_session_completed, customer_created, invoice_paid)
- github (push, pull_request, issues, release)
- slack (message, reaction_added)
- resend (email_sent, email_delivered, email_bounced)

Generate ONLY the YAML. No explanation, no markdown fences. Just raw YAML.`;

export async function aiRoutes(app: FastifyInstance) {
  app.post('/api/ai/generate', async (request, reply) => {
    const { prompt } = request.body as { prompt: string };

    if (!prompt) {
      return reply.status(400).send({ error: 'Missing "prompt" in request body' });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      // Mock mode: return a sample workflow
      const mockYaml = generateMockWorkflow(prompt);
      return reply.send({ yaml: mockYaml, model: 'mock' });
    }

    try {
      const groq = new Groq({ apiKey });

      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 1024,
      });

      const yaml = completion.choices[0]?.message?.content ?? '';

      return reply.send({
        yaml: yaml.trim(),
        model: completion.model,
        usage: completion.usage,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: `AI generation failed: ${message}` });
    }
  });
}

function generateMockWorkflow(prompt: string): string {
  const name = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 40);

  return `workflow: ${name}

trigger:
  event: stripe.payment_intent_succeeded

steps:
  - action: create_contact
    id: step1
    input:
      email: "{{ event.data.customer_email }}"
      name: "{{ event.data.customer_name }}"

  - action: send_email
    id: step2
    input:
      to: "{{ step1.email }}"
      subject: "Welcome!"
      body: "Thank you for your purchase."

  - action: notify_slack
    input:
      channel: "#sales"
      message: "New customer: {{ step1.email }}"
`;
}
