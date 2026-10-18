import type { Me } from "@dominos/shared";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import { SessionContext, type SessionState } from "./useSession";

/** Asks the API who is signed in, once, and keeps the answer for every screen. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api.me().then(
      (me) => !cancelled && setState({ status: "ready", me }),
      () => !cancelled && setState({ status: "failed" }),
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const signedIn = useCallback((me: Me) => setState({ status: "ready", me }), []);
  const signOut = useCallback(async () => {
    await api.logout();
    setState({ status: "ready", me: null });
  }, []);
  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  return (
    <SessionContext.Provider value={{ state, signedIn, signOut, retry }}>
      {children}
    </SessionContext.Provider>
  );
}
