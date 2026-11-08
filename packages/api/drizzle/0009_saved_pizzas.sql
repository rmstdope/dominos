CREATE TABLE "saved_pizza_toppings" (
	"pizza_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	CONSTRAINT "saved_pizza_toppings_pizza_id_ingredient_id_pk" PRIMARY KEY("pizza_id","ingredient_id")
);
--> statement-breakpoint
CREATE TABLE "saved_pizzas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_pizza_toppings" ADD CONSTRAINT "saved_pizza_toppings_pizza_id_saved_pizzas_id_fk" FOREIGN KEY ("pizza_id") REFERENCES "public"."saved_pizzas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_pizza_toppings" ADD CONSTRAINT "saved_pizza_toppings_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_pizzas" ADD CONSTRAINT "saved_pizzas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;