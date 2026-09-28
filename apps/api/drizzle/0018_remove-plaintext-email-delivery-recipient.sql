DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "email_deliveries"
    WHERE "recipient_ciphertext" IS NULL OR "recipient_nonce" IS NULL
      OR "recipient_auth_tag" IS NULL OR "recipient_key_version" IS NULL
  ) THEN
    RAISE EXCEPTION 'Email delivery recipients must be encrypted before plaintext removal';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "email_deliveries" DROP COLUMN "recipient";
