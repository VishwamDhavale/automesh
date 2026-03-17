import type { FastifyInstance } from 'fastify';
import Groq from 'groq-sdk';
import { nanoid } from 'nanoid';
import { db, schema } from '../db/index.js';
import { eq, asc, and } from 'drizzle-orm';
import { encrypt, decrypt } from '../utils/crypto.js';
import { parseWorkflow } from '@automesh/workflow-engine';

// ─── Tool Definitions for Groq ──────────────────────────────────

const TOOLS: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'check_integrations',
      description: 'Check which integrations (Slack, GitHub, Resend, Stripe) are currently configured in the system. Returns which providers are connected and ready to use.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_available_plugins',
      description: 'List all available workflow action plugins and event sources that can be used in workflows.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'validate_workflow',
      description: 'Validate a workflow YAML to check if it has correct syntax and structure before deploying.',
      parameters: {
        type: 'object',
        properties: {
          yaml: { type: 'string', description: 'The workflow YAML string to validate' },
        },
        required: ['yaml'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deploy_workflow',
      description: 'Deploy a validated workflow YAML to make it active. ONLY call this AFTER: (1) the user EXPLICITLY says "yes", "deploy", "go ahead", or similar confirmation, AND (2) you have already called check_integrations and verified all required integrations are configured. NEVER call this automatically.',
      parameters: {
        type: 'object',
        properties: {
          yaml: { type: 'string', description: 'The validated workflow YAML to deploy' },
          confirmed: { type: 'boolean', description: 'Must be true. Set to true ONLY if the user has explicitly confirmed deployment in their message.' },
        },
        required: ['yaml', 'confirmed'],
      },
    },
  },
];

// ─── System Prompt ──────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an intelligent workflow automation assistant for Automesh. You help users design, validate, and deploy workflow automations.

Your capabilities:
1. **Check integrations** - Before generating a workflow, ALWAYS check what integrations are configured using the check_integrations tool.
2. **Generate workflows** - Design workflows in Automesh YAML DSL based on user requirements.
3. **Validate** - Validate the YAML before deploying using the validate_workflow tool.
4. **Deploy** - Deploy workflows ONLY when the user explicitly confirms.

## MANDATORY WORKFLOW (follow this order EVERY TIME):

### Step 1: CHECK INTEGRATIONS FIRST
Before generating ANY workflow, call check_integrations to see what is configured.
If the workflow requires an integration that is NOT configured, STOP and tell the user:
"⚠️ This workflow requires [provider] integration, but it's not configured yet. Please go to Settings to set it up first."
Do NOT generate or offer to deploy a workflow with missing integrations.

### Step 2: GENERATE AND SHOW THE YAML
After confirming integrations are ready, generate the workflow YAML and show it to the user in a code block. Explain what each step does.

### Step 3: VALIDATE THE YAML
Call validate_workflow to verify the YAML parses correctly.

### Step 4: ASK FOR EXPLICIT CONFIRMATION
After showing and validating the workflow, ASK the user: "Would you like me to deploy this workflow?"
Wait for the user to respond with an explicit confirmation like "yes", "deploy it", "go ahead", etc.

### Step 5: DEPLOY ONLY AFTER CONFIRMATION
Only call deploy_workflow AFTER the user has explicitly confirmed in a SEPARATE message.
⛔ NEVER deploy in the same turn where you show the workflow for the first time.
⛔ NEVER auto-deploy just because the user described what they want.
⛔ The user saying "I want X" is NOT confirmation to deploy. It is a request to DESIGN a workflow.

