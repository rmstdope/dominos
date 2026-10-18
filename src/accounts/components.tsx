import type { InputHTMLAttributes, ReactNode } from "react";
import { LanguageToggle } from "../components/LanguageToggle";
import { useLanguage } from "../i18n/useLanguage";

/** The frame of every signed-out screen: brand and language toggle, a big title, then the form. */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="animate-rise flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-cream-300/70 uppercase">
          <span className="text-base" aria-hidden="true">
            🍕
          </span>
          {t.appName}
        </div>
        <LanguageToggle />
      </header>
      <main className="animate-rise flex flex-1 flex-col pt-14 [animation-delay:60ms]">
        <h1 className="text-4xl font-bold tracking-tight text-balance">{title}</h1>
        {subtitle && <p className="mt-3 text-base text-cream-300/80">{subtitle}</p>}
        <div className="mt-8">{children}</div>
        {footer && <div className="mt-auto pt-10">{footer}</div>}
      </main>
    </div>
  );
}

export function Field({
  id,
  label,
  hint,
  aside,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-cream-300/80">
          {label}
        </label>
        {aside}
      </div>
      <input
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-cream-100 placeholder:text-cream-300/30 read-only:border-white/5 read-only:bg-transparent read-only:text-cream-300/80 focus:border-cheese-400 focus:ring-2 focus:ring-cheese-400/40 focus:outline-none"
        {...input}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-cream-300/60">
          {hint}
        </p>
      )}
    </div>
  );
}

/** A form-level error, announced to screen readers when it appears. */
export function FormError({ message }: { message: string | null }) {
  return (
    <p role="alert" className="min-h-0 text-sm font-medium text-sauce-400 empty:hidden">
      {message}
    </p>
  );
}

/** A boxed note, e.g. the invite-only explanation under the sign-in form. */
export function Note({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-cream-300/80 ring-1 ring-white/10">
      {title && <p className="font-semibold text-cream-100">{title}</p>}
      <p className={title ? "mt-1" : undefined}>{children}</p>
    </div>
  );
}

export const linkClass =
  "font-semibold text-cheese-300 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cheese-300";
