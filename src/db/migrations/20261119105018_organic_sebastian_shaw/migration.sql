CREATE TABLE "entry_resource" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"entry_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "entry_resource_entry_id" ON "entry_resource" ("entry_id");--> statement-breakpoint
ALTER TABLE "entry_resource" ADD CONSTRAINT "entry_resource_entry_id_calendar_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "calendar_entry"("id") ON DELETE CASCADE;