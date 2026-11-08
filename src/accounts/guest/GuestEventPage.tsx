import type { GuestEventDetail, Me, SavedPizza } from "@dominos/shared";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { Button } from "../../components/Button";
import { useLanguage } from "../../i18n/useLanguage";
import { ApiRequestError } from "../api";
import { formatWhen } from "../dates";
import { Feedback, Loaded, inputClass } from "../staff/ui";
import { errorMessage, useAccountsText } from "../text";
import { useCreatePizza, useDecline, useGuestEvent, usePizzas, usePlaceOrder } from "./api";
import { GuestLayout } from "./GuestLayout";
import { useGuestText, type GuestText } from "./text";
import { ToppingGrid } from "./ToppingGrid";

export function GuestEventPage({ me }: { me: Me }) {
  const { id = "" } = useParams();
  const t = useGuestText();
  const event = useGuestEvent(id);
  const pizzas = usePizzas();
  return (
    <GuestLayout me={me}>
      <Link
        to="/"
        className="-mt-2 mb-2 inline-flex min-h-11 items-center self-start text-sm font-semibold text-cream-300/80 hover:text-cream-100"
      >
        ← {t.allEvents}
      </Link>
      <Loaded query={event}>
        {(detail) => (
          <Loaded query={pizzas}>
            {(saved) => <EventView key={detail.id} me={me} event={detail} pizzas={saved} />}
          </Loaded>
        )}
      </Loaded>
    </GuestLayout>
  );
}

/** Builder while an order can be placed or changed; else the ticket. */
function EventView({
  me,
  event,
  pizzas,
}: {
  me: Me;
  event: GuestEventDetail;
  pizzas: SavedPizza[];
}) {
  const t = useGuestText();
  const { language } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [justPlaced, setJustPlaced] = useState(false);
  const open = event.phase === "open";
  const declined = event.invitation === "declined";
  // Past the deadline a first order can still come in, marked late.
  const orderable = open || (event.phase === "closed" && !event.order);

  const header = (
    <div>
      <p className="text-sm font-bold tracking-wide text-cheese-400 uppercase">
        {event.name[language]} · {formatWhen(event.startsAt, language)}
      </p>
    </div>
  );

  if (event.phase === "cancelled") {
    return (
      <>
        {header}
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{t.cancelledTitle}</h1>
      </>
    );
  }
  if (orderable && (editing || (!event.order && !declined))) {
    return (
      <>
        {header}
        <Builder
          event={event}
          pizzas={pizzas}
          onPlaced={() => {
            setEditing(false);
            setJustPlaced(true);
          }}
          onCancel={event.order ? () => setEditing(false) : undefined}
        />
      </>
    );
  }
  if (declined && orderable) {
    return (
      <>
        {header}
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{t.declinedTitle}</h1>
        <p className="mt-2 text-cream-300/80">{open ? t.declinedBody : t.declinedBodyLate}</p>
        <Button className="mt-6 w-full" onClick={() => setEditing(true)}>
          {t.comeAfterAll}
        </Button>
      </>
    );
  }
  if (!event.order) {
    return (
      <>
        {header}
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{t.closedTitle}</h1>
        <p className="mt-2 text-cream-300/80">{t.closedNoOrder}</p>
      </>
    );
  }
  return (
    <>
      {justPlaced ? (
        <>
          <h1 className="text-3xl font-bold tracking-tight">{t.onTheList(me.name)}</h1>
          <p className="mt-2 text-cream-300/80">{t.onTheListBody}</p>
        </>
      ) : (
        <>
          {header}
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{t.yourOrder}</h1>
        </>
      )}
      <Ticket event={event} />
      {open && <OrderActions event={event} onChange={() => setEditing(true)} />}
    </>
  );
}

