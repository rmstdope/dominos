import type {
  AcceptInvitationRequest,
  ApiError,
  ApiErrorCode,
  InvitationInfo,
  LoginRequest,
  Me,
} from "@dominos/shared";

/** A failed API call. `network` means the request never got an answer. */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode | "network";

  constructor(status: number, code: ApiErrorCode | "network", message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError(0, "network", "No answer from the server.");
  }
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const error = (data as ApiError | null)?.error;
    throw new ApiRequestError(
      res.status,
      error?.code ?? "internal",
      error?.message ?? res.statusText,
    );
  }
  return data as T;
}

export const api = {
  /** The signed-in user, or null when nobody is. */
  me: async (): Promise<Me | null> => {
    try {
      return await request<Me>("GET", "/api/me");
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) return null;
      throw err;
    }
  },
  login: (body: LoginRequest) => request<Me>("POST", "/api/auth/login", body),
  logout: () => request<void>("POST", "/api/auth/logout"),
  invitation: (token: string) =>
    request<InvitationInfo>("GET", `/api/auth/invitations/${encodeURIComponent(token)}`),
  acceptInvitation: (token: string, body: AcceptInvitationRequest) =>
    request<Me>("POST", `/api/auth/invitations/${encodeURIComponent(token)}`, body),
  forgotPassword: (email: string) => request<void>("POST", "/api/auth/forgot", { email }),
  resetPassword: (token: string, password: string) =>
    request<Me>("POST", "/api/auth/reset", { token, password }),
};
