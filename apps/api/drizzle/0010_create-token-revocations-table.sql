CREATE TABLE "token_revocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jti" uuid NOT NULL,
	"token_type" text NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"revoked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"reason" text NOT NULL,
	CONSTRAINT "token_revocations_jti_unique" UNIQUE("jti"),
	CONSTRAINT "token_revocations_token_type_check" CHECK ("token_revocations"."token_type" = 'access'),
	CONSTRAINT "token_revocations_reason_check" CHECK ("token_revocations"."reason" IN ('LOGOUT', 'LOGOUT_ALL', 'REFRESH_REUSE', 'SESSION_REVOKED'))
);
--> statement-breakpoint
ALTER TABLE "auth_audit_events" DROP CONSTRAINT "auth_audit_events_event_type_check";--> statement-breakpoint
ALTER TABLE "auth_audit_events" DROP CONSTRAINT "auth_audit_events_reason_check";--> statement-breakpoint
ALTER TABLE "token_revocations" ADD CONSTRAINT "token_revocations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_revocations" ADD CONSTRAINT "token_revocations_session_id_auth_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."auth_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "token_revocations_expires_at_index" ON "token_revocations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "token_revocations_session_id_index" ON "token_revocations" USING btree ("session_id");--> statement-breakpoint
ALTER TABLE "auth_audit_events" ADD CONSTRAINT "auth_audit_events_event_type_check" CHECK ("auth_audit_events"."event_type" IN ('auth.login.succeeded', 'auth.login.failed', 'auth.refresh.succeeded', 'auth.refresh.failed', 'auth.refresh.reuse_detected', 'auth.session.revoked_due_to_refresh_reuse', 'auth.logout.succeeded', 'auth.logout_all.succeeded', 'auth.logout.failed', 'auth.logout_all.failed'));--> statement-breakpoint
ALTER TABLE "auth_audit_events" ADD CONSTRAINT "auth_audit_events_reason_check" CHECK ("auth_audit_events"."reason" IS NULL OR "auth_audit_events"."reason" IN ('INVALID_CREDENTIALS', 'ACCOUNT_DISABLED', 'ACCOUNT_DELETED', 'RATE_LIMITED', 'INTERNAL_ERROR', 'INVALID_REFRESH_TOKEN', 'TOKEN_EXPIRED', 'TOKEN_REVOKED', 'TOKEN_REUSED', 'SESSION_EXPIRED', 'SESSION_REVOKED', 'LOGOUT', 'LOGOUT_ALL'));