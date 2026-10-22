import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

// Only this disposable CI copy gets ports, mounts, test credentials and different storage names.
const dir = new URL("./.smoke/", import.meta.url);
mkdirSync(dir, { recursive: true });
const compose = JSON.parse(readFileSync(new URL("./runtime/compose.json", import.meta.url)));
const id = process.env.SMOKE_ID ?? `local-${process.pid}`;
if (!/^[a-z0-9-]+$/.test(id)) throw Error("Invalid smoke identity");
compose.networks.proxy.name = `dominos-smoke-${id}-proxy`;
delete compose.networks.proxy.external;
compose.volumes["db-data"].name = `dominos-smoke-${id}-db`;
compose.services.api.environment.APP_ORIGIN = "http://localhost:18080";
// Keep Secure cookies: localhost is a trusted context in browsers and curl.
compose.services.api.environment.COOKIE_SECURE = "true";
compose.services.gateway = {
  image: "${WEB_IMAGE}",
  ports: ["127.0.0.1:18080:8080"],
  networks: ["proxy"],
  volumes: [
    {
      type: "bind",
      source: new URL("Caddyfile", dir).pathname,
      target: "/etc/caddy/Caddyfile",
      read_only: true,
    },
  ],
  depends_on: { web: { condition: "service_healthy" } },
};
writeFileSync(new URL("compose.json", dir), JSON.stringify(compose, null, 2));
writeFileSync(
  new URL("Caddyfile", dir),
  readFileSync(new URL("./runtime/route.caddy", import.meta.url), "utf8").replace(
    "dominos.rmstdope.eu {",
    ":8080 {",
  ),
);
writeFileSync(
  new URL("api.env", dir),
  "DATABASE_URL=postgres://dominos:smoke-test-only@db:5432/dominos\n",
  { mode: 0o600 },
);
writeFileSync(
  new URL("db.env", dir),
  "POSTGRES_USER=dominos\nPOSTGRES_DB=dominos\nPOSTGRES_PASSWORD=smoke-test-only\n",
  { mode: 0o600 },
);
