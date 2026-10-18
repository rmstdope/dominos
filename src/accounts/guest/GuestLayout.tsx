import type { Me } from "@dominos/shared";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { LanguageToggle } from "../../components/LanguageToggle";
import { useSession } from "../useSession";
import { useGuestText } from "./text";

/** The phone-first frame of the guest screens: brand, staff link, sign out, language. */
export function GuestLayout({ me, children }: { me: Me; children: ReactNode }) {
  const t = useGuestText();
  const { signOut } = useSession();
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
          <button
            type="button"
            onClick={() => void signOut()}
            className="min-h-10 text-sm font-semibold text-cream-300/80 hover:text-cream-100"
          >
            {t.signOut}
          </button>
          <LanguageToggle />
        </div>
      </header>
      <main className="flex flex-1 flex-col pt-6">{children}</main>
    </div>
  );
}
