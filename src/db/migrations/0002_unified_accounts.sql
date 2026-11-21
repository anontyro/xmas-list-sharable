ALTER TABLE "guest" ADD COLUMN "member_id" uuid;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "wishlist" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "wishlist" ADD COLUMN "ranked" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "guest" ADD CONSTRAINT "guest_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest" ADD CONSTRAINT "guest_member_id_unique" UNIQUE("member_id");--> statement-breakpoint
UPDATE "member" SET "approved_at" = "created_at";--> statement-breakpoint
UPDATE "wishlist" SET "published_at" = "created_at";
