# =============================================================================
# Cerca API — multi-stage, non-root, Prisma 7 aware. Build context is the REPO ROOT
# (it is a pnpm monorepo): from the repo root run
#   docker build -f apps/api/Dockerfile -t cerca-api .
# On Railway, set the Dockerfile path to apps/api/Dockerfile and the root as context.
# =============================================================================
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable
WORKDIR /app

# ---- deps: install with the frozen lockfile (scripts deferred; prisma generate runs in build)
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages/contract/package.json ./packages/contract/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --ignore-scripts

# ---- build: contract → prisma client → api. `prisma generate` needs network (binaries.prisma.sh).
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @cerca/contract build \
 && pnpm --filter @cerca/api exec prisma generate \
 && pnpm --filter @cerca/api build

# ---- runtime: minimal, non-root, tini as PID 1 so SIGTERM reaches Node ----
FROM base AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=3333

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/packages/contract/dist ./packages/contract/dist
COPY --from=build --chown=node:node /app/packages/contract/package.json ./packages/contract/package.json
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /app/apps/api/prisma ./apps/api/prisma
COPY --from=build --chown=node:node /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --from=build --chown=node:node /app/package.json /app/pnpm-workspace.yaml /app/.npmrc ./

USER node
EXPOSE 3333
WORKDIR /app/apps/api

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/main.js"]