The Automesh YAML DSL format:
\`\`\`yaml
workflow: <workflow_name>

trigger:
  event: <source>.<event_type>  # e.g., github.issues, stripe.payment_intent_succeeded
  # OR
  schedule: "<cron_expression>"  # e.g., "0 9 * * 1"
  # OR
  manual: true

conditions:  # optional
  - <boolean_expression>

steps:
  - action: <plugin_name>
    id: <step_id>
    input:
      <param>: <value>
      # MCP Tool Action Example:
      # action: run_mcp_tool
      # id: mcp_step
      # input:
      #   serverCommand: "npx"
      #   serverArgs: ["-y", "@modelcontextprotocol/server-everything"]
      #   toolName: "echo"
      #   toolArgs: { "message": "hello" }
      <param>: "{{ previous_step_id.field }}"  # template interpolation
    retry:  # optional
      attempts: 3
      delay: "10s"
\`\`\`

CRITICAL RULE: WEBHOOK PAYLOADS
When evaluating \`conditions\` or interpolating \`input\` from a webhook trigger, the raw payload is ALWAYS wrapped inside an \`event.data\` object.
- Wrong: \`action == 'opened'\`
- Right: \`event.data.action == 'opened'\`
- Wrong: \`{{ issue.html_url }}\`
- Right: \`{{ event.data.issue.html_url }}\`

VALID GITHUB EVENTS (github.<event>):
branch_protection_configuration, branch_protection_rule, check_run, check_suite, code_scanning_alert, commit_comment, create, delete, dependabot_alert, deploy_key, deployment, deployment_status, discussion, discussion_comment, fork, github_app_authorization, gollum, installation, installation_repositories, issue_comment, issues, label, member, merge_group, milestone, package, page_build, ping, project_card, project_column, project, public, pull_request, pull_request_review, pull_request_review_comment, pull_request_review_thread, push, registry_package, release, repository, repository_advisory, repository_import, repository_ruleset, repository_vulnerability_alert, secret_scanning_alert, star, status, team_add, watch, workflow_job, workflow_run.

VALID SLACK EVENTS (slack.<event>):
message, reaction_added, pin_added, channel_created, member_joined_channel.

VALID RESEND EVENTS (resend.<event>):
email.sent, email.delivered, email.bounced, email.complained, email.opened, email.clicked.`;

// ─── Tool Execution ─────────────────────────────────────────────

