ALTER TABLE "events" ADD COLUMN "name_sv" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "location_sv" text;--> statement-breakpoint
-- Events made before names were bilingual start with the same name and place in Swedish.
UPDATE "events" SET "name_sv" = "name", "location_sv" = "location";
