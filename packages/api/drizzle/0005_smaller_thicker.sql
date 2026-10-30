ALTER TABLE "events" ADD COLUMN "ask_smaller_thicker" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "smaller_thicker" boolean DEFAULT false NOT NULL;