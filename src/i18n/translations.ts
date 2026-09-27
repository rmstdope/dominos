export const LANGUAGES = ["en", "sv"] as const;
export type Language = (typeof LANGUAGES)[number];

/** A string given in every supported language, as used in config/menu.json. */
export type Localized = Record<Language, string>;

export const LANGUAGE_LABELS: Record<Language, string> = { en: "English", sv: "Svenska" };

const en = {
  appName: "Dominos",
  stepName: "Name",
  stepToppings: "Toppings",
  stepSend: "Send",
  progress: "Progress",
  language: "Language",
  nameTitle: "Who's hungry?",
  nameSubtitle: "Tell the baker who this pizza is for.",
  nameLabel: "Your name",
  namePlaceholder: "e.g. Henrik",
  pickToppings: "Pick toppings",
  toppingsTitle: (name: string) => `Build your pizza, ${name}`,
  toppingsSubtitleLimited: (max: number) => `Pick up to ${max} toppings.`,
  toppingsSubtitleUnlimited: "Pick as many toppings as you like.",
  notYou: (name: string) => `Not ${name}?`,
  atLimit: "That's the maximum. Deselect one to swap it out.",
  selectedCount: (count: number, max: number | undefined) =>
    max === undefined ? `${count} selected` : `${count} of ${max} selected`,
  clearAll: "Clear all",
  review: "Review",
  reviewTitle: "Looks delicious",
  reviewSubtitle: (recipient: string) =>
    `Send it to ${recipient} on WhatsApp and it's in the oven.`,
  pizzaFor: (name: string) => `Pizza for ${name}`,
  previewMessage: "Preview message",
  copyMessage: "Copy message",
  copied: "Copied!",
  sendTo: (recipient: string) => `Send to ${recipient}`,
  changeToppings: "Change toppings",
  startOver: "Start over",
  msgHeader: (name: string) => `🍕 Pizza order from ${name}`,
  msgNoToppings: "Plain pizza, no toppings.",
  msgToppings: (count: number) => `Toppings (${count}):`,
  msgThanks: "Thanks!",
};

export type Translations = typeof en;

const sv: Translations = {
  appName: "Dominos",
  stepName: "Namn",
  stepToppings: "Toppings",
  stepSend: "Skicka",
  progress: "Förlopp",
  language: "Språk",
  nameTitle: "Vem är hungrig?",
  nameSubtitle: "Berätta för bagaren vem pizzan är till.",
  nameLabel: "Ditt namn",
  namePlaceholder: "t.ex. Henrik",
  pickToppings: "Välj toppings",
  toppingsTitle: (name) => `Bygg din pizza, ${name}`,
  toppingsSubtitleLimited: (max) => `Välj upp till ${max} toppings.`,
  toppingsSubtitleUnlimited: "Välj så många toppings du vill.",
  notYou: (name) => `Inte ${name}?`,
  atLimit: "Det är max. Avmarkera en för att byta.",
  selectedCount: (count, max) =>
    max === undefined ? `${count} valda` : `${count} av ${max} valda`,
  clearAll: "Rensa alla",
  review: "Granska",
  reviewTitle: "Ser gott ut",
  reviewSubtitle: (recipient) => `Skicka till ${recipient} på WhatsApp så åker den in i ugnen.`,
  pizzaFor: (name) => `Pizza till ${name}`,
  previewMessage: "Förhandsgranska meddelande",
  copyMessage: "Kopiera meddelande",
  copied: "Kopierat!",
  sendTo: (recipient) => `Skicka till ${recipient}`,
  changeToppings: "Ändra toppings",
  startOver: "Börja om",
  msgHeader: (name) => `🍕 Pizzabeställning från ${name}`,
  msgNoToppings: "Vanlig pizza, inga toppings.",
  msgToppings: (count) => `Toppings (${count}):`,
  msgThanks: "Tack!",
};

export const translations: Record<Language, Translations> = { en, sv };

export const isLanguage = (value: unknown): value is Language =>
  typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);

/** Picks the language from a BCP 47 tag such as "sv-SE"; anything unknown falls back to English. */
export function detectLanguage(locale: string | undefined): Language {
  const primary = locale?.toLowerCase().split("-")[0];
  return isLanguage(primary) ? primary : "en";
}
