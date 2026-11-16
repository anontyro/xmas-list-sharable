CREATE TABLE "guest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "household" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"pin_hash" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recovery_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "recovery_token_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"principal_type" text NOT NULL,
	"principal_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "session_principal_type_check" CHECK ("session"."principal_type" in ('admin','owner','guest'))
);
--> statement-breakpoint
CREATE TABLE "wishlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"title" text NOT NULL,
	"occasion" text NOT NULL,
	"year" integer NOT NULL,
	"slug" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wishlist_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "wishlist_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wishlist_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"product_url" text,
	"image_url" text,
	"price_minor" integer,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"priority" text DEFAULT 'would_love' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wishlist_item_priority_check" CHECK ("wishlist_item"."priority" in ('most_wanted','would_love','nice_to_have')),
	CONSTRAINT "wishlist_item_price_check" CHECK ("wishlist_item"."price_minor" is null or "wishlist_item"."price_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "item_claim" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"guest_id" uuid NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone,
	CONSTRAINT "item_claim_status_check" CHECK ("item_claim"."status" in ('reserved','purchased'))
);
--> statement-breakpoint
CREATE TABLE "item_interest" (
	"guest_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_interest_guest_id_item_id_pk" PRIMARY KEY("guest_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "guest_planner" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"occasion" text NOT NULL,
	"year" integer NOT NULL,
	"budget_minor" integer,
	CONSTRAINT "guest_planner_guest_occasion_year" UNIQUE("guest_id","occasion","year"),
	CONSTRAINT "guest_planner_budget_check" CHECK ("guest_planner"."budget_minor" is null or "guest_planner"."budget_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "planner_item" (
	"planner_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"private_note" text,
	"actual_price_minor" integer,
	"included" boolean DEFAULT true NOT NULL,
	CONSTRAINT "planner_item_planner_id_item_id_pk" PRIMARY KEY("planner_id","item_id"),
	CONSTRAINT "planner_item_actual_check" CHECK ("planner_item"."actual_price_minor" is null or "planner_item"."actual_price_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "recipient_budget" (
	"planner_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"budget_minor" integer NOT NULL,
	CONSTRAINT "recipient_budget_planner_id_member_id_pk" PRIMARY KEY("planner_id","member_id"),
	CONSTRAINT "recipient_budget_check" CHECK ("recipient_budget"."budget_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "auth_limit" (
	"subject_key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"blocked_until" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "guest" ADD CONSTRAINT "guest_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_token" ADD CONSTRAINT "recovery_token_guest_id_guest_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guest"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_item" ADD CONSTRAINT "wishlist_item_wishlist_id_wishlist_id_fk" FOREIGN KEY ("wishlist_id") REFERENCES "public"."wishlist"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_claim" ADD CONSTRAINT "item_claim_item_id_wishlist_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."wishlist_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_claim" ADD CONSTRAINT "item_claim_guest_id_guest_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guest"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_interest" ADD CONSTRAINT "item_interest_guest_id_guest_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guest"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_interest" ADD CONSTRAINT "item_interest_item_id_wishlist_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."wishlist_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_planner" ADD CONSTRAINT "guest_planner_guest_id_guest_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guest"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_item" ADD CONSTRAINT "planner_item_planner_id_guest_planner_id_fk" FOREIGN KEY ("planner_id") REFERENCES "public"."guest_planner"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_item" ADD CONSTRAINT "planner_item_item_id_wishlist_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."wishlist_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipient_budget" ADD CONSTRAINT "recipient_budget_planner_id_guest_planner_id_fk" FOREIGN KEY ("planner_id") REFERENCES "public"."guest_planner"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipient_budget" ADD CONSTRAINT "recipient_budget_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "member_active_name_idx" ON "member" USING btree ("household_id","display_name") WHERE "member"."active";--> statement-breakpoint
CREATE UNIQUE INDEX "recovery_token_one_active_per_guest" ON "recovery_token" USING btree ("guest_id") WHERE "recovery_token"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "session_principal_idx" ON "session" USING btree ("principal_type","principal_id");--> statement-breakpoint
CREATE INDEX "wishlist_member_occasion_year_idx" ON "wishlist" USING btree ("member_id","occasion","year");--> statement-breakpoint
CREATE INDEX "wishlist_item_list_idx" ON "wishlist_item" USING btree ("wishlist_id","priority","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "item_claim_one_active_per_item" ON "item_claim" USING btree ("item_id") WHERE "item_claim"."released_at" is null;--> statement-breakpoint
CREATE INDEX "item_claim_guest_idx" ON "item_claim" USING btree ("guest_id");