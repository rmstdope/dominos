# The web app with accounts, served by Caddy, which also proxies /api to the API and gets the
# HTTPS certificate. Built from the repository root:
#   docker build -f deploy/web.Dockerfile .
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
RUN pnpm install --frozen-lockfile
COPY . .
RUN VITE_ACCOUNTS=true pnpm exec vite build --outDir dist

FROM caddy:2.10-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
