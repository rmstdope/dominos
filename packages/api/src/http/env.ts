import type { Config } from "../config.ts";
import type { Db } from "../db/client.ts";
import type { User } from "../db/schema.ts";
import type { Mailer } from "../mail/mailer.ts";

export type AppDeps = {
  db: Db;
  mailer: Mailer;
  config: Config;
  /** The clock; tests move it to expire tokens and sessions. */
  now: () => Date;
  /**
   * Runs work the response should not wait for, such as sending an email, so a request's timing
   * does not reveal whether it found an account. Tests collect the promises and await them.
   */
  defer: (task: () => Promise<void>) => void;
};

export type AppEnv = {
  Variables: {
    clientIp: string;
    user: User | null;
    sessionTokenHash: string | null;
  };
};
