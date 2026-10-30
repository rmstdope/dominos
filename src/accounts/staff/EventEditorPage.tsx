import type { Ingredient, IngredientGroup, StaffEvent, UpdateEvent } from "@dominos/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Button } from "../../components/Button";
import { useLanguage } from "../../i18n/useLanguage";
import { errorMessage, useAccountsText } from "../text";
import { keys, staffApi, useEvent, useGroups, useIngredients, useStaffMutation } from "./api";
import { fromInputs, toDateInput, toTimeInput } from "../dates";
import { PhasePill } from "./EventsPage";
import { GuestsSection } from "./GuestsSection";
import { useStaffText, type StaffText } from "./text";
import { Feedback, Loaded, Pill, cardClass, inputClass, labelClass, smallButtonClass } from "./ui";

type Form = {
  name: string;
  date: string;
  startTime: string;
  location: string;
  closeDate: string;
  closeTime: string;
  maxToppings: string;
  noteEn: string;
  noteSv: string;
  askMakeOwn: boolean;
  askSmallerThicker: boolean;
  menu: string[];
};

function formFrom(event: StaffEvent | undefined, ingredients: Ingredient[]): Form {
  if (!event) {
    return {
      name: "",
      date: "",
      startTime: "18:00",
      location: "",
      closeDate: "",
      closeTime: "20:00",
      maxToppings: "",
      noteEn: "",
      noteSv: "",
      askMakeOwn: true,
      askSmallerThicker: true,
      // A new menu starts with everything in stock; staff untick what is not on offer.
      menu: ingredients.filter((i) => i.inStock).map((i) => i.id),
    };
  }
  return {
    name: event.name,
    date: toDateInput(event.startsAt),
    startTime: toTimeInput(event.startsAt),
    location: event.location,
    closeDate: toDateInput(event.ordersCloseAt),
    closeTime: toTimeInput(event.ordersCloseAt),
    maxToppings: event.maxToppings === null ? "" : String(event.maxToppings),
    noteEn: event.note?.en ?? "",
    noteSv: event.note?.sv ?? "",
    askMakeOwn: event.askMakeOwn,
    askSmallerThicker: event.askSmallerThicker,
    menu: event.ingredientIds,
  };
}

const sameMenu = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

const sameForm = (a: Form, b: Form) =>
  sameMenu(a.menu, b.menu) &&
  (Object.keys(a) as (keyof Form)[]).every((k) => k === "menu" || a[k] === b[k]);

/** The fields to send, or the message for why the form cannot be saved yet. */
function toFields(form: Form, t: StaffText): { fields: Required<UpdateEvent> } | { error: string } {
  const startsAt = fromInputs(form.date, form.startTime);
  const ordersCloseAt = fromInputs(form.closeDate, form.closeTime);
  if (new Date(ordersCloseAt) > new Date(startsAt)) return { error: t.errorCloseAfterStart };
  const noteEn = form.noteEn.trim();
  const noteSv = form.noteSv.trim();
  if (Boolean(noteEn) !== Boolean(noteSv)) return { error: t.errorNoteBoth };
  return {
    fields: {
      name: form.name.trim(),
      startsAt,
      location: form.location.trim(),
      ordersCloseAt,
      maxToppings: form.maxToppings === "" ? null : Number(form.maxToppings),
      note: noteEn ? { en: noteEn, sv: noteSv } : null,
      askMakeOwn: form.askMakeOwn,
      askSmallerThicker: form.askSmallerThicker,
    },
  };
}

export function EventEditorPage() {
  const { id } = useParams();
  const t = useStaffText();
  const event = useEvent(id);
  const groups = useGroups();
  const ingredients = useIngredients();

  return (
    <div className="space-y-6">
      <Link
        to="/staff/events"
        className="inline-flex min-h-10 items-center text-sm font-semibold text-cream-300/80 hover:text-cream-100"
      >
        ← {t.allEvents}
      </Link>
      <Loaded query={groups}>
        {(groupList) => (
          <Loaded query={ingredients}>
            {(ingredientList) =>
              id ? (
                <Loaded query={event}>
                  {(loaded) => (
                    <EventForm
                      key={loaded.id}
                      event={loaded}
                      groups={groupList}
                      ingredients={ingredientList}
                    />
                  )}
                </Loaded>
              ) : (
                <EventForm groups={groupList} ingredients={ingredientList} />
              )
            }
          </Loaded>
        )}
      </Loaded>
    </div>
  );
}

