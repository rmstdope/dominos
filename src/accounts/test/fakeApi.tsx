import type { ApiErrorCode, Me } from "@dominos/shared";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import { LanguageProvider } from "../../i18n/LanguageContext";
import type { Language } from "../../i18n/translations";
import { AccountsRoutes } from "../AccountsApp";
import { SessionProvider } from "../SessionProvider";

type Reply = { status: number; body?: unknown };
type Handler = Reply | ((body: unknown) => Reply);

export const ok = (body?: unknown): Reply => ({ status: body === undefined ? 204 : 200, body });
export const fail = (status: number, code: ApiErrorCode): Reply => ({
  status,
  body: { error: { code, message: code } },
});

export const anna: Me = {
  id: "8f14e45f-ceea-467a-9575-1f2a3b4c5d6e",
  email: "anna@example.com",
  name: "Anna",
  role: "customer",
  language: "en",
};

/**
 * Replaces fetch with answers keyed by "METHOD /path". GET /api/me answers 401 unless given.
 * Returns the requests made, bodies parsed.
 */
export function fakeApi(routes: Record<string, Handler>) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  const handlers: Record<string, Handler> = { "GET /api/me": fail(401, "unauthorized"), ...routes };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const method = init.method ?? "GET";
      const body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
      calls.push({ method, path: input, body });
      const handler = handlers[`${method} ${input}`];
      if (!handler) throw new TypeError(`fakeApi: no answer for ${method} ${input}`);
      const reply = typeof handler === "function" ? handler(body) : handler;
      return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
        status: reply.status,
        headers: { "content-type": "application/json" },
      });
    }),
  );
  return calls;
}

/** The accounts app at `path`, e.g. "/invitation#token". */
export function renderAccounts(path: string, language: Language = "en") {
  return render(
    <LanguageProvider initial={language}>
      <SessionProvider>
        <MemoryRouter initialEntries={[path]}>
          <AccountsRoutes />
        </MemoryRouter>
      </SessionProvider>
    </LanguageProvider>,
  );
}
