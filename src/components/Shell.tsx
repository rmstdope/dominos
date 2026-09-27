import type { ReactNode } from "react";
import { useLanguage } from "../i18n/useLanguage";
import { LanguageToggle } from "./LanguageToggle";

type Props = {
  step: 1 | 2 | 3;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

/** Page frame: header with progress, scrollable body, optional sticky footer. */
export function Shell({ step, title, subtitle, children, footer }: Props) {
  const { t } = useLanguage();
  const steps = [t.stepName, t.stepToppings, t.stepSend] as const;
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="animate-rise">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-cream-300/70 uppercase">
            <span className="text-base" aria-hidden="true">
              🍕
            </span>
            {t.appName}
          </div>
          <LanguageToggle />
        </div>
        <ol className="mt-4 flex gap-2" aria-label={t.progress}>
          {steps.map((label, index) => {
            const number = (index + 1) as 1 | 2 | 3;
            const state = number < step ? "done" : number === step ? "current" : "todo";
            return (
              <li
                key={label}
                className="flex-1"
                aria-current={state === "current" ? "step" : undefined}
              >
                <div
                  className={`h-1.5 rounded-full transition-colors ${
                    state === "todo" ? "bg-white/10" : "bg-cheese-400"
                  }`}
                />
                <span
                  className={`mt-1.5 block text-[11px] font-medium ${
                    state === "current" ? "text-cheese-300" : "text-cream-300/50"
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-balance sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-cream-300/80">{subtitle}</p>}
      </header>
      <main className="animate-rise flex-1 py-6 [animation-delay:60ms]">{children}</main>
      {footer && (
        <footer className="sticky bottom-0 -mx-4 mt-auto border-t border-white/10 bg-crust-950/80 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-lg">
          <div className="mx-auto max-w-lg">{footer}</div>
        </footer>
      )}
    </div>
  );
}
