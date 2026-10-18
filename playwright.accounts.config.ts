import { defineConfig, devices } from "@playwright/test";

// The app with accounts, end to end: the real API on an empty embedded database, and the
// VITE_ACCOUNTS build served by `vite preview`, which proxies /api to it as Caddy will.
// Before the API starts, create-staff writes an invitation link for the test to open.
const api = "http://localhost:3100";
const web = "http://localhost:4174";
const data = ".e2e-accounts";

export default defineConfig({
  testDir: "./e2e-accounts",
  // One account goes through every step, in order.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: web, trace: "retain-on-failure", timezoneId: "Europe/Stockholm" },
  projects: [{ name: "mobile-ios", use: { ...devices["iPhone 13"] } }],
  webServer: [
    {
      command: [
        `rm -rf ${data} && mkdir -p ${data}`,
        `node packages/api/src/cli/create-staff.ts --email baker@example.com --name 'The Baker' > ${data}/invitation.txt`,
        "exec node packages/api/src/main.ts",
      ].join(" && "),
      url: `${api}/api/health`,
      env: { ...process.env, PORT: "3100", APP_ORIGIN: web, PGLITE_DIR: `${data}/db` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command:
        "pnpm run build:accounts && pnpm exec vite preview --outDir dist-accounts --port 4174 --strictPort",
      url: web,
      env: { ...process.env, API_PROXY_TARGET: api },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
