import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Button } from "../../components/Button";
import { useStaffText } from "./text";

export const inputClass =
  "w-full rounded-xl border border-white/10 bg-crust-950/60 px-3 py-2.5 text-base text-cream-100 placeholder:text-cream-300/40 focus:border-cheese-400 focus:ring-2 focus:ring-cheese-400/40 focus:outline-none disabled:opacity-60";

export const labelClass = "block text-sm font-medium text-cream-300/80";

export const cardClass = "rounded-3xl bg-crust-900/70 p-5 ring-1 ring-white/10 sm:p-6";

export const smallButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-xl px-3 text-sm font-semibold text-cream-100 bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cheese-300";

export const textButtonClass =
  "inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-semibold text-cheese-300 hover:text-cheese-400 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cheese-300";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-cream-300/80">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

type Tone = "good" | "warn" | "muted" | "plain";

const tones: Record<Tone, string> = {
  good: "bg-basil-400 text-crust-950",
  warn: "bg-cheese-300 text-crust-950",
  muted: "bg-white/5 text-cream-300/80 ring-1 ring-white/15",
  plain: "border border-dashed border-cream-300/40 text-cream-300/80",
};

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/**
 * Renders the query's data, or a quiet loading line, or an error with a retry button. Keeps every
 * screen from repeating the same three states.
 */
export function Loaded<T>({
  query,
  children,
}: {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
}) {
  const t = useStaffText();
  if (query.isPending) return <p className="py-6 text-cream-300/60">…</p>;
  if (query.isError) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 py-6 text-cream-300/80">
        {t.loadFailed}
        <Button variant="ghost" onClick={() => void query.refetch()}>
          {t.retry}
        </Button>
      </div>
    );
  }
  return <>{children(query.data)}</>;
}

/** A message under a form or row: an error (announced) or a quiet confirmation. */
export function Feedback({ error, success }: { error?: string | null; success?: string | null }) {
  if (error) {
    return (
      <p role="alert" className="text-sm font-medium text-sauce-400">
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p role="status" className="text-sm font-medium text-basil-400">
        {success}
      </p>
    );
  }
  return null;
}
