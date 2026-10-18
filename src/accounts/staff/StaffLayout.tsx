import type { Me } from "@dominos/shared";
import { Link, NavLink, Outlet } from "react-router";
import { LanguageToggle } from "../../components/LanguageToggle";
import { useAccountsText } from "../text";
import { useSession } from "../useSession";
import { useStaffText } from "./text";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 items-center rounded-xl px-3 text-[15px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cheese-300 ${
    isActive ? "bg-cheese-400/15 text-cheese-300" : "text-cream-300/80 hover:bg-white/5"
  }`;

/** Side menu on a wide screen, a bar above the page on a phone. */
export function StaffLayout({ me }: { me: Me }) {
  const t = useStaffText();
  const a = useAccountsText();
  const { signOut } = useSession();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="border-b border-white/10 bg-crust-950/70 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 md:sticky md:top-0 md:flex md:h-dvh md:w-64 md:shrink-0 md:flex-col md:border-r md:border-b-0 md:py-6">
        <div className="flex items-center justify-between gap-2 md:mb-6">
          <Link
            to="/staff/events"
            className="flex items-center gap-2 text-xs font-semibold tracking-widest text-cream-300/70 uppercase"
          >
            <span className="text-base" aria-hidden="true">
              🍕
            </span>
            Dominos
            <span className="rounded-md bg-sauce-500 px-1.5 py-0.5 text-[10px] text-cream-100">
              {t.staff}
            </span>
          </Link>
        </div>
        <nav aria-label={t.navLabel} className="mt-3 md:mt-0">
          <ul className="flex flex-wrap gap-1 md:flex-col">
            <li>
              <NavLink to="/staff/events" className={navClass}>
                {t.navEvents}
              </NavLink>
            </li>
            <li>
              <NavLink to="/staff/ingredients" className={navClass}>
                {t.navIngredients}
              </NavLink>
            </li>
            <li>
              <NavLink to="/staff/people" className={navClass}>
                {t.navPeople}
              </NavLink>
            </li>
          </ul>
        </nav>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-white/10 pt-3 md:mt-auto md:block md:space-y-3 md:pt-4">
          <p className="hidden truncate text-sm font-semibold md:block">{me.name}</p>
          <Link to="/" className="block text-sm font-semibold text-cheese-300 hover:underline">
            {t.customerView}
          </Link>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => void signOut()}
              className="min-h-10 text-sm font-semibold text-cream-300/80 hover:text-cream-100"
            >
              {a.signOut}
            </button>
            <LanguageToggle />
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 md:px-10 md:py-8">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
