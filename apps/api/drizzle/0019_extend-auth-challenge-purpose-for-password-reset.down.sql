DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "auth_challenges" WHERE "purpose" = 'password_reset'
  ) THEN
    RAISE EXCEPTION 'Cannot roll back password reset challenge purpose while password_reset challenges exist';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "auth_challenges" DROP CONSTRAINT "auth_challenges_purpose_check";
--> statement-breakpoint
ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_purpose_check"
  CHECK ("auth_challenges"."purpose" IN ('email_verification'));
