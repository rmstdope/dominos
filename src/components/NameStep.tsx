import { useState, type FormEvent } from "react";
import { useLanguage } from "../i18n/useLanguage";
import { Button } from "./Button";
import { Shell } from "./Shell";

type Props = {
  initialName: string;
  onSubmit: (name: string) => void;
};

export function NameStep({ initialName, onSubmit }: Props) {
  const { t } = useLanguage();
  const [name, setName] = useState(initialName);
  const canContinue = name.trim() !== "";

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (canContinue) onSubmit(name);
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
      </form>
    </Shell>
  );
}
