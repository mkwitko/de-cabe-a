# API image (ADR-010). Build from the repository root:
#   docker build -f apps/api/Dockerfile -t decabeca-api .
# Two stages: the build installs the workspace, `pnpm deploy` copies only the API with its
# production dependencies (prisma and tsx included: deploy/rollout.sh runs the migrations as a
# one-off `npx prisma migrate deploy` before the swap; the TS sources run at start).
# The Prisma client generated in the build stage is copied as is.
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --filter @decabeca/api... \
 && pnpm --filter @decabeca/api deploy --legacy --prod /out \
 && cp -r apps/api/prisma apps/api/prisma.config.ts /out/ \
 && rm -rf /out/src/generated && cp -r apps/api/src/generated /out/src/generated

FROM node:24-alpine
WORKDIR /app
COPY --from=build /out .
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
EXPOSE 3000
USER node
CMD ["npx", "tsx", "src/server.ts"]
