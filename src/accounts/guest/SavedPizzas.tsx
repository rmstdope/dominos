import type { SavedPizza } from "@dominos/shared";
import { useState, type FormEvent } from "react";
import { Button } from "../../components/Button";
import { useLanguage } from "../../i18n/useLanguage";
import { Feedback, Loaded, inputClass, labelClass } from "../staff/ui";
import { errorMessage, useAccountsText } from "../text";
import { useCreatePizza, useDeletePizza, usePizzas, useToppings, useUpdatePizza } from "./api";
import { useGuestText } from "./text";
import { ToppingGrid } from "./ToppingGrid";

const textButton = "min-h-10 text-sm font-semibold text-cheese-300 hover:underline";

/** The profile's list of saved pizzas; one can be open for editing at a time. */
export function SavedPizzasCard({ className }: { className: string }) {
  const t = useGuestText();
  const pizzas = usePizzas();
  const [editing, setEditing] = useState<string | null>(null);
  const done = () => setEditing(null);
  return (
    <section aria-labelledby="pizzas" className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <h2
          id="pizzas"
          className="text-xs font-semibold tracking-widest text-cream-300/70 uppercase"
        >
          {t.pizzasTitle}
        </h2>
        {editing === null && (
          <button type="button" className={textButton} onClick={() => setEditing("new")}>
            {t.newPizza}
          </button>
        )}
      </div>
      {editing === "new" && <PizzaForm onDone={done} />}
      <Loaded query={pizzas}>
        {(all) =>
          all.length ? (
            <>
              <ul className="space-y-3">
                {all.map((pizza) => (
                  <li key={pizza.id}>
                    {editing === pizza.id ? (
                      <PizzaForm pizza={pizza} onDone={done} />
                    ) : (
                      <PizzaRow pizza={pizza} onEdit={() => setEditing(pizza.id)} />
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-cream-300/70">{t.pizzasHint}</p>
            </>
          ) : (
            editing !== "new" && <p className="text-sm text-cream-300/70">{t.noPizzas}</p>
          )
        }
      </Loaded>
    </section>
  );
}

function PizzaRow({ pizza, onEdit }: { pizza: SavedPizza; onEdit: () => void }) {
  const t = useGuestText();
  const a = useAccountsText();
  const { language } = useLanguage();
  const remove = useDeletePizza();
  const [confirming, setConfirming] = useState(false);
  return (
    <article aria-label={pizza.name} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
      <h3 className="font-bold break-words">{pizza.name}</h3>
      <p className="mt-1 text-sm text-cream-300/80">
        {pizza.ingredients.map((i) => i.name[language]).join(", ") || t.plainPizza}
      </p>
      {confirming ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-4">
          <p className="text-sm">{t.confirmDeletePizza(pizza.name)}</p>
          <button
            type="button"
            className={textButton}
            disabled={remove.isPending}
            onClick={() => remove.mutate(pizza.id)}
          >
            {t.deleteYes}
          </button>
          <button type="button" className={textButton} onClick={() => setConfirming(false)}>
            {t.keep}
          </button>
        </div>
      ) : (
        <div className="mt-2 flex gap-4">
          <button
            type="button"
            className={textButton}
            aria-label={t.editPizza(pizza.name)}
            onClick={onEdit}
          >
            {t.edit}
          </button>
          <button
            type="button"
            className={textButton}
            aria-label={t.deletePizza(pizza.name)}
            onClick={() => setConfirming(true)}
          >
            {t.delete}
          </button>
        </div>
      )}
      <Feedback error={remove.isError ? errorMessage(remove.error, a) : null} />
    </article>
  );
}

/** Makes a new pizza, or changes the one given. */
function PizzaForm({ pizza, onDone }: { pizza?: SavedPizza; onDone: () => void }) {
  const t = useGuestText();
  const a = useAccountsText();
  const toppings = useToppings();
  const create = useCreatePizza();
  const update = useUpdatePizza();
  const [name, setName] = useState(pizza?.name ?? "");
  const [picked, setPicked] = useState<string[]>(pizza?.ingredients.map((i) => i.id) ?? []);
  const save = pizza ? update : create;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = { name: name.trim(), ingredientIds: picked };
    if (pizza) update.mutate({ id: pizza.id, ...body }, { onSuccess: onDone });
    else create.mutate(body, { onSuccess: onDone });
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
      <div className="space-y-1.5">
        <label htmlFor="pizza-form-name" className={labelClass}>
          {t.pizzaName}
        </label>
        <input
          id="pizza-form-name"
          required
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </div>
      <Loaded query={toppings}>
        {({ groups, items }) => (
          <ToppingGrid
            groups={groups}
            items={items}
            picked={picked}
            onToggle={(id) =>
              setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
            }
          />
        )}
      </Loaded>
      <Feedback error={save.isError ? errorMessage(save.error, a) : null} />
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={save.isPending || !name.trim()}>
          {t.save}
        </Button>
        <button type="button" className={textButton} onClick={onDone}>
          {t.cancel}
        </button>
      </div>
    </form>
  );
}
