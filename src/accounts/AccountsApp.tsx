import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { Button } from "../components/Button";
import { LanguageProvider } from "../i18n/LanguageContext";
import { AuthLayout } from "./components";
import { GuestEventPage } from "./guest/GuestEventPage";
import { GuestEventsPage } from "./guest/GuestEventsPage";
import { ProfilePage } from "./guest/ProfilePage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { InvitationPage } from "./pages/InvitationPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { SignInPage } from "./pages/SignInPage";
import { SessionProvider } from "./SessionProvider";
import { EventEditorPage } from "./staff/EventEditorPage";
import { EventsPage } from "./staff/EventsPage";
import { IngredientsPage } from "./staff/IngredientsPage";
import { OrdersPage } from "./staff/OrdersPage";
import { PeoplePage } from "./staff/PeoplePage";
import { StaffLayout } from "./staff/StaffLayout";
import { useAccountsText } from "./text";
import { useSession } from "./useSession";

/** The app with accounts. Built only with VITE_ACCOUNTS=true until it replaces the WhatsApp app. */
export function AccountsApp() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <BrowserRouter>
            <AccountsRoutes />
          </BrowserRouter>
        </SessionProvider>
      </QueryClientProvider>
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
  const staff = me?.role === "staff" ? me : null;
  return (
    <Routes>
      <Route
        path="/"
        element={me ? <GuestEventsPage me={me} /> : <Navigate to="/sign-in" replace />}
      />
      <Route
        path="/events/:id"
        element={me ? <GuestEventPage me={me} /> : <Navigate to="/sign-in" replace />}
      />
      <Route
        path="/profile"
        element={me ? <ProfilePage me={me} /> : <Navigate to="/sign-in" replace />}
      />
      <Route path="/sign-in" element={me ? <Navigate to="/" replace /> : <SignInPage />} />
      <Route path="/invitation" element={<InvitationPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/staff"
        element={staff ? <StaffLayout me={staff} /> : <Navigate to="/" replace />}
      >
        <Route index element={<Navigate to="events" replace />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="events/new" element={<EventEditorPage />} />
        <Route path="events/:id" element={<EventEditorPage />} />
        <Route path="events/:id/orders" element={<OrdersPage />} />
        <Route path="ingredients" element={<IngredientsPage />} />
        <Route path="people" element={staff && <PeoplePage me={staff} />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
