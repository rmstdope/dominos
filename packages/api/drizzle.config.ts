import { defineConfig } from "drizzle-kit";

// Only `drizzle-kit generate` uses this: it diffs src/db/schema.ts against the migrations in
// drizzle/ and writes the next one. The API applies them itself when it starts.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
