import {
  LANGUAGES,
  ROLES,
  type Language,
  type Me,
  type Person,
  type PersonStatus,
  type Role,
} from "@dominos/shared";
import { useState, type FormEvent } from "react";
import { Button } from "../../components/Button";
import { LANGUAGE_LABELS } from "../../i18n/translations";
import { ApiRequestError } from "../api";
import { errorMessage, useAccountsText } from "../text";
import { useSession } from "../useSession";
import { keys, staffApi, usePeople, useStaffMutation } from "./api";
import { useStaffText, type StaffText } from "./text";
import {
  Feedback,
  Loaded,
  PageHeader,
  Pill,
  cardClass,
  inputClass,
  labelClass,
  textButtonClass,
} from "./ui";

const changesPeople = [keys.people] as const;

const statusTone = {
  active: "good",
  invited: "warn",
  invitation_expired: "plain",
  disabled: "muted",
} as const satisfies Record<PersonStatus, string>;

const isConflict = (err: unknown) => err instanceof ApiRequestError && err.code === "conflict";

export function PeoplePage({ me }: { me: Me }) {
  const t = useStaffText();
  const people = usePeople();
  return (
    <div className="space-y-8">
      <PageHeader title={t.peopleTitle} subtitle={t.peopleSubtitle} />
      <InviteForm />
      <Loaded query={people}>
        {(list) => (
          <div className="overflow-x-auto rounded-2xl ring-1 ring-white/10">
            <table className="w-full min-w-[40rem] border-collapse text-left text-[15px]">
              <thead className="text-xs tracking-wider text-cream-300/70 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t.personName}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t.role}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t.colStatus}
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">{t.colStatus}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((person) => (
                  <PersonRow key={person.id} person={person} isMe={person.id === me.id} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Loaded>
      <p className="text-sm text-cream-300/70">{t.staffRule}</p>
    </div>
  );
}

function inviteError(
  err: unknown,
  email: string,
  t: StaffText,
  a: ReturnType<typeof useAccountsText>,
) {
  if (isConflict(err)) return t.errorAlreadyMember(email);
  if (err instanceof ApiRequestError && err.status === 502) return t.errorEmailNotSent;
  return errorMessage(err, a);
}

function InviteForm() {
  const t = useStaffText();
  const a = useAccountsText();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("customer");
  const [language, setLanguage] = useState<Language>("sv");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const invite = useStaffMutation(staffApi.invitePerson, changesPeople);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSentTo(null);
    invite.mutate(
      { name, email, role, language },
      {
        onSuccess: (person) => {
          setSentTo(person.email);
          setName("");
          setEmail("");
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className={`${cardClass} space-y-3`}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.4fr_9rem_9rem_auto] lg:items-end">
        <div className="space-y-1.5">
          <label htmlFor="invite-name" className={labelClass}>
            {t.personName}
          </label>
          <input
            id="invite-name"
            required
            maxLength={80}
            autoComplete="off"
            placeholder={t.personNamePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="invite-email" className={labelClass}>
            {t.email}
          </label>
          <input
            id="invite-email"
            type="email"
            required
            autoComplete="off"
            placeholder="anna@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="invite-role" className={labelClass}>
            {t.role}
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className={inputClass}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t.roleName[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="invite-language" className={labelClass}>
            {t.language}
          </label>
          <select
            id="invite-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className={inputClass}
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {LANGUAGE_LABELS[l]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={invite.isPending}>
          {t.sendInvitation}
        </Button>
      </div>
      <Feedback
        error={invite.isError ? inviteError(invite.error, email.trim(), t, a) : null}
        success={sentTo ? t.invitationSent(sentTo) : null}
      />
    </form>
  );
}

function PersonRow({ person, isMe }: { person: Person; isMe: boolean }) {
  const t = useStaffText();
  const a = useAccountsText();
  const { retry } = useSession();
  const change = useStaffMutation(
    (body: Parameters<typeof staffApi.updatePerson>[1]) => staffApi.updatePerson(person.id, body),
    changesPeople,
  );
  // Demoting or disabling yourself changes what you may see, so ask the API who you are again.
  const update = {
    ...change,
    mutate: (body: Parameters<typeof staffApi.updatePerson>[1]) =>
      change.mutate(body, { onSuccess: () => isMe && retry() }),
  };
  const resend = useStaffMutation(() => staffApi.resendInvitation(person.id), changesPeople);
  const failed = update.error ?? resend.error;
  const error =
    failed === null
      ? null
      : update.error && isConflict(update.error)
        ? t.errorLastStaff
        : resend.error instanceof ApiRequestError && resend.error.status === 502
          ? t.errorEmailNotSent
          : errorMessage(failed, a);
  const busy = update.isPending || resend.isPending;
  const canResend = person.status === "invited" || person.status === "invitation_expired";

  return (
    <tr className="border-t border-white/10 align-top">
      <td className="px-4 py-3">
        <div className="font-semibold">
          {person.name}
          {isMe && <span className="font-normal text-cream-300/60"> ({t.you})</span>}
        </div>
        <div className="text-sm text-cream-300/70">{person.email}</div>
        <Feedback error={error} success={resend.isSuccess ? t.resent : null} />
      </td>
      <td className="px-4 py-3">
        <select
          aria-label={t.roleFor(person.name)}
          value={person.role}
          disabled={busy}
          onChange={(e) => update.mutate({ role: e.target.value as Role })}
          className={`${inputClass} w-36 py-2 text-sm`}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {t.roleName[r]}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <Pill tone={statusTone[person.status]}>{t.status[person.status]}</Pill>
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        {canResend && (
          <button
            type="button"
            className={textButtonClass}
            disabled={busy}
            onClick={() => resend.mutate(undefined)}
          >
            {t.resend}
          </button>
        )}
        <button
          type="button"
          className={textButtonClass}
          disabled={busy}
          onClick={() => update.mutate({ disabled: person.status !== "disabled" })}
        >
          {person.status === "disabled" ? t.enable : t.disable}
        </button>
      </td>
    </tr>
  );
}
