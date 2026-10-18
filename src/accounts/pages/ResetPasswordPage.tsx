import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "../../components/Button";
import { ApiRequestError, api } from "../api";
import { AuthLayout, Field, FormError, linkClass } from "../components";
import { useSession } from "../useSession";
import { PASSWORD_TOO_SHORT, errorMessage, useAccountsText } from "../text";
import { useFragmentToken } from "../useFragmentToken";

export function ResetPasswordPage() {
  const t = useAccountsText();
  const token = useFragmentToken();
  const { signedIn } = useSession();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [invalid, setInvalid] = useState(!token);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  if (invalid) {
    return (
      <AuthLayout title={t.resetInvalidTitle} subtitle={t.resetInvalidBody}>
        <Link to="/forgot-password" className={linkClass}>
          {t.requestNewLink}
        </Link>
      </AuthLayout>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setError(PASSWORD_TOO_SHORT);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      signedIn(await api.resetPassword(token, password));
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "invalid_token") return setInvalid(true);
      setError(err);
      setBusy(false);
    }
  };

  return (
    <AuthLayout title={t.resetTitle} subtitle={t.resetSubtitle}>
      <form onSubmit={submit} className="space-y-4">
        <Field
          id="password"
          label={t.newPassword}
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
          {t.savePassword}
        </Button>
      </form>
    </AuthLayout>
  );
}
