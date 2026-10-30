import type { InvitationInfo } from "@dominos/shared";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "../../components/Button";
import { ApiRequestError, api } from "../api";
import { AuthLayout, Field, FormError, linkClass } from "../components";
import { useLanguage } from "../../i18n/useLanguage";
import { formatWhen } from "../dates";
import { useSession } from "../useSession";
import { PASSWORD_TOO_SHORT, errorMessage, useAccountsText } from "../text";
import { useFragmentToken } from "../useFragmentToken";

type Invitation =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "failed"; error: unknown }
  | { status: "ready"; info: InvitationInfo };

const isInvalid = (err: unknown) => err instanceof ApiRequestError && err.code === "invalid_token";

export function InvitationPage() {
  const t = useAccountsText();
  const token = useFragmentToken();
  const [invitation, setInvitation] = useState<Invitation>(
    token ? { status: "loading" } : { status: "invalid" },
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api.invitation(token).then(
      (info) => !cancelled && setInvitation({ status: "ready", info }),
      (err: unknown) =>
        !cancelled &&
        setInvitation(isInvalid(err) ? { status: "invalid" } : { status: "failed", error: err }),
    );
    return () => {
      cancelled = true;
    };
  }, [token, attempt]);

  switch (invitation.status) {
    case "loading":
      return <AuthLayout title={t.invitationTitle} subtitle={t.loading} />;
    case "invalid":
      return <InvalidInvitation />;
    case "failed":
      return (
        <AuthLayout title={t.serverDownTitle} subtitle={errorMessage(invitation.error, t)}>
          <Button
            className="w-full"
            onClick={() => {
              setInvitation({ status: "loading" });
              setAttempt((n) => n + 1);
            }}
          >
            {t.tryAgain}
          </Button>
        </AuthLayout>
      );
    case "ready":
      return (
        <AcceptForm
          token={token}
          info={invitation.info}
          onInvalid={() => setInvitation({ status: "invalid" })}
        />
      );
  }
}

function AcceptForm({
  token,
  info,
  onInvalid,
}: {
  token: string;
  info: InvitationInfo;
  onInvalid: () => void;
}) {
  const t = useAccountsText();
  const { signedIn } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState(info.name);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setError(PASSWORD_TOO_SHORT);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      signedIn(await api.acceptInvitation(token, { name, password }));
      // Straight to the event they were invited to, to pick toppings.
      navigate(info.event ? `/events/${info.event.id}` : "/", { replace: true });
    } catch (err) {
      if (isInvalid(err)) return onInvalid();
      setError(err);
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={t.invitationTitle}
      subtitle={t.invitationSubtitle}
      footer={
        <p className="text-sm text-cream-300/60">
          {t.invitationNote}{" "}
          <span className="whitespace-nowrap">
            {t.haveAccount}{" "}
            <Link to="/sign-in" className={linkClass}>
              {t.backToSignIn}
            </Link>
          </span>
        </p>
      }
    >
      {info.event && <InvitedTo event={info.event} />}
      <form onSubmit={submit} className="space-y-4">
        <Field
          id="email"
          label={t.email}
          type="email"
          readOnly
          value={info.email}
          hint={t.emailFromInvitation}
        />
        <Field
          id="name"
          label={t.yourName}
          autoComplete="name"
          autoCapitalize="words"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          id="password"
          label={t.choosePassword}
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={200}
          hint={t.passwordHint}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FormError message={error === null ? null : errorMessage(error, t)} />
        <Button type="submit" className="w-full" disabled={busy}>
          {t.join}
          <span aria-hidden="true">→</span>
        </Button>
      </form>
    </AuthLayout>
  );
}

function InvitedTo({ event }: { event: NonNullable<InvitationInfo["event"]> }) {
  const t = useAccountsText();
  const { language } = useLanguage();
  return (
    <section
      aria-label={event.name[language]}
      className="mb-6 rounded-3xl bg-cheese-400 p-5 text-crust-950"
    >
      <p className="text-sm font-bold tracking-wide uppercase">{t.invitedTo}</p>
      <h2 className="mt-1 text-2xl leading-tight font-extrabold">{event.name[language]}</h2>
      <p className="mt-1">
        {formatWhen(event.startsAt, language)} · {event.location[language]}
      </p>
    </section>
  );
}

function InvalidInvitation() {
  const t = useAccountsText();
  return (
    <AuthLayout title={t.invitationInvalidTitle} subtitle={t.invitationInvalidBody}>
      <Link to="/sign-in" className={linkClass}>
        {t.backToSignIn}
      </Link>
    </AuthLayout>
  );
}
