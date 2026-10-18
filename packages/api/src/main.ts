import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { connectPglite, connectPostgres } from "./db/client.ts";
import { createLogMailer, createSmtpMailer } from "./mail/mailer.ts";
import { REMINDER_INTERVAL_MS, sendDueReminders } from "./reminders.ts";

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

// Reminder emails: checked every few minutes, sent once each (see reminders.ts).
const checkReminders = () =>
  sendDueReminders({
    db: database.db,
    mailer,
    appOrigin: config.appOrigin,
    now: new Date(),
  }).then(
    (sent) => sent && console.log(`Sent ${sent} reminder email(s)`),
    (err: unknown) => console.error("Reminder check failed:", err),
  );
const reminders = setInterval(checkReminders, REMINDER_INTERVAL_MS);
void checkReminders();

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`API listening on http://localhost:${info.port}`);
});

function shutdown() {
  clearInterval(reminders);
  server.close(() => {
    database.close().finally(() => process.exit(0));
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
