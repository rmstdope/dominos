import type { IngredientGroup, MenuItem } from "@dominos/shared";
import { useLanguage } from "../../i18n/useLanguage";

/** The toppings by group, to tick on and off. At the limit, only ticked ones can be touched. */
export function ToppingGrid({
  groups,
  items,
  picked,
  atLimit = false,
  onToggle,
}: {
  groups: IngredientGroup[];
  items: MenuItem[];
  picked: string[];
  atLimit?: boolean;
  onToggle: (id: string) => void;
}) {
  const { language } = useLanguage();
  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const inGroup = items.filter((m) => m.groupId === group.id);
        if (inGroup.length === 0) return null;
        return (
          <section key={group.id} aria-labelledby={`group-${group.id}`}>
            <h2
              id={`group-${group.id}`}
              className="mb-2 text-xs font-semibold tracking-widest text-cream-300/70 uppercase"
            >
              {group.name[language]}
            </h2>
            <ul className="grid grid-cols-2 gap-2">
              {inGroup.map((item) => {
                const on = picked.includes(item.id);
                const disabled = !on && atLimit;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      disabled={disabled}
                      onClick={() => onToggle(item.id)}
                      className={`flex min-h-12 w-full items-center gap-2 rounded-2xl px-3 text-left text-[15px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cheese-300 ${
                        on
                          ? "bg-cheese-400/15 text-cream-100 ring-2 ring-cheese-400"
                          : disabled
                            ? "cursor-not-allowed text-cream-300/40 ring-1 ring-white/10 ring-dashed"
                            : "bg-white/5 text-cream-100 ring-1 ring-white/10 hover:bg-white/10"
                      }`}
                    >
                      {item.emoji && (
                        <span className="text-xl" aria-hidden="true">
                          {item.emoji}
                        </span>
                      )}
                      <span className="flex-1">{item.name[language]}</span>
                      {on && <span aria-hidden="true">✓</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
