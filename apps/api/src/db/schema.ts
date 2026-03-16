import { pgTable, text, timestamp, jsonb, serial, integer, varchar } from 'drizzle-orm/pg-core';

// ─── Workflows ──────────────────────────────────────────────────

export const workflows = pgTable('workflows', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  currentVersion: integer('current_version').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Workflow Versions (versioning support) ─────────────────────

export const workflowVersions = pgTable('workflow_versions', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  definition: jsonb('definition').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Workflow Runs ──────────────────────────────────────────────

export const workflowRuns = pgTable('workflow_runs', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  versionId: text('version_id').references(() => workflowVersions.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  context: jsonb('context'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});

// ─── Workflow Steps ─────────────────────────────────────────────

export const workflowSteps = pgTable('workflow_steps', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull().references(() => workflowRuns.id, { onDelete: 'cascade' }),
  stepName: varchar('step_name', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  result: jsonb('result'),
  error: text('error'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});

// ─── Workflow Blobs (MCP Context Sandboxing) ────────────────────

export const workflowBlobs = pgTable('workflow_blobs', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull().references(() => workflowRuns.id, { onDelete: 'cascade' }),
  stepName: varchar('step_name', { length: 255 }).notNull(),
  data: text('data').notNull(),  // Massive strings stored here
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Events ─────────────────────────────────────────────────────

export const events = pgTable('events', {
  id: text('id').primaryKey(),
  source: varchar('source', { length: 100 }).notNull(),
  eventType: varchar('event_type', { length: 255 }).notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Integrations ───────────────────────────────────────────────

export const integrations = pgTable('integrations', {
  id: varchar('id', { length: 50 }).primaryKey(),
  provider: varchar('provider', { length: 50 }).notNull(),
  config: jsonb('config').notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── AI Conversations (Encrypted) ───────────────────────────────

export const aiConversations = pgTable('ai_conversations', {
  id: text('id').primaryKey(),
  sessionId: varchar('session_id', { length: 100 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(), // 'user' | 'assistant' | 'tool'
  encryptedContent: text('encrypted_content').notNull(),
  iv: varchar('iv', { length: 32 }).notNull(),
  authTag: varchar('auth_tag', { length: 32 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
