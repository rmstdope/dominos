import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.ts";

describe("loading the configuration", () => {
  it("has working defaults for local development", () => {
    expect(loadConfig({})).toMatchObject({
      port: 3000,
      appOrigin: "http://localhost:5173",
      databaseUrl: undefined,
      smtpUrl: undefined,
      cookieSecure: false,
      trustProxy: false,
    });
  });

  it("treats empty variables as unset, as compose passes them", () => {
    const config = loadConfig({ SMTP_URL: "", DATABASE_URL: "", MAIL_FROM: "" });
    expect(config.smtpUrl).toBeUndefined();
    expect(config.databaseUrl).toBeUndefined();
    expect(config.mailFrom).toBe("Dominos <dominos@kurelid.se>");
  });

  it("uses secure cookies on an https origin", () => {
    const config = loadConfig({ APP_ORIGIN: "https://dominos.kurelid.se/", TRUST_PROXY: "true" });
    expect(config).toMatchObject({
      appOrigin: "https://dominos.kurelid.se",
      cookieSecure: true,
      trustProxy: true,
    });
  });

  it("names what is wrong", () => {
    expect(() => loadConfig({ PORT: "nope" })).toThrow(/PORT/);
  });
});