function Ticket({ event }: { event: GuestEventDetail }) {
  const t = useGuestText();
  const { language } = useLanguage();
  const order = event.order!;
  const names = event.orderToppings.map((n) => n[language]);
  return (
    <article
      aria-label={t.yourOrder}
      className="mt-6 overflow-hidden rounded-3xl bg-cream-100 text-crust-950"
    >
      {order.late && (
        <p className="bg-sauce-500 px-5 py-2 text-sm font-bold text-cream-100">{t.lateTicket}</p>
      )}
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-crust-700 uppercase">
            {event.name[language]}
          </p>
          <p className="mt-1 font-bold">{formatWhen(event.startsAt, language)}</p>
          <p className="text-sm text-crust-700">{event.location[language]}</p>
        </div>
        <p className="text-3xl font-extrabold text-sauce-500">
          #{String(order.number).padStart(2, "0")}
        </p>
      </div>
      <div className="space-y-3 border-t-2 border-dashed border-cream-300 p-5 pt-4">
        {names.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {names.map((name) => (
              <li key={name} className="rounded-full bg-cream-300 px-3 py-1 text-sm font-semibold">
                {name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm font-semibold">{t.plainPizza}</p>
        )}
        {(order.makeOwn || order.smallerThicker || order.comment) && (
          <p className="text-sm text-crust-700">
            {[
              order.makeOwn && t.makeOwn,
              order.smallerThicker && t.smallerThicker,
              order.comment && `“${order.comment}”`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>
    </article>
  );
}

/** Names and saves the pizza as it stands, whether or not the order goes through. */
function SavePizza({ toppingIds }: { toppingIds: string[] }) {
  const t = useGuestText();
  const a = useAccountsText();
  const create = useCreatePizza();
  const [name, setName] = useState("");
  const [favourite, setFavourite] = useState(false);
  const save = () => {
    if (name.trim() && !create.isPending) {
      create.mutate(
        { name: name.trim(), ingredientIds: toppingIds, favourite },
        { onSuccess: () => setName("") },
      );
    }
  };
  return (
    <div className="mt-2 space-y-2">
      <label htmlFor="save-pizza" className="block text-sm text-cream-300/80">
        {t.savePizzaLabel}
      </label>
      <div className="flex gap-2">
        <input
          id="save-pizza"
          maxLength={40}
          placeholder={t.savePizzaPlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          // Enter saves the pizza here; it must not send the order around it.
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
          }}
          className={`${inputClass} min-w-0 flex-1`}
        />
        <Button
          type="button"
          variant="ghost"
          className="shrink-0"
          disabled={!name.trim() || create.isPending}
          onClick={save}
        >
          {t.savePizza}
        </Button>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm text-cream-300/80">
        <input
          type="checkbox"
          checked={favourite}
          onChange={(e) => setFavourite(e.target.checked)}
          className="size-5 accent-cheese-400"
        />
        {t.saveAsFavourite}
      </label>
      <Feedback
        error={create.isError ? errorMessage(create.error, a) : null}
        success={create.data ? t.savedAs(create.data.name) : null}
      />
    </div>
  );
}

function OrderActions({ event, onChange }: { event: GuestEventDetail; onChange: () => void }) {
  const t = useGuestText();
  const a = useAccountsText();
  const { language } = useLanguage();
  const decline = useDecline(event.id);
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="mt-4 space-y-3">
      <Button variant="ghost" className="w-full" onClick={onChange}>
        {t.changeOrder}
      </Button>
      <p className="text-center text-sm text-cream-300/60">
        {t.editableUntil(formatWhen(event.ordersCloseAt, language))}
      </p>
      {confirming ? (
        <div className="space-y-2 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <p className="text-sm">{t.confirmDecline}</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={decline.isPending}
              onClick={() => decline.mutate(undefined)}
              className="min-h-11 flex-1 rounded-xl bg-sauce-500 px-3 text-sm font-semibold text-cream-100"
            >
              {t.confirmDeclineYes}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="min-h-11 flex-1 rounded-xl bg-white/5 px-3 text-sm font-semibold ring-1 ring-white/10"
            >
              {t.keep}
            </button>
          </div>
          {decline.isError && (
            <p role="alert" className="text-sm font-medium text-sauce-400">
              {errorMessage(decline.error, a)}
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="block min-h-11 w-full text-sm font-semibold text-cream-300/70 hover:text-cream-100"
        >
          {t.cantMakeIt}
        </button>
      )}
    </div>
  );
}

function orderError(err: unknown, t: GuestText, a: ReturnType<typeof useAccountsText>): string {
  if (err instanceof ApiRequestError && err.code === "conflict") return t.errorClosed;
  if (err instanceof ApiRequestError && err.code === "validation_failed") return t.errorMenu;
  return errorMessage(err, a);
}

/** Toppings to start from, minus what this menu lacks, up to the limit. */
function startingToppings(event: GuestEventDetail, wanted: string[]): string[] {
  const available = new Set(event.menu.map((m) => m.id));
  const picked = wanted.filter((id) => available.has(id));
  return event.maxToppings === null ? picked : picked.slice(0, event.maxToppings);
}

function Builder({
  event,
  pizzas,
  onPlaced,
  onCancel,
}: {
  event: GuestEventDetail;
  pizzas: SavedPizza[];
  onPlaced: () => void;
  onCancel?: () => void;
}) {
  const t = useGuestText();
  const a = useAccountsText();
  const { language } = useLanguage();
  const place = usePlaceOrder(event.id);
  const favourite = event.order ? undefined : pizzas.find((p) => p.favourite);
  const [picked, setPicked] = useState<string[]>(
    () =>
      event.order?.toppingIds ??
      startingToppings(event, favourite?.ingredients.map((i) => i.id) ?? []),
  );
  const [makeOwn, setMakeOwn] = useState(event.order?.makeOwn ?? false);
  const [smallerThicker, setSmallerThicker] = useState(event.order?.smallerThicker ?? false);
  const [comment, setComment] = useState(event.order?.comment ?? "");
  const atLimit = event.maxToppings !== null && picked.length >= event.maxToppings;
  const late = event.phase === "closed";
  const [template, setTemplate] = useState<string | null>(favourite?.id ?? null);
  const [leftOut, setLeftOut] = useState<string[]>([]);

  const startFrom = (pizza: SavedPizza) => {
    const fits = startingToppings(
      event,
      pizza.ingredients.map((i) => i.id),
    );
    setPicked(fits);
    setTemplate(pizza.id);
    setLeftOut(pizza.ingredients.filter((i) => !fits.includes(i.id)).map((i) => i.name[language]));
  };

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    place.mutate(
      { toppingIds: picked, makeOwn, smallerThicker, comment: comment.trim() || null },
      {
        onSuccess: onPlaced,
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col">
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{t.builderTitle}</h1>
      {late && (
        <p className="mt-3 rounded-xl bg-sauce-500 px-3 py-2 text-sm font-semibold text-cream-100">
          {t.lateNotice(formatWhen(event.ordersCloseAt, language))}
        </p>
      )}
      <p className="mt-2 text-cream-300/80">
        {event.maxToppings === null ? t.pickAny : t.pickUpTo(event.maxToppings)}
        {event.note && ` ${event.note[language]}`}
      </p>
      {atLimit && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-cheese-400/10 px-3 py-2 text-sm text-cheese-300 ring-1 ring-cheese-400/30"
        >
          {t.atLimit}
        </p>
      )}
      {pizzas.length > 0 && (
        <section aria-labelledby="start-from" className="mt-5">
          <h2
            id="start-from"
            className="mb-2 text-xs font-semibold tracking-widest text-cream-300/70 uppercase"
          >
            {t.startFrom}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {pizzas.map((pizza) => (
              <li key={pizza.id}>
                <button
                  type="button"
                  aria-pressed={template === pizza.id}
                  onClick={() => startFrom(pizza)}
                  className={`min-h-11 rounded-full px-4 text-sm font-semibold ring-1 ${
                    template === pizza.id
                      ? "bg-cheese-400/15 ring-cheese-400"
                      : "bg-white/5 ring-white/10 hover:bg-white/10"
                  }`}
                >
                  {pizza.name}
                </button>
              </li>
            ))}
          </ul>
          {leftOut.length > 0 && (
            <p role="status" className="mt-2 text-sm text-cheese-300">
              {t.leftOut(leftOut.join(", "))}
            </p>
          )}
        </section>
      )}
      <div className="mt-5">
        <ToppingGrid
          groups={event.groups}
          items={event.menu}
          picked={picked}
          atLimit={atLimit}
          onToggle={toggle}
        />
      </div>

      {event.askMakeOwn && (
        <label className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
          <span>
            <span className="block font-semibold">{t.makeOwn}</span>
            <span className="block text-sm text-cream-300/70">{t.makeOwnHint}</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={makeOwn}
            onChange={(e) => setMakeOwn(e.target.checked)}
            className="size-6 shrink-0 accent-cheese-400"
          />
        </label>
      )}

      {event.askSmallerThicker && (
        <label className="mt-3 flex items-center justify-between gap-4 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
          <span>
            <span className="block font-semibold">{t.smallerThicker}</span>
            <span className="block text-sm text-cream-300/70">{t.smallerThickerHint}</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={smallerThicker}
            onChange={(e) => setSmallerThicker(e.target.checked)}
            className="size-6 shrink-0 accent-cheese-400"
          />
        </label>
      )}

      <SavePizza toppingIds={picked} />

      <label
        htmlFor="comment"
        className="mt-6 mb-2 block text-xs font-semibold tracking-widest text-cream-300/70 uppercase"
      >
        {t.comment}
      </label>
      <textarea
        id="comment"
        rows={3}
        maxLength={500}
        placeholder={t.commentPlaceholder}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="w-full resize-y rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-cream-100 placeholder:text-cream-300/30 focus:border-cheese-400 focus:ring-2 focus:ring-cheese-400/40 focus:outline-none"
      />

      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-white/10 bg-crust-950/85 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-lg">
        {place.isError && (
          <p role="alert" className="mb-2 text-sm font-medium text-sauce-400">
            {orderError(place.error, t, a)}
          </p>
        )}
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold" aria-live="polite">
              {t.countOf(picked.length, event.maxToppings)}
            </p>
            <p className="text-sm text-cream-300/70">
              {late ? t.lateOrder : t.editableUntil(formatWhen(event.ordersCloseAt, language))}
            </p>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="min-h-12 shrink-0 px-2 text-sm font-semibold text-cream-300/80 hover:text-cream-100"
            >
              {t.keepOrder}
            </button>
          )}
          <Button type="submit" className="shrink-0" disabled={place.isPending}>
            {event.order ? t.saveOrder : late ? t.placeLateOrder : t.placeOrder}
          </Button>
        </div>
      </div>
    </form>
  );
}
