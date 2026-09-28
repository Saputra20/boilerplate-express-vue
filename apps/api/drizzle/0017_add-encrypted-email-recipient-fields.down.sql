ALTER TABLE "email_deliveries" DROP CONSTRAINT "email_deliveries_recipient_encryption_fields_check";
--> statement-breakpoint
ALTER TABLE "email_deliveries" DROP COLUMN "recipient_key_version";
--> statement-breakpoint
ALTER TABLE "email_deliveries" DROP COLUMN "recipient_auth_tag";
--> statement-breakpoint
ALTER TABLE "email_deliveries" DROP COLUMN "recipient_nonce";
--> statement-breakpoint
ALTER TABLE "email_deliveries" DROP COLUMN "recipient_ciphertext";
--> statement-breakpoint
ALTER TABLE "email_deliveries" ALTER COLUMN "recipient" SET NOT NULL;

