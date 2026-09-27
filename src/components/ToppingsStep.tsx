import { groupToppings, type Menu, type Topping } from "../config/menu";
import { Button } from "./Button";
import { Shell } from "./Shell";

type Props = {
  menu: Menu;
  customerName: string;
  isSelected: (id: string) => boolean;
  atLimit: boolean;
  selectedCount: number;
  onToggle: (id: string) => void;
  onClear: () => void;
  onBack: () => void;
  onContinue: () => void;
};

export function ToppingsStep({
  menu,
  customerName,
  isSelected,
  atLimit,
  selectedCount,
  onToggle,
  onClear,
  onBack,
  onContinue,
}: Props) {
  const limitText = menu.maxToppings !== undefined ? ` of ${menu.maxToppings}` : "";
  return (
    <Shell
      step={2}
      title={`Build your pizza, ${customerName}`}
      subtitle={
        menu.maxToppings !== undefined
          ? `Pick up to ${menu.maxToppings} toppings.`
          : "Pick as many toppings as you like."
      }
      footer={
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm whitespace-nowrap text-cream-300/70" aria-live="polite">
              <span className="font-semibold text-cream-100">{selectedCount}</span>
              {limitText} selected
            </p>
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="text-xs font-medium text-cheese-300 underline-offset-2 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          <Button className="shrink-0" onClick={onContinue} disabled={selectedCount === 0}>
            Review
            <span aria-hidden="true">→</span>
          </Button>
        </div>
      }
    >
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm text-cream-300/60 underline-offset-2 hover:underline"
      >
        ← Not {customerName}?
      </button>
      {atLimit && (
        <p
          role="status"
          className="mb-4 rounded-xl bg-cheese-400/10 px-3 py-2 text-sm text-cheese-300 ring-1 ring-cheese-400/30"
        >
          That's the maximum. Deselect one to swap it out.
        </p>
      )}
      <div className="space-y-6">
        {groupToppings(menu.toppings).map(({ group, toppings }) => (
          <section key={group} aria-labelledby={`group-${group}`}>
            <h2
              id={`group-${group}`}
              className="mb-2 text-xs font-semibold tracking-widest text-cream-300/60 uppercase"
            >
              {group}
            </h2>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {toppings.map((topping) => (
                <li key={topping.id}>
                  <ToppingChip
                    topping={topping}
                    selected={isSelected(topping.id)}
                    disabled={atLimit && !isSelected(topping.id)}
                    onToggle={() => onToggle(topping.id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Shell>
  );
}

function ToppingChip({
  topping,
  selected,
  disabled,
  onToggle,
}: {
  topping: Topping;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-disabled={disabled || undefined}
      onClick={() => {
        if (!disabled) onToggle();
      }}
      className={`flex min-h-16 w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cheese-300 ${
        selected
          ? "animate-pop bg-cheese-400 text-crust-950 shadow-lg shadow-cheese-400/25"
          : "bg-white/5 text-cream-100 ring-1 ring-white/10 hover:bg-white/10"
      } ${disabled ? "opacity-35" : ""}`}
    >
      <span className="text-2xl" aria-hidden="true">
        {topping.emoji}
      </span>
      <span className="text-sm leading-tight font-semibold">{topping.name}</span>
      {selected && (
        <span className="ml-auto text-base" aria-hidden="true">
          ✓
        </span>
      )}
    </button>
  );
}
