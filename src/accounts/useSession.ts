import type { Me } from "@dominos/shared";
import { createContext, useContext } from "react";

export type SessionState =
  { status: "loading" } | { status: "failed" } | { status: "ready"; me: Me | null };

export type SessionValue = {
  state: SessionState;
  /** Call with the user a sign-in returned. */
  signedIn: (me: Me) => void;
  signOut: () => Promise<void>;
  retry: () => void;
};

export const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside a SessionProvider");
  return value;
}
