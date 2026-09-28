CREATE TABLE "email_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template" text NOT NULL,
	"recipient" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"encrypted_context" "bytea",
	"nonce" "bytea",
	"auth_tag" "bytea",
	"key_version" integer,
	"attempts" integer DEFAULT 0 NOT NULL,
	"provider_message_id" text,
	"error_code" text,
	"error_message" text,
	"sensitive_payload_expires_at" timestamp with time zone NOT NULL,
	"queued_at" timestamp with time zone,
	"processing_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"uncertain_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_deliveries_template_check" CHECK ("email_deliveries"."template" IN ('auth.email-verification', 'auth.password-reset', 'auth.password-changed')),
	CONSTRAINT "email_deliveries_status_check" CHECK ("email_deliveries"."status" IN ('pending', 'queued', 'processing', 'retrying', 'sent', 'failed', 'uncertain')),
	CONSTRAINT "email_deliveries_attempts_check" CHECK ("email_deliveries"."attempts" >= 0)
);
--> statement-breakpoint
CREATE INDEX "email_deliveries_status_created_index" ON "email_deliveries" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "email_deliveries_payload_expiry_index" ON "email_deliveries" USING btree ("sensitive_payload_expires_at");