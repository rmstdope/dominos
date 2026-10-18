import type { MiddlewareHandler } from "hono";
import { ApiHttpError } from "./errors.ts";

type Window = { count: number; resetAt: number };

/**
 * A fixed-window counter kept in memory. Enough for one API process on one server; it resets on
 * restart, which only ever loosens it.
 */
export class RateLimiter {
  private readonly windows = new Map<string, Window>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly now: () => number;

  constructor(limit: number, windowMs: number, now: () => number = Date.now) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
  }

  /** Counts one attempt for `key`; false once the key is over the limit for this window. */
  take(key: string): boolean {
    const now = this.now();
    let window = this.windows.get(key);
    if (!window || window.resetAt <= now) {
      if (this.windows.size > 10_000) this.sweep(now);
      window = { count: 0, resetAt: now + this.windowMs };
      this.windows.set(key, window);
    }
    window.count += 1;
    return window.count <= this.limit;
  }

  private sweep(now: number) {
    for (const [key, window] of this.windows) if (window.resetAt <= now) this.windows.delete(key);
  }
}

export function rateLimit(
  limiter: RateLimiter,
  key: (clientIp: string) => string,
): MiddlewareHandler {
  return async (c, next) => {
    if (!limiter.take(key(c.get("clientIp")))) {
      throw new ApiHttpError(429, "rate_limited", "Too many attempts. Try again in a few minutes.");
    }
    await next();
  };
}
