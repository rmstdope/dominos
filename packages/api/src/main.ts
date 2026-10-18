import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { connectPglite, connectPostgres } from "./db/client.ts";
import { createLogMailer, createSmtpMailer } from "./mail/mailer.ts";

const config = loadConfig();
const database = config.databaseUrl
  ? await connectPostgres(config.databaseUrl)
  : await connectPglite(config.pgliteDir);
if (!config.databaseUrl) console.log(`Using the embedded database in ${config.pgliteDir}`);

const mailer = config.smtpUrl
  ? createSmtpMailer(config.smtpUrl, config.mailFrom)
  : createLogMailer();
if (!config.smtpUrl) console.log("SMTP_URL is not set: emails are printed here instead of sent");

const app = createApp({
  db: database.db,
  mailer,
  config,
  now: () => new Date(),
  defer: (task) => {
    task().catch((err: unknown) => console.error("Background task failed:", err));
  },
});

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`API listening on http://localhost:${info.port}`);
});

function shutdown() {
  server.close(() => {
    database.close().finally(() => process.exit(0));
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
