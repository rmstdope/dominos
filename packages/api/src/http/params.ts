import type { Context } from "hono";
import { z } from "zod";
import { ApiHttpError } from "./errors.ts";

const uuid = z.uuid();

/** A path parameter that must be an id. Anything else cannot exist, so it is a 404. */
export function idParam(c: Context, name = "id"): string {
  const value = c.req.param(name);
  if (!uuid.safeParse(value).success) throw notFound();
  return value as string;
}

export const notFound = (what = "That") =>
  new ApiHttpError(404, "not_found", `${what} does not exist.`);

export const conflict = (message: string) => new ApiHttpError(409, "conflict", message);
