import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Button } from "../../components/Button";
import { api } from "../api";
import { AuthLayout, Field, FormError, linkClass } from "../components";
import { errorMessage, useAccountsText } from "../text";

export function ForgotPasswordPage() {
  const t = useAccountsText();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const back = (
    <Link to="/sign-in" className={`text-sm ${linkClass}`}>
      ← {t.backToSignIn}
    </Link>
  );
  const footer = <p className="text-sm text-cream-300/60">{t.neverInvited}</p>;

  if (sentTo) {
    return (
      <AuthLayout title={t.checkEmailTitle} subtitle={t.checkEmailBody(sentTo)} footer={footer}>
        <div className="space-y-6">
          <Button variant="ghost" className="w-full" onClick={() => setSentTo(null)}>
            {t.differentEmail}
          </Button>
          {back}
        </div>
      </AuthLayout>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.forgotPassword(email);
      setSentTo(email.trim());
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title={t.forgotTitle} subtitle={t.forgotSubtitle} footer={footer}>
      <form onSubmit={submit} className="space-y-4">
        <Field
          id="email"
          label={t.email}
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder={t.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FormError message={error === null ? null : errorMessage(error, t)} />
        <Button type="submit" className="w-full" disabled={busy}>
          {t.sendResetLink}
        </Button>
        {back}
      </form>
    </AuthLayout>
  );
}
