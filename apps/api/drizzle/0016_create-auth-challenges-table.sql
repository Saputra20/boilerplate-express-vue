CREATE TABLE "auth_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_challenges_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "auth_challenges_purpose_check" CHECK ("auth_challenges"."purpose" IN ('email_verification'))
);
--> statement-breakpoint
ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "auth_challenges_user_purpose_created_index" ON "auth_challenges" USING btree ("user_id","purpose","created_at");
--> statement-breakpoint
CREATE INDEX "auth_challenges_purpose_expires_index" ON "auth_challenges" USING btree ("purpose","expires_at");