async function executeTool(name: string, args: Record<string, unknown>, userId: string): Promise<string> {
  switch (name) {
    case 'check_integrations': {
      const integrations = await db
        .select()
        .from(schema.integrations)
        .where(eq(schema.integrations.userId, userId));
      const configured = integrations.map((i) => ({
        provider: i.provider,
        configured: true,
        fields: Object.keys(i.config as Record<string, string>),
      }));

      const allProviders = ['slack', 'github', 'resend', 'stripe'];
      const result = allProviders.map((p) => {
        const found = configured.find((c) => c.provider === p);
        return {
          provider: p,
          status: found ? 'connected' : 'not_configured',
          fields: found?.fields ?? [],
        };
      });

      return JSON.stringify(result, null, 2);
    }

    case 'list_available_plugins': {
      return JSON.stringify({
        actions: [
          { name: 'send_email', inputs: ['to', 'subject', 'body', 'from'], requires: 'resend' },
          { name: 'create_contact', inputs: ['email', 'name', 'phone', 'company'], requires: null },
          { name: 'notify_slack', inputs: ['channel', 'message'], requires: 'slack' },
        ],
        event_sources: [
          { provider: 'stripe', events: ['payment_intent_succeeded', 'checkout_session_completed', 'customer_created', 'invoice_paid'] },
          { provider: 'github', events: ['push', 'pull_request', 'issues', 'release'] },
          { provider: 'slack', events: ['message', 'reaction_added'] },
          { provider: 'resend', events: ['email_sent', 'email_delivered', 'email_bounced'] },
        ],
      }, null, 2);
    }

    case 'validate_workflow': {
      const yaml = args.yaml as string;
      try {
        const definition = parseWorkflow(yaml);
        return JSON.stringify({
          valid: true,
          workflow_name: definition.workflow,
          trigger_type: definition.trigger?.event ? 'event' : definition.trigger?.schedule ? 'schedule' : 'manual',
          step_count: definition.steps?.length ?? 0,
        });
      } catch (err) {
        return JSON.stringify({
          valid: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    case 'deploy_workflow': {
      const yaml = args.yaml as string;
      const confirmed = args.confirmed as boolean;

      // Guard: require explicit confirmation flag
      if (!confirmed) {
        return JSON.stringify({
          success: false,
          error: 'Deployment blocked: you must ask the user for explicit confirmation before deploying. Set confirmed=true only after the user says "yes" or "deploy".',
        });
      }

      try {
        const definition = parseWorkflow(yaml);

        // Guard: check required integrations are configured
        const requiredProviders: string[] = [];
        if (definition.trigger?.event) {
          const provider = definition.trigger.event.split('.')[0];
          if (provider) requiredProviders.push(provider);
        }
        for (const step of definition.steps ?? []) {
          if (step.action === 'send_email') requiredProviders.push('resend');
          if (step.action === 'notify_slack') requiredProviders.push('slack');
        }

        const uniqueProviders = [...new Set(requiredProviders)];
        if (uniqueProviders.length > 0) {
          const integrations = await db
            .select()
            .from(schema.integrations)
            .where(eq(schema.integrations.userId, userId));
          const configuredProviders = integrations.map(i => i.provider);
          const missing = uniqueProviders.filter(p => !configuredProviders.includes(p));

          if (missing.length > 0) {
            return JSON.stringify({
              success: false,
              error: `Deployment blocked: the following integrations are required but not configured: ${missing.join(', ')}. Please ask the user to configure them in Settings first.`,
              missing_integrations: missing,
            });
          }
        }

        const id = `wf_${nanoid()}`;
        const versionId = `wfv_${nanoid()}`;
        const name = definition.workflow;

        await (db.insert(schema.workflows) as any).values({
          id,
          userId,
          name,
          currentVersion: 1,
        });

        await (db.insert(schema.workflowVersions) as any).values({
          id: versionId,
          workflowId: id,
          version: 1,
          definition: definition as unknown as Record<string, unknown>,
        });

        return JSON.stringify({
          success: true,
          workflow_id: id,
          name,
          message: `Workflow "${name}" deployed successfully with ID ${id}`,
        });
      } catch (err) {
        return JSON.stringify({
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ─── Message Storage (Encrypted) ────────────────────────────────

async function saveMessage(sessionId: string, userId: string, role: string, content: string) {
  const { encrypted, iv, authTag } = encrypt(content);
  await (db.insert(schema.aiConversations) as any).values({
    id: `msg_${nanoid()}`,
    sessionId,
    userId,
    role,
    encryptedContent: encrypted,
    iv,
    authTag,
  });
}

async function loadMessages(sessionId: string, userId: string): Promise<{ role: string; content: string }[]> {
  const rows = await db
    .select()
    .from(schema.aiConversations)
    .where(and(eq(schema.aiConversations.sessionId, sessionId), eq(schema.aiConversations.userId, userId)))
    .orderBy(asc(schema.aiConversations.createdAt));

  return rows.map((row) => ({
    role: row.role,
    content: decrypt(row.encryptedContent, row.iv, row.authTag),
  }));
}

// ─── Routes ─────────────────────────────────────────────────────

export async function aiRoutes(app: FastifyInstance) {
  // New intelligent chat endpoint
  app.get('/api/ai/chat/:sessionId', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const user = (request as any).user;
    
    try {
      const history = await loadMessages(sessionId, user.sub);
      return reply.send({ history });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: `Failed to load chat history: ${message}` });
    }
  });

  app.post('/api/ai/chat', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const user = (request as any).user;
    const { message, sessionId: incomingSessionId } = request.body as {
      message: string;
      sessionId?: string;
    };

    if (!message) {
      return reply.status(400).send({ error: 'Missing "message" in request body' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return reply.status(500).send({ error: 'GROQ_API_KEY not configured' });
    }

    const sessionId = incomingSessionId || `session_${nanoid()}`;

    // Save the user message
    await saveMessage(sessionId, user.sub, 'user', message);

    // Load full conversation history (decrypted)
    const history = await loadMessages(sessionId, user.sub);

    // Build messages for Groq
    const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const groq = new Groq({ apiKey });

    // Agent loop: keep calling until no more tool calls
    let maxIterations = 10;
    let finalContent = '';

    while (maxIterations-- > 0) {
      const completion = await groq.chat.completions.create({
        messages,
        model: 'llama-3.3-70b-versatile',
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.3,
        max_tokens: 2048,
      });

      const choice = completion.choices[0];
      const responseMessage = choice.message;

      // If the model wants to call tools
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        // Add the assistant message with tool_calls to history
        messages.push(responseMessage as any);

        // Execute each tool call
        for (const toolCall of responseMessage.tool_calls) {
          const args = JSON.parse(toolCall.function.arguments || '{}');
          const result = await executeTool(toolCall.function.name, args, user.sub);

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          } as any);
        }

        // Continue the loop — the model will process tool results
        continue;
      }

      // No tool calls — we have the final response
      finalContent = responseMessage.content ?? '';
      break;
    }

    // Save the assistant response (encrypted)
    await saveMessage(sessionId, user.sub, 'assistant', finalContent);

    return reply.send({
      sessionId,
      message: finalContent,
      model: 'llama-3.3-70b-versatile',
    });
  });

  // Keep old simple generate endpoint for backward compatibility
  app.post('/api/ai/generate', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const { prompt } = request.body as { prompt: string };

    if (!prompt) {
      return reply.status(400).send({ error: 'Missing "prompt" in request body' });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      const mockYaml = generateMockWorkflow(prompt);
      return reply.send({ yaml: mockYaml, model: 'mock' });
    }

    try {
      const groq = new Groq({ apiKey });

      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are an expert workflow automation designer. Generate ONLY raw YAML (no markdown fences, no explanation). Use the Automesh DSL format.' },
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
