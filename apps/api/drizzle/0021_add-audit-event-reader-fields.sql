ALTER TABLE "audit_events" ADD COLUMN "actor_snapshot_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN "actor_snapshot_display_name" text;--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN "actor_snapshot_email" text;--> statement-breakpoint
CREATE INDEX "audit_events_created_at_id_index" ON "audit_events" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "audit_events_actor_snapshot_id_index" ON "audit_events" USING btree ("actor_snapshot_id");