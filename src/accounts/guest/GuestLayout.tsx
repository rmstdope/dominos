import type { Me } from "@dominos/shared";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { LanguageToggle } from "../../components/LanguageToggle";
import { useGuestText } from "./text";

/** The phone-first frame of the guest screens: brand, staff link, profile, language. */
export function GuestLayout({ me, children }: { me: Me; children: ReactNode }) {
  const t = useGuestText();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <Link
          to="/"
          className="flex items-center gap-2 text-xs font-semibold tracking-widest text-cream-300/70 uppercase"
        >
          <span className="text-base" aria-hidden="true">
            🍕
          </span>
          Dominos
        </Link>
        <div className="flex items-center gap-3">
          {me.role === "staff" && (
            <Link to="/staff" className="text-sm font-semibold text-cheese-300 hover:underline">
              {t.staffConsole}
            </Link>
          )}
          <Link
            to="/profile"
            aria-label={t.profile}
            className="flex size-10 items-center justify-center rounded-full bg-crust-700 font-bold text-cheese-300 hover:bg-crust-800"
          >
            {me.name.trim().charAt(0).toUpperCase()}
          </Link>
          <LanguageToggle />
        </div>
      </header>
      <main className="flex flex-1 flex-col pt-6">{children}</main>
    </div>
  );
}
