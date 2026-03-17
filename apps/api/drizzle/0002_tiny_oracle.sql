ALTER TABLE "ai_conversations" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "user_id" text NOT NULL;