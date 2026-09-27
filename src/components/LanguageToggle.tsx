import { useLanguage } from "../i18n/useLanguage";
import { LANGUAGES, LANGUAGE_LABELS } from "../i18n/translations";

/** Segmented EN / SV control. */
export function LanguageToggle() {
  const { language, t, setLanguage } = useLanguage();
  return (
    <div
      role="radiogroup"
      aria-label={t.language}
      className="inline-flex rounded-full bg-white/5 p-0.5 ring-1 ring-white/10"
    >
      {LANGUAGES.map((code) => {
        const active = code === language;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={LANGUAGE_LABELS[code]}
            lang={code}
            onClick={() => setLanguage(code)}
            className={`min-h-8 min-w-11 rounded-full px-3 text-xs font-semibold tracking-wider uppercase transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cheese-300 ${
              active ? "bg-cheese-400 text-crust-950" : "text-cream-300/70 hover:text-cream-100"
            }`}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
