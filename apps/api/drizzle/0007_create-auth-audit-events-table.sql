CREATE TABLE "auth_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"user_id" uuid,
	"session_id" uuid,
	"request_id" uuid NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_audit_events_event_type_check" CHECK ("auth_audit_events"."event_type" IN ('auth.login.succeeded', 'auth.login.failed')),
	CONSTRAINT "auth_audit_events_reason_check" CHECK ("auth_audit_events"."reason" IS NULL OR "auth_audit_events"."reason" IN ('INVALID_CREDENTIALS', 'ACCOUNT_DISABLED', 'ACCOUNT_DELETED', 'RATE_LIMITED', 'INTERNAL_ERROR'))
);
--> statement-breakpoint
ALTER TABLE "auth_audit_events" ADD CONSTRAINT "auth_audit_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_audit_events" ADD CONSTRAINT "auth_audit_events_session_id_auth_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."auth_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_audit_events_user_id_index" ON "auth_audit_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_audit_events_session_id_index" ON "auth_audit_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "auth_audit_events_created_at_index" ON "auth_audit_events" USING btree ("created_at");