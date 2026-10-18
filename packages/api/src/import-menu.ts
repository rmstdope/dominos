import { and, eq, max } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "./db/client.ts";
import { ingredientGroups, ingredients } from "./db/schema.ts";

const localized = z.object({ en: z.string().trim().min(1), sv: z.string().trim().min(1) });

/** The parts of the old config/menu.json the pantry needs. */
const menuSchema = z.object({
  toppings: z.array(z.object({ name: localized, group: localized })),
});

/**
 * Fills the pantry from the WhatsApp app's config/menu.json: its groups in the order they first
 * appear, and each topping in its group. Anything already there, matched by English name, is left
 * alone, so running it twice changes nothing.
 */
export async function importMenu(
  db: Db,
  raw: unknown,
): Promise<{ groups: number; ingredients: number }> {
  const menu = menuSchema.parse(raw);
  let addedGroups = 0;
  let addedIngredients = 0;
  await db.transaction(async (tx) => {
    const groupIds = new Map<string, string>();
    for (const { name, group } of menu.toppings) {
      let groupId = groupIds.get(group.en);
      if (!groupId) {
        const [existing] = await tx
          .select({ id: ingredientGroups.id })
          .from(ingredientGroups)
          .where(eq(ingredientGroups.nameEn, group.en));
        if (existing) {
          groupId = existing.id;
        } else {
          const [{ last } = { last: null }] = await tx
            .select({ last: max(ingredientGroups.sort) })
            .from(ingredientGroups);
          const [created] = await tx
            .insert(ingredientGroups)
            .values({ nameEn: group.en, nameSv: group.sv, sort: (last ?? -1) + 1 })
            .returning({ id: ingredientGroups.id });
          groupId = created!.id;
          addedGroups += 1;
        }
        groupIds.set(group.en, groupId);
      }

      const [existing] = await tx
        .select({ id: ingredients.id })
        .from(ingredients)
        .where(and(eq(ingredients.groupId, groupId), eq(ingredients.nameEn, name.en)));
      if (existing) continue;
      const [{ last } = { last: null }] = await tx
        .select({ last: max(ingredients.sort) })
        .from(ingredients)
        .where(eq(ingredients.groupId, groupId));
      await tx
        .insert(ingredients)
        .values({ groupId, nameEn: name.en, nameSv: name.sv, sort: (last ?? -1) + 1 });
      addedIngredients += 1;
    }
  });
  return { groups: addedGroups, ingredients: addedIngredients };
}
