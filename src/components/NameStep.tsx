import { useState, type FormEvent } from "react";
import { useLanguage } from "../i18n/useLanguage";
import { Button } from "./Button";
import { Shell } from "./Shell";

type Props = {
  initialName: string;
  initialMakeOwnPizza: boolean;
  onSubmit: (name: string, makeOwnPizza: boolean) => void;
};

export function NameStep({ initialName, initialMakeOwnPizza, onSubmit }: Props) {
  const { t } = useLanguage();
  const [name, setName] = useState(initialName);
  const [makeOwnPizza, setMakeOwnPizza] = useState(initialMakeOwnPizza);
  const canContinue = name.trim() !== "";

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (canContinue) onSubmit(name, makeOwnPizza);
  };

  return (
    <Shell
      step={1}
      title={t.nameTitle}
      subtitle={t.nameSubtitle}
      footer={
        <Button type="submit" form="name-form" className="w-full" disabled={!canContinue}>
          {t.pickToppings}
          <span aria-hidden="true">→</span>
        </Button>
      }
    >
      <form id="name-form" onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor="customer-name" className="block text-sm font-medium text-cream-300/80">
          {t.nameLabel}
        </label>
        <input
          id="customer-name"
          name="customerName"
          type="text"
          autoComplete="given-name"
          autoCapitalize="words"
          enterKeyHint="next"
          maxLength={40}
          placeholder={t.namePlaceholder}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-xl text-cream-100 placeholder:text-cream-300/30 focus:border-cheese-400 focus:ring-2 focus:ring-cheese-400/40 focus:outline-none"
        />
        <div className="flex items-center justify-between gap-4 pt-3">
          <span id="make-own-pizza" className="text-sm font-medium text-cream-300/80">
            {t.makeOwnPizza}
          </span>
          <YesNo labelledBy="make-own-pizza" value={makeOwnPizza} onChange={setMakeOwnPizza} />
        </div>
      </form>
    </Shell>
  );
}

/** Segmented No / Yes control, styled like the language toggle. */
function YesNo({
  labelledBy,
  value,
  onChange,
}: {
  labelledBy: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { t } = useLanguage();
  const options = [
    { value: false, label: t.no },
    { value: true, label: t.yes },
  ];
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="inline-flex shrink-0 rounded-full bg-white/5 p-0.5 ring-1 ring-white/10"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`min-h-10 min-w-14 rounded-full px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cheese-300 ${
              active ? "bg-cheese-400 text-crust-950" : "text-cream-300/70 hover:text-cream-100"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
