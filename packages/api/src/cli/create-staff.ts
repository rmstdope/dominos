// Nobody can register, so the first staff account is made here:
//   pnpm --filter @dominos/api create-staff --email you@example.com --name "The Baker" [--language sv]
// It prints the invitation link and, when SMTP_URL is set, emails it too. Run against someone who
// already has an account, it makes them staff.
import { parseArgs } from "node:util";
import { emailSchema, LANGUAGES, nameSchema, type Language } from "@dominos/shared";
import { eq } from "drizzle-orm";
import { AlreadyActiveError, inviteUser } from "../auth/accounts.ts";
import { loadConfig } from "../config.ts";
import { connectPglite, connectPostgres } from "../db/client.ts";
import { users } from "../db/schema.ts";
import { createSmtpMailer } from "../mail/mailer.ts";
import { invitationEmail, invitationLink } from "../mail/templates.ts";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    language: { type: "string", default: "en" },
  },
});

const email = emailSchema.safeParse(values.email);
const name = nameSchema.safeParse(values.name);
const language = values.language as Language;
if (!email.success || !name.success || !LANGUAGES.includes(language)) {
  console.error(
    'Usage: create-staff --email you@example.com --name "Your Name" [--language en|sv]',
  );
  process.exit(1);
}

const config = loadConfig();
const database = config.databaseUrl
  ? await connectPostgres(config.databaseUrl)
  : await connectPglite(config.pgliteDir);

try {
  const { user, token } = await inviteUser(
    database.db,
    { email: email.data, name: name.data, role: "staff", language },
    new Date(),
  );
  const link = invitationLink(config.appOrigin, token);
  console.log(
    `Invited ${user.email} as staff. Open this link to choose a password:\n\n  ${link}\n`,
  );
  if (config.smtpUrl) {
    await createSmtpMailer(config.smtpUrl, config.mailFrom).send(invitationEmail(user, link));
    console.log("The link was also emailed.");
  }
} catch (err) {
  if (!(err instanceof AlreadyActiveError)) throw err;
  await database.db.update(users).set({ role: "staff" }).where(eq(users.id, err.user.id));
  console.log(`${err.user.email} already has an account; it is now staff.`);
} finally {
  await database.close();
}
