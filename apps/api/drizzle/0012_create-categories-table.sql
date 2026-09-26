CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "categories_active_slug_unique" ON "categories" USING btree ("slug") WHERE "categories"."is_active" = true AND "categories"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "categories_active_created_at_index" ON "categories" USING btree ("is_active","created_at");