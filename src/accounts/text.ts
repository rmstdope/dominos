import { useLanguage } from "../i18n/useLanguage";
import type { Language } from "../i18n/translations";
import { ApiRequestError } from "./api";

const en = {
  signInTitle: "Pizza night, sorted.",
  signInSubtitle: "Sign in to order for your next pizza event.",
  email: "Email",
  emailPlaceholder: "you@example.com",
  password: "Password",
  forgotPassword: "Forgot password?",
  signIn: "Sign in",
  noAccountTitle: "No account yet?",
  noAccountBody:
    "Dominos is invite-only. Open the invitation email from the baker to set up your account.",

  invitationTitle: "Set up your account",
  invitationSubtitle: "Pick a password and you're in. Next time, sign in with your email.",
  emailFromInvitation: "Set by your invitation",
  yourName: "Your name",
  choosePassword: "Choose a password",
  passwordHint: "At least 8 characters.",
  join: "Join",
  invitationNote: "This link works once and expires 7 days after it was sent.",
  haveAccount: "Already have an account?",
  invitationInvalidTitle: "This invitation has expired",
  invitationInvalidBody:
    "The link was already used or is too old. Ask the baker to send you a new invitation.",

  forgotTitle: "Forgot your password?",
  forgotSubtitle: "Enter the email you were invited with. We'll send a link to choose a new one.",
  sendResetLink: "Send reset link",
  checkEmailTitle: "Check your email",
  checkEmailBody: (email: string) =>
    `If ${email} has an account, a reset link is on its way. It works for 1 hour.`,
  differentEmail: "Use a different email",
  neverInvited: "Never got an invitation? Ask the baker to send you one.",

  resetTitle: "Choose a new password",
  resetSubtitle: "You'll be signed out on every other device.",
  newPassword: "New password",
  savePassword: "Save and sign in",
  resetInvalidTitle: "This reset link has expired",
  resetInvalidBody: "Reset links work once, for 1 hour. Ask for a new one.",
  requestNewLink: "Send a new link",

  backToSignIn: "Sign in",
  loading: "Loading…",
  homeGreeting: (name: string) => `Hi ${name}`,
  homeBody: "You're signed in. Pizza events will show up here.",
  staffBadge: "Staff",
  staffConsole: "Open the staff console",
  signedInAs: (email: string) => `Signed in as ${email}`,
  signOut: "Sign out",

  errorInvalidCredentials: "Wrong email or password.",
  errorRateLimited: "Too many attempts. Wait a few minutes and try again.",
  errorNetwork: "Can't reach Dominos. Check your connection and try again.",
  errorPasswordTooShort: "The password needs at least 8 characters.",
  errorGeneric: "Something went wrong. Try again.",
  serverDownTitle: "Can't reach Dominos",
  tryAgain: "Try again",
};

export type AccountsText = typeof en;

const sv: AccountsText = {
  signInTitle: "Pizzakväll, fixat.",
  signInSubtitle: "Logga in för att beställa till nästa pizzakväll.",
  email: "E-post",
  emailPlaceholder: "du@exempel.se",
  password: "Lösenord",
  forgotPassword: "Glömt lösenordet?",
  signIn: "Logga in",
  noAccountTitle: "Inget konto än?",
  noAccountBody:
    "Dominos kräver inbjudan. Öppna inbjudningsmejlet från bagaren för att skapa ditt konto.",

  invitationTitle: "Skapa ditt konto",
  invitationSubtitle: "Välj ett lösenord så är du med. Nästa gång loggar du in med din e-post.",
  emailFromInvitation: "Bestäms av din inbjudan",
  yourName: "Ditt namn",
  choosePassword: "Välj ett lösenord",
  passwordHint: "Minst 8 tecken.",
  join: "Gå med",
  invitationNote: "Länken fungerar en gång och slutar gälla 7 dagar efter att den skickades.",
  haveAccount: "Har du redan ett konto?",
  invitationInvalidTitle: "Inbjudan har gått ut",
  invitationInvalidBody:
    "Länken är redan använd eller för gammal. Be bagaren skicka en ny inbjudan.",

  forgotTitle: "Glömt lösenordet?",
  forgotSubtitle: "Skriv e-posten du blev inbjuden med. Vi skickar en länk där du väljer ett nytt.",
  sendResetLink: "Skicka länk",
  checkEmailTitle: "Kolla din e-post",
  checkEmailBody: (email) => `Om ${email} har ett konto är en länk på väg. Den fungerar i 1 timme.`,
  differentEmail: "Använd en annan e-post",
  neverInvited: "Aldrig fått någon inbjudan? Be bagaren skicka en.",

  resetTitle: "Välj ett nytt lösenord",
  resetSubtitle: "Du loggas ut på alla andra enheter.",
  newPassword: "Nytt lösenord",
  savePassword: "Spara och logga in",
  resetInvalidTitle: "Länken har gått ut",
  resetInvalidBody: "Länkar för nytt lösenord fungerar en gång, i 1 timme. Be om en ny.",
  requestNewLink: "Skicka en ny länk",

  backToSignIn: "Logga in",
  loading: "Laddar…",
  homeGreeting: (name) => `Hej ${name}`,
  homeBody: "Du är inloggad. Pizzakvällar dyker upp här.",
  staffBadge: "Personal",
  staffConsole: "Öppna personalvyn",
  signedInAs: (email) => `Inloggad som ${email}`,
  signOut: "Logga ut",

  errorInvalidCredentials: "Fel e-post eller lösenord.",
  errorRateLimited: "För många försök. Vänta några minuter och försök igen.",
  errorNetwork: "Når inte Dominos. Kolla din uppkoppling och försök igen.",
  errorPasswordTooShort: "Lösenordet behöver minst 8 tecken.",
  errorGeneric: "Något gick fel. Försök igen.",
  serverDownTitle: "Når inte Dominos",
  tryAgain: "Försök igen",
};

const texts: Record<Language, AccountsText> = { en, sv };

export function useAccountsText(): AccountsText {
  return texts[useLanguage().language];
}

/** A problem caught before anything is sent. */
export const PASSWORD_TOO_SHORT = "password_too_short";

/**
 * The message for a failed request or a caught problem. Screens keep the error itself and call
 * this when rendering, so the message follows a change of language.
 */
export function errorMessage(err: unknown, t: AccountsText): string {
  if (err === PASSWORD_TOO_SHORT) return t.errorPasswordTooShort;
  if (!(err instanceof ApiRequestError)) return t.errorGeneric;
  switch (err.code) {
    case "invalid_credentials":
      return t.errorInvalidCredentials;
    case "rate_limited":
      return t.errorRateLimited;
    case "network":
      return t.errorNetwork;
    default:
      return t.errorGeneric;
  }
}
