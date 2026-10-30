import type { Language } from "@dominos/shared";
import { bothLanguages } from "../db/util.ts";
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

/** What an event invitation says about the event. */
export type EventDetails = {
  name: string;
  nameSv: string | null;
  startsAt: Date;
  location: string;
  locationSv: string | null;
  ordersCloseAt: Date;
};

const nameIn = (event: EventDetails, language: Language) =>
  bothLanguages(event.name, event.nameSv)[language];
const placeIn = (event: EventDetails, language: Language) =>
  bothLanguages(event.location, event.locationSv)[language];

const locales: Record<Language, string> = { en: "en-GB", sv: "sv-SE" };

/** e.g. "Friday 6 November, 18:30", always in Swedish time: the pizza is made in Sweden. */
function when(date: Date, language: Language): string {
  return new Intl.DateTimeFormat(locales[language], {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Stockholm",
  }).format(date);
}

function eventLines(event: EventDetails, language: Language, message?: string): string[] {
  const lines = {
    en: [
      nameIn(event, "en"),
      `${when(event.startsAt, "en")}, ${placeIn(event, "en")}`,
      `Order before ${when(event.ordersCloseAt, "en")}.`,
    ],
    sv: [
      nameIn(event, "sv"),
      `${when(event.startsAt, "sv")}, ${placeIn(event, "sv")}`,
      `Beställ senast ${when(event.ordersCloseAt, "sv")}.`,
    ],
  }[language];
  return message ? [...lines, "", message] : lines;
}

/** To someone who already has an account: open the event and pick toppings. */
export function eventInvitationEmail(
  to: Recipient,
  event: EventDetails,
  link: string,
  message?: string,
): Email {
  const text = {
    en: [
      `Hi ${to.name},`,
      "",
      "You're invited to a pizza night:",
      "",
      ...eventLines(event, "en", message),
      "",
      "Pick your toppings here:",
      link,
    ],
    sv: [
      `Hej ${to.name}!`,
      "",
      "Du är bjuden på pizzakväll:",
      "",
      ...eventLines(event, "sv", message),
      "",
      "Välj dina toppings här:",
      link,
    ],
  };
  const subject = {
    en: `You're invited: ${nameIn(event, "en")}`,
    sv: `Du är bjuden: ${nameIn(event, "sv")}`,
  };
  return { to: to.email, subject: subject[to.language], text: text[to.language].join("\n") };
}

/** To someone new: one email that sets up the account and says what the event is. */
export function welcomeToEventEmail(
  to: Recipient,
  event: EventDetails,
  link: string,
  message?: string,
): Email {
  const text = {
    en: [
      `Hi ${to.name},`,
      "",
      "You're invited to a pizza night:",
      "",
      ...eventLines(event, "en", message),
      "",
      "We take pizza orders on Dominos. Choose a password to set up your account and pick your toppings:",
      link,
      "",
      "The link works once and expires in 7 days.",
    ],
    sv: [
      `Hej ${to.name}!`,
      "",
      "Du är bjuden på pizzakväll:",
      "",
      ...eventLines(event, "sv", message),
      "",
      "Vi tar pizzabeställningar på Dominos. Välj ett lösenord för att skapa ditt konto och välja toppings:",
      link,
      "",
      "Länken fungerar en gång och slutar gälla om 7 dagar.",
    ],
  };
  const subject = {
    en: `You're invited: ${nameIn(event, "en")}`,
    sv: `Du är bjuden: ${nameIn(event, "sv")}`,
  };
  return { to: to.email, subject: subject[to.language], text: text[to.language].join("\n") };
}

export const eventLink = (appOrigin: string, eventId: string) => `${appOrigin}/events/${eventId}`;

/** To someone invited who has not ordered yet, the day before orders close or when staff ask. */
export function orderReminderEmail(to: Recipient, event: EventDetails, link: string): Email {
  const text = {
    en: [
      `Hi ${to.name},`,
      "",
      `Orders for ${nameIn(event, "en")} close ${when(event.ordersCloseAt, "en")}, and we don't have yours yet.`,
      "",
      "Pick your toppings here:",
      link,
      "",
      "Can't make it? Say so on the same page, so the baker knows.",
    ],
    sv: [
      `Hej ${to.name}!`,
      "",
      `Beställningen till ${nameIn(event, "sv")} stänger ${when(event.ordersCloseAt, "sv")}, och vi har inte fått din än.`,
      "",
      "Välj dina toppings här:",
      link,
      "",
      "Kan du inte komma? Säg till på samma sida, så vet bagaren.",
    ],
  };
  const subject = {
    en: `Pick your toppings: ${nameIn(event, "en")}`,
    sv: `Välj dina toppings: ${nameIn(event, "sv")}`,
  };
  return { to: to.email, subject: subject[to.language], text: text[to.language].join("\n") };
}

/** To someone who has ordered, the day before the event. */
export function dayBeforeEmail(
  to: Recipient,
  event: EventDetails,
  toppings: string[],
  link: string,
): Email {
  const pizza = {
    en: toppings.length ? toppings.join(", ") : "a plain pizza, just sauce and cheese",
    sv: toppings.length ? toppings.join(", ") : "en vanlig pizza, bara sås och ost",
  };
  const text = {
    en: [
      `Hi ${to.name},`,
      "",
      `See you at ${nameIn(event, "en")}: ${when(event.startsAt, "en")}, ${placeIn(event, "en")}.`,
      "",
      `Your pizza: ${pizza.en}.`,
      link,
    ],
    sv: [
      `Hej ${to.name}!`,
      "",
      `Vi ses på ${nameIn(event, "sv")}: ${when(event.startsAt, "sv")}, ${placeIn(event, "sv")}.`,
      "",
      `Din pizza: ${pizza.sv}.`,
      link,
    ],
  };
  const subject = {
    en: `Tomorrow: ${nameIn(event, "en")}`,
    sv: `Imorgon: ${nameIn(event, "sv")}`,
  };
  return { to: to.email, subject: subject[to.language], text: text[to.language].join("\n") };
}
