ALTER TABLE "saved_pizzas" ADD COLUMN "favourite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "saved_pizzas_one_favourite" ON "saved_pizzas" USING btree ("user_id") WHERE "saved_pizzas"."favourite";--> statement-breakpoint
INSERT INTO "saved_pizzas" ("user_id", "name", "favourite")
SELECT DISTINCT u."id", CASE WHEN u."language" = 'sv' THEN 'Min favorit' ELSE 'My favourite' END, true
FROM "favourite_toppings" f
JOIN "users" u ON u."id" = f."user_id"
JOIN "ingredients" i ON i."id" = f."ingredient_id"
WHERE i."archived_at" IS NULL;--> statement-breakpoint
INSERT INTO "saved_pizza_toppings" ("pizza_id", "ingredient_id")
SELECT p."id", f."ingredient_id"
FROM "favourite_toppings" f
JOIN "saved_pizzas" p ON p."user_id" = f."user_id" AND p."favourite"
JOIN "ingredients" i ON i."id" = f."ingredient_id"
WHERE i."archived_at" IS NULL;--> statement-breakpoint
DROP TABLE "favourite_toppings" CASCADE;
