// Fills the pantry from the WhatsApp app's menu, once, when moving over:
//   pnpm --filter @dominos/api import-menu [path/to/menu.json]
// Toppings already in the pantry are skipped, so it is safe to run again.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadConfig } from "../config.ts";
import { connectPglite, connectPostgres } from "../db/client.ts";
import { importMenu } from "../import-menu.ts";

const path = resolve(
  process.argv[2] ?? new URL("../../../../config/menu.json", import.meta.url).pathname,
);
const config = loadConfig();
const database = config.databaseUrl
  ? await connectPostgres(config.databaseUrl)
  : await connectPglite(config.pgliteDir);
try {
  const added = await importMenu(database.db, JSON.parse(readFileSync(path, "utf8")));
  console.log(
    `Imported ${path}: ${added.groups} new group(s), ${added.ingredients} new topping(s).`,
  );
} finally {
  await database.close();
}
