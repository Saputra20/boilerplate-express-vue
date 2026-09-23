ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_replaced_by_token_id_refresh_tokens_id_fk";--> statement-breakpoint
ALTER TABLE "refresh_tokens" DROP COLUMN "replaced_by_token_id";
