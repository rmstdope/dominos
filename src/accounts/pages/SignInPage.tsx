import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "../../components/Button";
import { api } from "../api";
import { AuthLayout, Field, FormError, Note, linkClass } from "../components";
import { useSession } from "../useSession";
import { errorMessage, useAccountsText } from "../text";

export function SignInPage() {
  const t = useAccountsText();
  const { signedIn } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      signedIn(await api.login({ email, password }));
      navigate("/", { replace: true });
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={t.signInTitle}
      subtitle={t.signInSubtitle}
      footer={<Note title={t.noAccountTitle}>{t.noAccountBody}</Note>}
    >
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
        <Field
          id="password"
          label={t.password}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aside={
            <Link to="/forgot-password" className={`text-sm ${linkClass}`}>
              {t.forgotPassword}
            </Link>
          }
        />
        <FormError message={error === null ? null : errorMessage(error, t)} />
        <Button type="submit" className="w-full" disabled={busy}>
          {t.signIn}
        </Button>
      </form>
    </AuthLayout>
  );
}