function EventForm({
  event,
  groups,
  ingredients,
}: {
  event?: StaffEvent;
  groups: IngredientGroup[];
  ingredients: Ingredient[];
}) {
  const t = useStaffText();
  const a = useAccountsText();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => formFrom(event, ingredients));
  const [saved, setSaved] = useState(() => formFrom(event, ingredients));
  const [problem, setProblem] = useState<unknown>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [confirming, setConfirming] = useState<"cancel" | "delete" | null>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setJustSaved(false);
  };
  const dirty = !event || !sameForm(form, saved);
  const frozen = event?.status === "cancelled";
  const usable = new Set(ingredients.map((i) => i.id));

  const remember = (updated: StaffEvent) =>
    queryClient.setQueryData(keys.event(updated.id), updated);
  const after = [keys.events] as const;
  const save = useStaffMutation(async (fields: Required<UpdateEvent>) => {
    // Archived ingredients cannot go on a menu; drop any that were archived since.
    const menu = form.menu.filter((id) => usable.has(id));
    if (!event) return staffApi.createEvent({ ...fields, ingredientIds: menu });
    let updated = await staffApi.updateEvent(event.id, fields);
    if (!sameMenu(menu, event.ingredientIds)) updated = await staffApi.setMenu(event.id, menu);
    return updated;
  }, after);
  const publish = useStaffMutation(() => staffApi.publishEvent(event!.id), after);
  const cancel = useStaffMutation(() => staffApi.cancelEvent(event!.id), after);
  const remove = useStaffMutation(() => staffApi.deleteEvent(event!.id), after);
  const busy = save.isPending || publish.isPending || cancel.isPending || remove.isPending;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setProblem(null);
    const result = toFields(form, t);
    if ("error" in result) return setProblem(result.error);
    save.mutate(result.fields, {
      onSuccess: (updated) => {
        remember(updated);
        if (!event) return navigate(`/staff/events/${updated.id}`, { replace: true });
        setSaved(form);
        setJustSaved(true);
      },
      onError: setProblem,
    });
  };

  const doPublish = () => {
    setProblem(null);
    if (!event) return;
    if (event.ingredientIds.length === 0) return setProblem(t.errorMenuEmpty);
    if (new Date(event.ordersCloseAt) <= new Date()) return setProblem(t.errorDeadlinePassed);
    publish.mutate(undefined, { onSuccess: remember, onError: setProblem });
  };

  const message =
    problem === null ? null : typeof problem === "string" ? problem : errorMessage(problem, a);

  return (
    <>
      <form onSubmit={submit} className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {event ? event.name : t.newEventTitle}
          </h1>
          {event && (
            <div className="flex flex-wrap items-center gap-3">
              <PhasePill phase={event.phase} />
              {event.status !== "draft" && (
                <Link
                  to={`/staff/events/${event.id}/orders`}
                  className="inline-flex min-h-10 items-center rounded-xl bg-cream-100 px-3 text-sm font-bold text-crust-950 hover:bg-white"
                >
                  {t.ordersLink(event.guests.ordered)}
                </Link>
              )}
            </div>
          )}
        </div>
        {frozen && (
          <p className="rounded-2xl bg-white/5 px-4 py-3 text-cream-300/80">{t.cancelledNote}</p>
        )}

        <fieldset disabled={frozen || busy} className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="details" className={`${cardClass} space-y-4`}>
            <h2 id="details" className="text-lg font-bold">
              {t.details}
            </h2>
            <Labeled id="name" label={t.eventName}>
              <input
                id="name"
                required
                maxLength={80}
                placeholder={t.eventNamePlaceholder}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </Labeled>
            <div className="grid grid-cols-2 gap-3">
              <Labeled id="date" label={t.date}>
                <input
                  id="date"
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                  className={inputClass}
                />
              </Labeled>
              <Labeled id="start" label={t.startTime}>
                <input
                  id="start"
                  type="time"
                  required
                  value={form.startTime}
                  onChange={(e) => set("startTime", e.target.value)}
                  className={inputClass}
                />
              </Labeled>
            </div>
            <Labeled id="location" label={t.location}>
              <input
                id="location"
                required
                maxLength={120}
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                className={inputClass}
              />
            </Labeled>
            <div className="grid grid-cols-2 gap-3">
              <Labeled id="close-date" label={t.ordersCloseDate}>
                <input
                  id="close-date"
                  type="date"
                  required
                  value={form.closeDate}
                  onChange={(e) => set("closeDate", e.target.value)}
                  className={inputClass}
                />
              </Labeled>
              <Labeled id="close-time" label={t.ordersCloseTime}>
                <input
                  id="close-time"
                  type="time"
                  required
                  value={form.closeTime}
                  onChange={(e) => set("closeTime", e.target.value)}
                  className={inputClass}
                />
              </Labeled>
            </div>
            <Labeled id="max" label={t.maxToppings} hint={t.maxToppingsHint}>
              <input
                id="max"
                type="number"
                inputMode="numeric"
                min={1}
                max={30}
                value={form.maxToppings}
                onChange={(e) => set("maxToppings", e.target.value)}
                className={`${inputClass} max-w-32`}
              />
            </Labeled>
            <Labeled id="note-en" label={t.noteEn}>
              <textarea
                id="note-en"
                rows={2}
                maxLength={500}
                value={form.noteEn}
                onChange={(e) => set("noteEn", e.target.value)}
                className={`${inputClass} resize-y`}
              />
            </Labeled>
            <Labeled id="note-sv" label={t.noteSv} hint={t.noteHint}>
              <textarea
                id="note-sv"
                rows={2}
                maxLength={500}
                value={form.noteSv}
                onChange={(e) => set("noteSv", e.target.value)}
                className={`${inputClass} resize-y`}
              />
            </Labeled>
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={form.askMakeOwn}
                onChange={(e) => set("askMakeOwn", e.target.checked)}
                className="size-5 accent-cheese-400"
              />
              {t.askMakeOwn}
            </label>
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={form.askSmallerThicker}
                onChange={(e) => set("askSmallerThicker", e.target.checked)}
                className="size-5 accent-cheese-400"
              />
              {t.askSmallerThicker}
            </label>
          </section>

          <MenuPicker
            groups={groups}
            ingredients={ingredients}
            menu={form.menu}
            onChange={(menu) => set("menu", menu)}
          />
        </fieldset>

        {!frozen && (
          <div className={`${cardClass} space-y-3`}>
            <Feedback error={message} success={justSaved && !dirty ? t.saved : null} />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={busy || (event && !dirty)}>
                {event ? t.saveChanges : t.createDraft}
              </Button>
              {event?.status === "draft" && (
                <Button variant="ghost" onClick={doPublish} disabled={busy || dirty}>
                  {t.publish}
                </Button>
              )}
              {event && (
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {confirming ? (
                    <>
                      <span className="text-sm text-cream-300/80">
                        {confirming === "cancel" ? t.confirmCancel : t.confirmDelete}
                      </span>
                      <button
                        type="button"
                        className={`${smallButtonClass} text-sauce-400`}
                        disabled={busy}
                        onClick={() =>
                          confirming === "cancel"
                            ? cancel.mutate(undefined, {
                                onSuccess: (updated) => {
                                  remember(updated);
                                  setConfirming(null);
                                },
                                onError: setProblem,
                              })
                            : remove.mutate(undefined, {
                                onSuccess: () => navigate("/staff/events", { replace: true }),
                                onError: setProblem,
                              })
                        }
                      >
                        {confirming === "cancel" ? t.confirmCancelYes : t.confirmDeleteYes}
                      </button>
                      <button
                        type="button"
                        className={smallButtonClass}
                        onClick={() => setConfirming(null)}
                      >
                        {t.keep}
                      </button>
                    </>
                  ) : (
                    <>
                      {event.status === "draft" && (
                        <button
                          type="button"
                          className={smallButtonClass}
                          onClick={() => setConfirming("delete")}
                        >
                          {t.deleteDraft}
                        </button>
                      )}
                      <button
                        type="button"
                        className={smallButtonClass}
                        onClick={() => setConfirming("cancel")}
                      >
                        {t.cancelEvent}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            {event?.status === "draft" && (
              <p className="text-sm text-cream-300/60">
                {dirty ? t.unsavedBeforePublish : t.publishHint}
              </p>
            )}
          </div>
        )}
      </form>
      {event && event.status !== "draft" && <GuestsSection event={event} />}
    </>
  );
}

function Labeled({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {hint && <p className="text-sm text-cream-300/60">{hint}</p>}
    </div>
  );
}

function MenuPicker({
  groups,
  ingredients,
  menu,
  onChange,
}: {
  groups: IngredientGroup[];
  ingredients: Ingredient[];
  menu: string[];
  onChange: (menu: string[]) => void;
}) {
  const t = useStaffText();
  const { language } = useLanguage();
  const chosen = new Set(menu);
  const offered = ingredients.filter((i) => chosen.has(i.id)).length;
  const toggle = (id: string, on: boolean) =>
    onChange(on ? [...menu, id] : menu.filter((other) => other !== id));

  return (
    <section aria-labelledby="menu" className={`${cardClass} space-y-4`}>
      <div>
        <h2 id="menu" className="text-lg font-bold">
          {t.menuTitle}
        </h2>
        <p className="text-sm text-cream-300/70">{t.menuCount(offered, ingredients.length)}</p>
      </div>
      {ingredients.length === 0 ? (
        <p className="text-cream-300/80">
          {t.noIngredients}{" "}
          <Link to="/staff/ingredients" className="font-semibold text-cheese-300 hover:underline">
            {t.addIngredients}
          </Link>
        </p>
      ) : (
        groups.map((group) => {
          const items = ingredients.filter((i) => i.groupId === group.id);
          if (items.length === 0) return null;
          return (
            <fieldset key={group.id}>
              <legend className="mb-1 text-xs font-semibold tracking-widest text-cream-300/70 uppercase">
                {group.name[language]}
              </legend>
              <ul>
                {items.map((ingredient) => (
                  <li key={ingredient.id} className="border-t border-white/5 first:border-t-0">
                    <label className="flex min-h-11 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={chosen.has(ingredient.id)}
                        onChange={(e) => toggle(ingredient.id, e.target.checked)}
                        className="size-5 accent-cheese-400"
                      />
                      <span className="flex-1">{ingredient.name[language]}</span>
                      {!ingredient.inStock && <Pill tone="warn">{t.outOfStock}</Pill>}
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          );
        })
      )}
    </section>
  );
}
