import type { EventPhase, StaffEvent } from "@dominos/shared";
import { useState } from "react";
import { Link } from "react-router";
import { useLanguage } from "../../i18n/useLanguage";
import { useEvents } from "./api";
import { formatWhen } from "../dates";
import { useStaffText } from "./text";
import { Loaded, PageHeader, Pill, cardClass } from "./ui";

const phaseTone = {
  draft: "plain",
  open: "good",
  closed: "warn",
  past: "muted",
  cancelled: "muted",
} as const satisfies Record<EventPhase, string>;

export function PhasePill({ phase }: { phase: EventPhase }) {
  const t = useStaffText();
  return <Pill tone={phaseTone[phase]}>{t.phase[phase]}</Pill>;
}

const isOver = (e: StaffEvent) => e.phase === "past" || e.phase === "cancelled";

export function EventsPage() {
  const t = useStaffText();
  const events = useEvents();
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");

  return (
    <div className="space-y-8">
      <PageHeader
        title={t.eventsTitle}
        subtitle={t.eventsSubtitle}
        actions={
          <Link
            to="/staff/events/new"
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-cheese-400 px-5 font-semibold text-crust-950 shadow-lg shadow-cheese-400/25 hover:bg-cheese-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cheese-300"
          >
            <span aria-hidden="true">+</span>
            {t.newEvent}
          </Link>
        }
      />
      <Loaded query={events}>
        {(all) => {
          const upcoming = all.filter((e) => !isOver(e));
          const past = all.filter(isOver).reverse();
          const next = upcoming.find((e) => e.phase === "open" || e.phase === "closed");
          const shown = filter === "upcoming" ? upcoming : past;
          return (
            <>
              {next && <NextUp event={next} />}
              <section aria-labelledby="all-events" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 id="all-events" className="sr-only">
                    {t.eventsTitle}
                  </h2>
                  <div
                    role="radiogroup"
                    aria-label={t.eventsTitle}
                    className="inline-flex rounded-xl bg-white/5 p-1 ring-1 ring-white/10"
                  >
                    {(["upcoming", "past"] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={filter === value}
                        onClick={() => setFilter(value)}
                        className={`min-h-9 rounded-lg px-3 text-sm font-semibold ${
                          filter === value
                            ? "bg-cream-100 text-crust-950"
                            : "text-cream-300/80 hover:text-cream-100"
                        }`}
                      >
                        {value === "upcoming" ? t.filterUpcoming : t.filterPast}
                      </button>
                    ))}
                  </div>
                </div>
                {shown.length === 0 ? (
                  <p className="py-6 text-cream-300/70">
                    {filter === "upcoming" ? t.noUpcoming : t.noPast}
                  </p>
                ) : (
                  <EventTable events={shown} />
                )}
              </section>
            </>
          );
        }}
      </Loaded>
    </div>
  );
}

function NextUp({ event }: { event: StaffEvent }) {
  const t = useStaffText();
  const { language } = useLanguage();
  return (
    <section aria-label={event.name} className={`${cardClass} flex flex-wrap items-center gap-6`}>
      <div className="min-w-0 flex-1">
        <PhasePill phase={event.phase} />
        <h2 className="mt-2 text-2xl font-bold">{event.name}</h2>
        <p className="mt-1 text-cream-300/80">
          {formatWhen(event.startsAt, language)} · {event.location}
        </p>
        <p className="mt-1 text-sm text-cream-300/70">
          {t.ordersClose(formatWhen(event.ordersCloseAt, language))}
        </p>
        <p className="mt-3 font-semibold">
          {t.guestCounts(event.guests.invited, event.guests.ordered, event.guests.declined)}
        </p>
      </div>
      <Link
        to={`/staff/events/${event.id}`}
        className="inline-flex min-h-11 items-center rounded-xl bg-cream-100 px-4 text-sm font-bold text-crust-950 hover:bg-white"
      >
        {t.openEvent}
      </Link>
    </section>
  );
}

function EventTable({ events }: { events: StaffEvent[] }) {
  const t = useStaffText();
  const { language } = useLanguage();
  return (
    <div className="overflow-x-auto rounded-2xl ring-1 ring-white/10">
      <table className="w-full min-w-[36rem] border-collapse text-left text-[15px]">
        <thead className="text-xs tracking-wider text-cream-300/70 uppercase">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">
              {t.colEvent}
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              {t.colWhen}
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              {t.colStatus}
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              {t.colMenu}
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              {t.colGuests}
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-t border-white/10">
              <td className="px-4 py-3 font-semibold">
                <Link
                  to={`/staff/events/${event.id}`}
                  className="text-cream-100 underline-offset-2 hover:text-cheese-300 hover:underline"
                >
                  {event.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-cream-300/80">
                {formatWhen(event.startsAt, language)}
              </td>
              <td className="px-4 py-3">
                <PhasePill phase={event.phase} />
              </td>
              <td className="px-4 py-3 text-cream-300/80">
                {t.toppingCount(event.ingredientIds.length)}
              </td>
              <td className="px-4 py-3 text-cream-300/80">
                {t.orderedOf(event.guests.ordered, event.guests.invited)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
