# The API, run straight from its TypeScript sources by Node. Built from the repository root:
#   docker build -f deploy/api.Dockerfile .
FROM node:22-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json packages/api/
COPY packages/shared/package.json packages/shared/
# Only the API and what it needs at runtime: no web app, no test or build tools.
RUN pnpm install --frozen-lockfile --prod --filter "@dominos/api..."

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app ./
COPY packages/shared/src packages/shared/src
COPY packages/shared/package.json packages/shared/
COPY packages/api/src packages/api/src
COPY packages/api/drizzle packages/api/drizzle
COPY packages/api/package.json packages/api/
# For the one-off import of the WhatsApp app's menu (cli/import-menu.ts reads it by default).
COPY config/menu.json config/menu.json
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD ["node", "-e", "fetch('http://localhost:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "packages/api/src/main.ts"]
