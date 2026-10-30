import { LANGUAGES, type EventGuest, type Language, type StaffEvent } from "@dominos/shared";
import { useState, type FormEvent } from "react";
import { Button } from "../../components/Button";
import { LANGUAGE_LABELS } from "../../i18n/translations";
import { useLanguage } from "../../i18n/useLanguage";
import { ApiRequestError } from "../api";
import { errorMessage, useAccountsText } from "../text";
import { keys, staffApi, useGuests, usePeople, useStaffMutation } from "./api";
import { useStaffText, type StaffText } from "./text";
import { Feedback, Loaded, Pill, cardClass, inputClass, labelClass, smallButtonClass } from "./ui";
import { shareMessage, whatsAppShareUrl } from "./whatsapp";

function guestPill(guest: EventGuest, t: StaffText) {
  if (guest.invitation === "declined") return <Pill tone="muted">{t.guestStatus.declined}</Pill>;
  if (guest.ordered) return <Pill tone="good">{t.guestStatus.ordered}</Pill>;
  if (guest.seen) return <Pill tone="warn">{t.guestStatus.seen}</Pill>;
  return <Pill tone="plain">{t.guestStatus.invited}</Pill>;
}

/** Who is invited to the event, and the form to invite more while orders are open. */
export function GuestsSection({ event }: { event: StaffEvent }) {
  const t = useStaffText();
  const { language } = useLanguage();
  const guests = useGuests(event.id);
  const { invited, ordered, declined } = event.guests;
  return (
    <section aria-labelledby="guests" className={`${cardClass} space-y-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="guests" className="text-lg font-bold">
            {t.guestsTitle}
          </h2>
          <p className="text-sm text-cream-300/70">{t.guestCounts(invited, ordered, declined)}</p>
        </div>
        {event.phase === "open" && (
          <div className="max-w-xs space-y-1 sm:text-right">
            <a
              href={whatsAppShareUrl(shareMessage(event, window.location.origin, language, t))}
              target="_blank"
              rel="noopener noreferrer"
              className={smallButtonClass}
            >
              {t.shareOnWhatsApp}
            </a>
            <p className="text-xs text-cream-300/60">{t.shareHint}</p>
          </div>
        )}
      </div>
      <Loaded query={guests}>
        {(list) => (
          <>
            {list.length === 0 ? (
              <p className="text-cream-300/70">{t.noGuests}</p>
            ) : (
              <ul className="divide-y divide-white/10">
                {list.map((guest) => (
                  <li
                    key={guest.userId}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{guest.name}</p>
                      <p className="text-sm text-cream-300/70">
                        {guest.email}
                        {guest.personStatus !== "active" && ` · ${t.noAccountYet}`}
                      </p>
                    </div>
                    {guestPill(guest, t)}
                  </li>
                ))}
              </ul>
            )}
            {event.phase === "open" ? (
              <InviteForm event={event} invited={new Set(list.map((g) => g.userId))} />
            ) : (
              <p className="text-sm text-cream-300/70">{t.invitesWhenOpen}</p>
            )}
          </>
        )}
      </Loaded>
    </section>
  );
}

function InviteForm({ event, invited }: { event: StaffEvent; invited: Set<string> }) {
  const t = useStaffText();
  const a = useAccountsText();
  const people = usePeople();
  const [picked, setPicked] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newLanguage, setNewLanguage] = useState<Language>("sv");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<number | null>(null);
  const invite = useStaffMutation(
    (body: Parameters<typeof staffApi.inviteToEvent>[1]) => staffApi.inviteToEvent(event.id, body),
    [keys.guests(event.id), keys.events, keys.people],
  );

  const someoneNew = newName.trim() !== "" || newEmail.trim() !== "";
  const count = picked.length + (someoneNew ? 1 : 0);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSent(null);
    invite.mutate(
      {
        userIds: picked,
        newPeople: someoneNew ? [{ name: newName, email: newEmail, language: newLanguage }] : [],
        message: message.trim() || undefined,
      },
      {
        onSuccess: () => {
          setSent(count);
          setPicked([]);
          setNewName("");
          setNewEmail("");
        },
      },
    );
  };

  const error = !invite.isError
    ? null
    : invite.error instanceof ApiRequestError && invite.error.status === 502
      ? t.errorInvitesNotSent
      : invite.error instanceof ApiRequestError && invite.error.code === "conflict"
        ? t.errorEventNotOpen
        : errorMessage(invite.error, a);

  return (
    <form onSubmit={submit} className="space-y-4 border-t border-white/10 pt-5">
      <h3 className="font-bold">{t.invitePeople}</h3>
      <Loaded query={people}>
        {(list) => {
          const candidates = list.filter((p) => !invited.has(p.id) && p.status !== "disabled");
          if (candidates.length === 0) {
            return <p className="text-sm text-cream-300/70">{t.everyoneInvited}</p>;
          }
          return (
            <fieldset>
              <legend className="sr-only">{t.invitePeople}</legend>
              <ul className="grid gap-x-4 sm:grid-cols-2">
                {candidates.map((person) => (
                  <li key={person.id}>
                    <label className="flex min-h-11 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={picked.includes(person.id)}
                        onChange={(e) =>
                          setPicked((p) =>
                            e.target.checked
                              ? [...p, person.id]
                              : p.filter((id) => id !== person.id),
                          )
                        }
                        className="size-5 accent-cheese-400"
                      />
                      <span className="min-w-0">
                        <span className="block truncate">{person.name}</span>
                        <span className="block truncate text-sm text-cream-300/60">
                          {person.email}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          );
        }}
      </Loaded>

      <fieldset className="space-y-2">
        <legend className={labelClass}>{t.someoneNew}</legend>
        <p className="text-sm text-cream-300/60">{t.someoneNewHint}</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_1.3fr_8rem]">
          <input
            aria-label={t.personName}
            placeholder={t.personNamePlaceholder}
            maxLength={80}
            required={someoneNew}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className={inputClass}
          />
          <input
            aria-label={t.email}
            type="email"
            placeholder="anna@example.com"
            required={someoneNew}
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className={inputClass}
          />
          <select
            aria-label={t.language}
            value={newLanguage}
            onChange={(e) => setNewLanguage(e.target.value as Language)}
            className={inputClass}
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {LANGUAGE_LABELS[l]}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="invite-message" className={labelClass}>
          {t.personalMessage}
        </label>
        <textarea
          id="invite-message"
          rows={2}
          maxLength={500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${inputClass} resize-y`}
        />
      </div>

      <Feedback error={error} success={sent ? t.invitesSent(sent) : null} />
      <Button type="submit" disabled={count === 0 || invite.isPending}>
        {t.sendInvites(count)}
      </Button>
    </form>
  );
}
