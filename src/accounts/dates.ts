import type { Language } from "../i18n/translations";

const locales: Record<Language, string> = { en: "en-GB", sv: "sv-SE" };

/** e.g. "Fri 6 Nov, 18:30" or "fre 6 nov. 18:30", in the browser's time zone. */
export function formatWhen(iso: string, language: Language): string {
  return new Intl.DateTimeFormat(locales[language], {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The value for an <input type="date">, in local time. */
export function toDateInput(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The value for an <input type="time">, in local time. */
export function toTimeInput(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A local date and time from the inputs, as the ISO string the API takes. */
export function fromInputs(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}
