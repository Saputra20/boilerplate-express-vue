DROP INDEX "audit_events_actor_snapshot_id_index";
--> statement-breakpoint
DROP INDEX "audit_events_created_at_id_index";
--> statement-breakpoint
ALTER TABLE "audit_events" DROP COLUMN "actor_snapshot_email";
--> statement-breakpoint
ALTER TABLE "audit_events" DROP COLUMN "actor_snapshot_display_name";
--> statement-breakpoint
ALTER TABLE "audit_events" DROP COLUMN "actor_snapshot_id";