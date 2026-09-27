import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "whatsapp";

const styles: Record<Variant, string> = {
  primary:
    "bg-cheese-400 text-crust-950 shadow-lg shadow-cheese-400/25 hover:bg-cheese-300 active:scale-[0.98]",
  ghost: "bg-white/5 text-cream-100 ring-1 ring-white/10 hover:bg-white/10 active:scale-[0.98]",
  whatsapp:
    "bg-whatsapp text-crust-950 shadow-lg shadow-whatsapp/30 hover:brightness-110 active:scale-[0.98]",
};

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cheese-300";

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button type="button" className={`${base} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function LinkButton({
  variant = "primary",
  className = "",
  children,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <a className={`${base} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </a>
  );
}
