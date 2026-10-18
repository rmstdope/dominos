import { LANGUAGES, type Language, type Me, type UpdateMe } from "@dominos/shared";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Button } from "../../components/Button";
import { useLanguage } from "../../i18n/useLanguage";
import { LANGUAGE_LABELS } from "../../i18n/translations";
import { ApiRequestError } from "../api";
import { Feedback, Loaded, inputClass, labelClass } from "../staff/ui";
import { errorMessage, useAccountsText } from "../text";
import { useSession } from "../useSession";
import { changePassword, updateMe, useFavourite, useSetFavourite } from "./api";
import { GuestLayout } from "./GuestLayout";
import { useGuestText } from "./text";

const card = "rounded-3xl bg-crust-900/70 p-5 ring-1 ring-white/10 space-y-4";
const sectionTitle = "text-xs font-semibold tracking-widest text-cream-300/70 uppercase";

export function ProfilePage({ me }: { me: Me }) {
  const t = useGuestText();
  const { signOut } = useSession();
  return (
    <GuestLayout me={me}>
      <div className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-full bg-crust-700 text-2xl font-extrabold text-cheese-300"
        >
          {me.name.trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold tracking-tight">{me.name}</h1>
          <p className="truncate text-cream-300/70">{me.email}</p>
        </div>
      </div>
      <div className="mt-6 space-y-5">
        <FavouriteCard />
        <AccountCard me={me} />
        <RemindersCard me={me} />
        <PasswordCard />
        <Button variant="ghost" className="w-full" onClick={() => void signOut()}>
          {t.signOut}
        </Button>
      </div>
    </GuestLayout>
  );
}

/** Saves a change to the signed-in person and updates the session with the answer. */
function useUpdateMe() {
  const { signedIn } = useSession();
  return useMutation({ mutationFn: (body: UpdateMe) => updateMe(body), onSuccess: signedIn });
}

function FavouriteCard() {
  const t = useGuestText();
  const a = useAccountsText();
  const { language } = useLanguage();
  const favourite = useFavourite();
  const clear = useSetFavourite();
  return (
    <section aria-labelledby="favourite" className={card}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="favourite" className={sectionTitle}>
          {t.favouriteTitle}
        </h2>
        {favourite.data && favourite.data.ingredients.length > 0 && (
          <button
            type="button"
            disabled={clear.isPending}
            onClick={() => clear.mutate([])}
            className="min-h-10 text-sm font-semibold text-cheese-300 hover:underline"
          >
            {t.clearFavourite}
          </button>
        )}
      </div>
      <Loaded query={favourite}>
        {({ ingredients }) =>
          ingredients.length ? (
            <>
              <ul className="flex flex-wrap gap-1.5">
                {ingredients.map((i) => (
                  <li
                    key={i.id}
                    className="rounded-full bg-cheese-400/15 px-3 py-1 text-sm font-semibold text-cheese-300"
                  >
                    {i.name[language]}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-cream-300/70">{t.favouriteHint}</p>
            </>
          ) : (
            <p className="text-sm text-cream-300/70">{t.noFavourite}</p>
          )
        }
      </Loaded>
      <Feedback error={clear.isError ? errorMessage(clear.error, a) : null} />
    </section>
  );
}

function AccountCard({ me }: { me: Me }) {
  const t = useGuestText();
  const a = useAccountsText();
  const { setLanguage } = useLanguage();
  const update = useUpdateMe();
  const [name, setName] = useState(me.name);

  const changeLanguage = (language: Language) => {
    setLanguage(language);
    update.mutate({ language });
  };

  return (
    <section aria-labelledby="account" className={card}>
      <h2 id="account" className={sectionTitle}>
        {t.accountTitle}
      </h2>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          update.mutate({ name });
        }}
        className="space-y-1.5"
      >
        <label htmlFor="profile-name" className={labelClass}>
          {t.yourName}
        </label>
        <div className="flex gap-2">
          <input
            id="profile-name"
            required
            maxLength={80}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <Button
            type="submit"
            variant="ghost"
            disabled={update.isPending || name.trim() === me.name}
          >
            {t.save}
          </Button>
        </div>
      </form>
      <div className="space-y-1.5">
        <label htmlFor="profile-language" className={labelClass}>
          {t.language}
        </label>
        <select
          id="profile-language"
          value={me.language}
          onChange={(e) => changeLanguage(e.target.value as Language)}
          className={inputClass}
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {LANGUAGE_LABELS[l]}
            </option>
          ))}
        </select>
      </div>
      <p className="text-sm text-cream-300/70">{t.emailFixed}</p>
      <Feedback
        error={update.isError ? errorMessage(update.error, a) : null}
        success={update.isSuccess ? t.saved : null}
      />
    </section>
  );
}

function RemindersCard({ me }: { me: Me }) {
  const t = useGuestText();
  const a = useAccountsText();
  const update = useUpdateMe();
  const toggles = [
    { key: "beforeClose", label: t.remindBeforeClose },
    { key: "dayBefore", label: t.remindDayBefore },
  ] as const;
  return (
    <section aria-labelledby="emails" className={card}>
      <h2 id="emails" className={sectionTitle}>
        {t.emailTitle}
      </h2>
      <ul className="divide-y divide-white/10">
        {toggles.map(({ key, label }) => (
          <li key={key}>
            <label className="flex min-h-12 items-center justify-between gap-4">
              {label}
              <input
                type="checkbox"
                role="switch"
                checked={
                  (update.isPending ? update.variables.reminders?.[key] : undefined) ??
                  me.reminders[key]
                }
                disabled={update.isPending}
                onChange={(e) => update.mutate({ reminders: { [key]: e.target.checked } })}
                className="size-6 shrink-0 accent-cheese-400"
              />
            </label>
          </li>
        ))}
      </ul>
      <p className="text-sm text-cream-300/70">{t.invitationsAlways}</p>
      <Feedback error={update.isError ? errorMessage(update.error, a) : null} />
    </section>
  );
}

function PasswordCard() {
  const t = useGuestText();
  const a = useAccountsText();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const change = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setCurrent("");
      setNew("");
    },
  });
  const error = !change.isError
    ? null
    : change.error instanceof ApiRequestError && change.error.code === "invalid_credentials"
      ? t.wrongPassword
      : errorMessage(change.error, a);

  return (
    <form
      aria-labelledby="password"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        change.mutate({ currentPassword, newPassword });
      }}
      className={card}
    >
      <h2 id="password" className={sectionTitle}>
        {t.passwordTitle}
      </h2>
      <div className="space-y-1.5">
        <label htmlFor="current-password" className={labelClass}>
          {t.currentPassword}
        </label>
        <input
          id="current-password"
          type="password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrent(e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="new-password" className={labelClass}>
          {t.newPassword}
        </label>
        <input
          id="new-password"
          type="password"
          required
          minLength={8}
          maxLength={200}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNew(e.target.value)}
          className={inputClass}
        />
        <p className="text-sm text-cream-300/60">{t.passwordHint}</p>
      </div>
      <Feedback error={error} success={change.isSuccess ? t.passwordChanged : null} />
      <Button type="submit" variant="ghost" className="w-full" disabled={change.isPending}>
        {t.savePassword}
      </Button>
    </form>
  );
}
