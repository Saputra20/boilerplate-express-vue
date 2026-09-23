ALTER TABLE "auth_audit_events" DROP CONSTRAINT "auth_audit_events_event_type_check";--> statement-breakpoint
ALTER TABLE "auth_audit_events" DROP CONSTRAINT "auth_audit_events_reason_check";--> statement-breakpoint
ALTER TABLE "auth_audit_events" ADD CONSTRAINT "auth_audit_events_event_type_check" CHECK ("auth_audit_events"."event_type" IN ('auth.login.succeeded', 'auth.login.failed', 'auth.refresh.succeeded', 'auth.refresh.failed', 'auth.refresh.reuse_detected', 'auth.session.revoked_due_to_refresh_reuse'));--> statement-breakpoint
ALTER TABLE "auth_audit_events" ADD CONSTRAINT "auth_audit_events_reason_check" CHECK ("auth_audit_events"."reason" IS NULL OR "auth_audit_events"."reason" IN ('INVALID_CREDENTIALS', 'ACCOUNT_DISABLED', 'ACCOUNT_DELETED', 'RATE_LIMITED', 'INTERNAL_ERROR', 'INVALID_REFRESH_TOKEN', 'TOKEN_EXPIRED', 'TOKEN_REVOKED', 'TOKEN_REUSED', 'SESSION_EXPIRED', 'SESSION_REVOKED'));--> statement-breakpoint
DROP TABLE "token_revocations";
