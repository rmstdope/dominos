import type { GuestEvent, Me } from "@dominos/shared";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { useLanguage } from "../../i18n/useLanguage";
import { formatWhen } from "../dates";
import { Loaded } from "../staff/ui";
import { useGuestEvents } from "./api";
import { GuestLayout } from "./GuestLayout";
import { useGuestText, type GuestText } from "./text";

const DAY = 24 * 60 * 60 * 1000;

/** What the guest is asked to do about each event, in the order the sections appear. */
function sectionOf(e: GuestEvent): "needs" | "ordered" | "closed" | "declined" | "over" {
  if (e.phase === "past" || e.phase === "cancelled") return "over";
  if (e.invitation === "declined") return e.phase === "open" ? "declined" : "over";
  if (e.order) return "ordered";
  return e.phase === "open" ? "needs" : "closed";
}

export function GuestEventsPage({ me }: { me: Me }) {
  const t = useGuestText();
  const events = useGuestEvents();
  return (
    <GuestLayout me={me}>
      <p className="text-cream-300/80">{t.hi(me.name)}</p>
      <h1 className="text-3xl font-bold tracking-tight">{t.eventsTitle}</h1>
      <Loaded query={events}>
        {(all) => {
          if (all.length === 0) return <Empty t={t} />;
          const by = (s: ReturnType<typeof sectionOf>) => all.filter((e) => sectionOf(e) === s);
          return (
            <div className="mt-6 space-y-8">
              <Section title={t.needsOrder} events={by("needs")}>
                {(e) => <NeedsOrderCard event={e} />}
              </Section>
              <Section title={t.ordered} events={[...by("ordered"), ...by("closed")]}>
                {(e) => <EventCard event={e} />}
              </Section>
              <Section title={t.notGoing} events={by("declined")}>
                {(e) => <EventCard event={e} />}
              </Section>
              <Section title={t.past} events={by("over").reverse()}>
                {(e) => <PastRow event={e} />}
              </Section>
            </div>
          );
        }}
      </Loaded>
    </GuestLayout>
  );
}

function Section({
  title,
  events,
  children,
}: {
  title: string;
  events: GuestEvent[];
  children: (event: GuestEvent) => ReactNode;
}) {
  if (events.length === 0) return null;
  return (
    <section aria-label={title} className="space-y-3">
      <h2 className="text-xs font-semibold tracking-widest text-cream-300/70 uppercase">{title}</h2>
      <ul className="space-y-3">
        {events.map((event) => (
          <li key={event.id}>{children(event)}</li>
        ))}
      </ul>
    </section>
  );
}

function NeedsOrderCard({ event }: { event: GuestEvent }) {
  const t = useGuestText();
  const { language } = useLanguage();
  // Read the clock once; the count only needs to be right to the day.
  const [now] = useState(() => Date.now());
  const days = Math.floor((new Date(event.ordersCloseAt).getTime() - now) / DAY);
  return (
    <article className="rounded-3xl bg-cheese-400 p-5 text-crust-950">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-wide uppercase">
            {formatWhen(event.startsAt, language)}
          </p>
          <h3 className="mt-1 text-2xl leading-tight font-extrabold">{event.name}</h3>
          <p className="mt-1">{event.location}</p>
        </div>
        <div className="shrink-0 rounded-2xl bg-crust-950 px-3 py-2 text-center text-cheese-300">
          <div className="text-xl leading-none font-extrabold">{t.daysLeft(days)}</div>
          <div className="mt-1 text-xs font-semibold">{t.toOrder}</div>
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold">
        {t.ordersClose(formatWhen(event.ordersCloseAt, language))}
      </p>
      <Link
        to={`/events/${event.id}`}
        className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-crust-950 font-bold text-cream-100 hover:bg-crust-900"
      >
        {t.buildPizza} <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}

function EventCard({ event }: { event: GuestEvent }) {
  const t = useGuestText();
  const { language } = useLanguage();
  const toppings = event.orderToppings.map((n) => n[language]).join(", ");
  return (
    <article className="rounded-3xl bg-crust-900/70 p-5 ring-1 ring-white/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-cream-300/70">
            {formatWhen(event.startsAt, language)}
          </p>
          <h3 className="mt-0.5 text-lg font-bold">{event.name}</h3>
        </div>
        {event.order && (
          <span className="shrink-0 rounded-full bg-basil-400 px-2.5 py-1 text-xs font-bold text-crust-950">
            {t.orderedBadge} #{String(event.order.number).padStart(2, "0")}
          </span>
        )}
      </div>
      {event.order && (
        <p className="mt-2 text-sm text-cream-300/80">
          {toppings || t.plainPizza}
          {event.order.makeOwn && ` · ${t.makingOwn}`}
        </p>
      )}
      {!event.order && event.phase === "closed" && (
        <p className="mt-2 text-sm text-cream-300/70">{t.comingUp}</p>
      )}
      <Link
        to={`/events/${event.id}`}
        className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-white/5 text-sm font-semibold ring-1 ring-white/10 hover:bg-white/10"
      >
        {event.invitation === "declined"
          ? t.comeAfterAll
          : event.phase === "open"
            ? t.editOrder
            : t.viewOrder}
      </Link>
    </article>
  );
}

function PastRow({ event }: { event: GuestEvent }) {
  const t = useGuestText();
  const { language } = useLanguage();
  return (
    <Link
      to={`/events/${event.id}`}
      className="flex items-center justify-between gap-3 border-t border-white/10 py-3 hover:text-cream-100"
    >
      <div className="min-w-0">
        <p className="font-semibold text-cream-300">{event.name}</p>
        <p className="text-sm text-cream-300/60">
          {formatWhen(event.startsAt, language)}
          {event.phase === "cancelled" && ` · ${t.cancelled}`}
        </p>
      </div>
      <span aria-hidden="true" className="text-cream-300/60">
        →
      </span>
    </Link>
  );
}

function Empty({ t }: { t: GuestText }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
      <span className="text-6xl" aria-hidden="true">
        🍕
      </span>
      <h2 className="mt-6 text-2xl font-bold">{t.noEventsTitle}</h2>
      <p className="mt-2 max-w-xs text-cream-300/80">{t.noEventsBody}</p>
    </div>
  );
}
