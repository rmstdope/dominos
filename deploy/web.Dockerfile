# Internal HTTP static frontend; the shared ingress owns HTTPS and API routing.
#   docker build -f deploy/web.Dockerfile .
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
RUN pnpm install --frozen-lockfile
COPY index.html vite.config.ts ./
COPY src src
COPY public public
COPY packages/shared/src packages/shared/src
RUN pnpm exec vite build
ARG REVISION
RUN node -e 'if (!/^[0-9a-f]{40}$/.test(process.env.REVISION ?? "")) throw Error("REVISION must be a full commit"); require("fs").writeFileSync("dist/release.json", JSON.stringify({revision:process.env.REVISION}) + "\n")'

FROM caddy:2.10-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
