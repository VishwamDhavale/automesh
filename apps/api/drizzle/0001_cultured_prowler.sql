CREATE TABLE "ai_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" varchar(100) NOT NULL,
	"role" varchar(20) NOT NULL,
	"encrypted_content" text NOT NULL,
	"iv" varchar(32) NOT NULL,
	"auth_tag" varchar(32) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_blobs" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"step_name" varchar(255) NOT NULL,
	"data" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workflow_runs" DROP CONSTRAINT "workflow_runs_version_id_workflow_versions_id_fk";
--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "status" varchar(50) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_blobs" ADD CONSTRAINT "workflow_blobs_run_id_workflow_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."workflow_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_version_id_workflow_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."workflow_versions"("id") ON DELETE cascade ON UPDATE no action;