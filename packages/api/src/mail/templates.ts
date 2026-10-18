import type { Language } from "@dominos/shared";
import type { Email } from "./mailer.ts";

type Recipient = { email: string; name: string; language: Language };

export function invitationEmail(to: Recipient, link: string): Email {
  const text = {
    en: [
      `Hi ${to.name},`,
      "",
      "You're invited to Dominos, where we order pizza for our pizza nights.",
      "Choose a password to set up your account:",
      "",
      link,
      "",
      "The link works once and expires in 7 days.",
    ],
    sv: [
      `Hej ${to.name}!`,
      "",
      "Du är inbjuden till Dominos, där vi beställer pizza till våra pizzakvällar.",
      "Välj ett lösenord för att skapa ditt konto:",
      "",
      link,
      "",
      "Länken fungerar en gång och slutar gälla om 7 dagar.",
    ],
  };
  const subject = { en: "You're invited to Dominos", sv: "Du är inbjuden till Dominos" };
  return { to: to.email, subject: subject[to.language], text: text[to.language].join("\n") };
}

export function passwordResetEmail(to: Recipient, link: string): Email {
  const text = {
    en: [
      `Hi ${to.name},`,
      "",
      `Someone asked to reset the password for ${to.email}. Choose a new one here:`,
      "",
      link,
      "",
      "The link works for 1 hour. If it wasn't you, you can ignore this email.",
    ],
    sv: [
      `Hej ${to.name}!`,
      "",
      `Någon bad om att återställa lösenordet för ${to.email}. Välj ett nytt här:`,
      "",
      link,
      "",
      "Länken fungerar i 1 timme. Var det inte du kan du strunta i det här mejlet.",
    ],
  };
  const subject = {
    en: "Reset your Dominos password",
    sv: "Återställ ditt Dominos-lösenord",
  };
  return { to: to.email, subject: subject[to.language], text: text[to.language].join("\n") };
}

/** The token goes in the fragment: browsers never send it to a server or in a Referer header. */
export const invitationLink = (appOrigin: string, token: string) =>
  `${appOrigin}/invitation#${token}`;
export const passwordResetLink = (appOrigin: string, token: string) =>
  `${appOrigin}/reset-password#${token}`;
