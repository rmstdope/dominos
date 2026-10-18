import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { Button } from "../components/Button";
import { LanguageProvider } from "../i18n/LanguageContext";
import { AuthLayout } from "./components";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { HomePage } from "./pages/HomePage";
import { InvitationPage } from "./pages/InvitationPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { SignInPage } from "./pages/SignInPage";
import { SessionProvider } from "./SessionProvider";
import { useSession } from "./useSession";
import { useAccountsText } from "./text";

/** The app with accounts. Built only with VITE_ACCOUNTS=true until it replaces the WhatsApp app. */
export function AccountsApp() {
  return (
    <LanguageProvider>
      <SessionProvider>
        <BrowserRouter>
          <AccountsRoutes />
        </BrowserRouter>
      </SessionProvider>
    </LanguageProvider>
  );
}

export function AccountsRoutes() {
  const t = useAccountsText();
  const { state, retry } = useSession();

  if (state.status === "loading") {
    return (
      <p role="status" className="sr-only">
        {t.loading}
      </p>
    );
  }
  if (state.status === "failed") {
    return (
      <AuthLayout title={t.serverDownTitle} subtitle={t.errorNetwork}>
        <Button className="w-full" onClick={retry}>
          {t.tryAgain}
        </Button>
      </AuthLayout>
    );
  }

  const { me } = state;
  return (
    <Routes>
      <Route path="/" element={me ? <HomePage me={me} /> : <Navigate to="/sign-in" replace />} />
      <Route path="/sign-in" element={me ? <Navigate to="/" replace /> : <SignInPage />} />
      <Route path="/invitation" element={<InvitationPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
