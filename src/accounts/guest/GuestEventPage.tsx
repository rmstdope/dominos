import type { GuestEventDetail, Me } from "@dominos/shared";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { Button } from "../../components/Button";
import { useLanguage } from "../../i18n/useLanguage";
import { ApiRequestError } from "../api";
import { formatWhen } from "../dates";
import { Loaded } from "../staff/ui";
import { errorMessage, useAccountsText } from "../text";
import { useDecline, useFavourite, useGuestEvent, usePlaceOrder, useSetFavourite } from "./api";
import { GuestLayout } from "./GuestLayout";
import { useGuestText, type GuestText } from "./text";

export function GuestEventPage({ me }: { me: Me }) {
  const { id = "" } = useParams();
  const t = useGuestText();
  const event = useGuestEvent(id);
  const favourite = useFavourite();
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
          <Loaded query={favourite}>
            {(fav) => (
              <EventView
                key={detail.id}
                me={me}
                event={detail}
                favourite={fav.ingredients.map((i) => i.id)}
              />
            )}
          </Loaded>
        )}
      </Loaded>
    </GuestLayout>
  );
}

/** Builder while ordering is open and there is no order (or it is being changed); else the ticket. */
function EventView({
  me,
  event,
  favourite,
}: {
  me: Me;
  event: GuestEventDetail;
  favourite: string[];
}) {
  const t = useGuestText();
  const { language } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [justPlaced, setJustPlaced] = useState(false);
  const open = event.phase === "open";
  const declined = event.invitation === "declined";

  const header = (
    <div>
      <p className="text-sm font-bold tracking-wide text-cheese-400 uppercase">
        {event.name} · {formatWhen(event.startsAt, language)}
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
  if (open && (editing || (!event.order && !declined))) {
    return (
      <>
        {header}
        <Builder
          event={event}
          favourite={favourite}
          onPlaced={() => {
            setEditing(false);
            setJustPlaced(true);
          }}
          onCancel={event.order ? () => setEditing(false) : undefined}
        />
      </>
    );
  }
  if (declined && open) {
    return (
      <>
        {header}
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{t.declinedTitle}</h1>
        <p className="mt-2 text-cream-300/80">{t.declinedBody}</p>
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
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-crust-700 uppercase">{event.name}</p>
          <p className="mt-1 font-bold">{formatWhen(event.startsAt, language)}</p>
          <p className="text-sm text-crust-700">{event.location}</p>
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
        {(order.makeOwn || order.comment) && (
          <p className="text-sm text-crust-700">
            {[order.makeOwn && t.makeOwn, order.comment && `“${order.comment}”`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>
    </article>
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

/** Where a new order starts: the favourite, minus what this menu lacks, up to the limit. */
function startingToppings(event: GuestEventDetail, favourite: string[]): string[] {
  const available = new Set(event.menu.filter((m) => m.inStock).map((m) => m.id));
  const picked = favourite.filter((id) => available.has(id));
  return event.maxToppings === null ? picked : picked.slice(0, event.maxToppings);
}

function Builder({
  event,
  favourite,
  onPlaced,
  onCancel,
}: {
  event: GuestEventDetail;
  favourite: string[];
  onPlaced: () => void;
  onCancel?: () => void;
}) {
  const t = useGuestText();
  const a = useAccountsText();
  const { language } = useLanguage();
  const place = usePlaceOrder(event.id);
  const saveFavourite = useSetFavourite();
  const [picked, setPicked] = useState<string[]>(
    () => event.order?.toppingIds ?? startingToppings(event, favourite),
  );
  const [asFavourite, setAsFavourite] = useState(false);
  const [makeOwn, setMakeOwn] = useState(event.order?.makeOwn ?? false);
  const [comment, setComment] = useState(event.order?.comment ?? "");
  const atLimit = event.maxToppings !== null && picked.length >= event.maxToppings;
  const had = new Set(event.order?.toppingIds ?? []);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    place.mutate(
      { toppingIds: picked, makeOwn, comment: comment.trim() || null },
      {
        onSuccess: () => {
          if (asFavourite) saveFavourite.mutate(picked);
          onPlaced();
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col">
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{t.builderTitle}</h1>
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
      <div className="mt-5 space-y-5">
        {event.groups.map((group) => (
          <section key={group.id} aria-labelledby={`group-${group.id}`}>
            <h2
              id={`group-${group.id}`}
              className="mb-2 text-xs font-semibold tracking-widest text-cream-300/70 uppercase"
            >
              {group.name[language]}
            </h2>
            <ul className="grid grid-cols-2 gap-2">
              {event.menu
                .filter((m) => m.groupId === group.id)
                .map((item) => {
                  const on = picked.includes(item.id);
                  // A topping that ran out stays pickable for someone who already has it.
                  const unavailable = !item.inStock && !had.has(item.id);
                  const disabled = !on && (unavailable || atLimit);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        aria-pressed={on}
                        disabled={disabled}
                        onClick={() => toggle(item.id)}
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
                        {unavailable && !on && (
                          <span className="text-xs font-bold text-cream-300/60">
                            {t.outOfStock}
                          </span>
                        )}
                        {on && <span aria-hidden="true">✓</span>}
                      </button>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
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

      <label className="mt-4 flex min-h-11 items-center gap-3 text-sm text-cream-300/80">
        <input
          type="checkbox"
          checked={asFavourite}
          onChange={(e) => setAsFavourite(e.target.checked)}
          className="size-5 accent-cheese-400"
        />
        {t.saveFavourite}
      </label>

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
              {t.editableUntil(formatWhen(event.ordersCloseAt, language))}
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
            {event.order ? t.saveOrder : t.placeOrder}
          </Button>
        </div>
      </div>
    </form>
  );
}
