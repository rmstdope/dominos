import type { ApiError, ApiErrorCode } from "@dominos/shared";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { z } from "zod";

/** Thrown from any handler; the app turns it into an ApiError body with this status. */
export class ApiHttpError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: ApiErrorCode;

  constructor(status: ContentfulStatusCode, code: ApiErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function errorBody(code: ApiErrorCode, message: string): ApiError {
  return { error: { code, message } };
}

/** Parses a JSON body against `schema`. Anything but JSON is refused, which also blocks CSRF. */
export async function readJson<T extends z.ZodType>(c: Context, schema: T): Promise<z.output<T>> {
  const type = c.req.header("content-type") ?? "";
  if (!/^application\/json\b/i.test(type)) {
    throw new ApiHttpError(415 as ContentfulStatusCode, "validation_failed", "Send a JSON body.");
  }
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ApiHttpError(400, "validation_failed", "The body is not valid JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".") || "body").join(", ");
    throw new ApiHttpError(400, "validation_failed", `Invalid fields: ${fields}`);
  }
  return parsed.data;
}
