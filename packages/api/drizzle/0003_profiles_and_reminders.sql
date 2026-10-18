CREATE TYPE "public"."reminder_kind" AS ENUM('before_close', 'day_before');--> statement-breakpoint
CREATE TABLE "favourite_toppings" (
	"user_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	CONSTRAINT "favourite_toppings_user_id_ingredient_id_pk" PRIMARY KEY("user_id","ingredient_id")
);
--> statement-breakpoint
CREATE TABLE "reminders_sent" (
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "reminder_kind" NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reminders_sent_event_id_user_id_kind_pk" PRIMARY KEY("event_id","user_id","kind")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "remind_before_close" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "remind_day_before" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "favourite_toppings" ADD CONSTRAINT "favourite_toppings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favourite_toppings" ADD CONSTRAINT "favourite_toppings_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders_sent" ADD CONSTRAINT "reminders_sent_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders_sent" ADD CONSTRAINT "reminders_sent_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;