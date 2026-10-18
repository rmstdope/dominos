import type { StaffEvent, StaffOrder } from "@dominos/shared";
import { Link, useParams } from "react-router";
import { useLanguage } from "../../i18n/useLanguage";
import { errorMessage, useAccountsText } from "../text";
import { formatWhen } from "../dates";
import { keys, staffApi, useEvent, useOrders, useStaffMutation } from "./api";
import { PhasePill } from "./EventsPage";
import { useStaffText } from "./text";
import { Feedback, Loaded, cardClass, smallButtonClass } from "./ui";

const ticketNumber = (n: number) => `#${String(n).padStart(2, "0")}`;

/** The kitchen's view of one night: what to prepare, and every order to tick off. */
export function OrdersPage() {
  const { id = "" } = useParams();
  const t = useStaffText();
  const event = useEvent(id);
  const orders = useOrders(id);
  return (
    <div className="space-y-6">
      <Link
        to={`/staff/events/${id}`}
        className="inline-flex min-h-10 items-center text-sm font-semibold text-cream-300/80 hover:text-cream-100 print:hidden"
      >
        ← {t.backToEvent}
      </Link>
      <Loaded query={event}>{(loaded) => <Header event={loaded} />}</Loaded>
      <Loaded query={orders}>
        {(night) => (
          <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] print:block">
            <section aria-labelledby="prep" className={`${cardClass} h-fit space-y-4 print:mb-6`}>
              <div>
                <h2 id="prep" className="text-lg font-bold">
                  {t.prepTitle}
                </h2>
                <p className="text-sm text-cream-300/70">{t.prepHint}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-crust-950/60 p-3">
                  <p className="text-3xl font-extrabold">{night.pizzas}</p>
                  <p className="text-sm text-cream-300/70">{t.pizzas}</p>
                </div>
                <div className="rounded-2xl bg-crust-950/60 p-3">
                  <p className="text-3xl font-extrabold text-cheese-300">{night.makeOwn}</p>
                  <p className="text-sm text-cream-300/70">{t.makingOwn}</p>
                </div>
              </div>
              <PrepList prep={night.prep} />
            </section>
            <section aria-labelledby="orders" className="space-y-3">
              <h2 id="orders" className="text-lg font-bold">
                {t.ordersTitle}
              </h2>
              {night.orders.length === 0 ? (
                <p className="text-cream-300/70">{t.noOrders}</p>
              ) : (
                <ul className="space-y-3">
                  {night.orders.map((order) => (
                    <li key={order.id} className="break-inside-avoid">
                      <OrderTicket eventId={id} order={order} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </Loaded>
    </div>
  );
}

function Header({ event }: { event: StaffEvent }) {
  const t = useStaffText();
  const a = useAccountsText();
  const { language } = useLanguage();
  const remind = useStaffMutation(() => staffApi.remind(event.id), []);
  const waiting = event.guests.invited - event.guests.declined - event.guests.ordered;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{event.name}</h1>
          <p className="mt-1 text-cream-300/80">
            {formatWhen(event.startsAt, language)} · {event.location}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <PhasePill phase={event.phase} />
          {event.phase === "open" && waiting > 0 && (
            <button
              type="button"
              className={smallButtonClass}
              disabled={remind.isPending || remind.isSuccess}
              onClick={() => remind.mutate(undefined)}
            >
              {t.remindWaiting(waiting)}
            </button>
          )}
          <button type="button" className={smallButtonClass} onClick={() => window.print()}>
            {t.print}
          </button>
        </div>
      </div>
      <Feedback
        error={remind.isError ? errorMessage(remind.error, a) : null}
        success={remind.data ? t.reminded(remind.data.sent) : null}
      />
    </div>
  );
}

function PrepList({
  prep,
}: {
  prep: { ingredientId: string; name: { en: string; sv: string }; count: number }[];
}) {
  const { language } = useLanguage();
  const most = Math.max(1, ...prep.map((p) => p.count));
  return (
    <ul className="space-y-2">
      {prep.map((line) => (
        <li
          key={line.ingredientId}
          className="grid grid-cols-[7rem_minmax(0,1fr)_2rem] items-center gap-3 text-sm"
        >
          <span className="truncate">{line.name[language]}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <span
              className="block h-full rounded-full bg-cheese-400 print:bg-black"
              style={{ width: `${(line.count / most) * 100}%` }}
            />
          </span>
          <span className="text-right font-bold">{line.count}</span>
        </li>
      ))}
    </ul>
  );
}

function OrderTicket({ eventId, order }: { eventId: string; order: StaffOrder }) {
  const t = useStaffText();
  const a = useAccountsText();
  const { language } = useLanguage();
  const bake = useStaffMutation(
    (baked: boolean) => staffApi.markBaked(order.id, baked),
    [keys.orders(eventId)],
  );
  const number = ticketNumber(order.number);
  return (
    <article
      aria-label={`${number} ${order.name}`}
      className={`flex flex-wrap items-start gap-4 rounded-2xl p-4 ring-1 ring-white/10 ${
        order.baked ? "bg-crust-950/40 opacity-60" : "bg-crust-900/70"
      }`}
    >
      <span className="w-12 shrink-0 text-xl font-extrabold text-sauce-400">{number}</span>
      <div className="min-w-0 flex-1 basis-60">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold">{order.name}</h3>
          {order.makeOwn && (
            <span className="rounded-full bg-cheese-300 px-2 py-0.5 text-xs font-bold text-crust-950">
              {t.makesOwn}
            </span>
          )}
        </div>
        <p className="mt-1 text-cream-300/80">
          {order.toppings.length ? order.toppings.map((n) => n[language]).join(", ") : t.plain}
        </p>
        {order.comment && <p className="mt-1 text-cheese-300">“{order.comment}”</p>}
        <Feedback error={bake.isError ? errorMessage(bake.error, a) : null} />
      </div>
      <label className="flex min-h-11 shrink-0 items-center gap-2 text-sm print:hidden">
        <input
          type="checkbox"
          // Shows the click at once; the saved state takes over when the server answers.
          checked={bake.isPending ? bake.variables : order.baked}
          disabled={bake.isPending}
          onChange={(e) => bake.mutate(e.target.checked)}
          aria-label={t.bakedFor(number)}
          className="size-5 accent-basil-400"
        />
        <span aria-hidden="true">{t.baked}</span>
      </label>
    </article>
  );
}
