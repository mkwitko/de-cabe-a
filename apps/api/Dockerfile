# API image (ADR-010). Build from the repository root:
#   docker build -f apps/api/Dockerfile -t decabeca-api .
FROM node:24-alpine
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --filter @decabeca/api...
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
EXPOSE 3000
# Migrations first, then the server (tsx runs the TypeScript sources, as in development).
CMD ["sh", "-c", "pnpm --filter @decabeca/api exec prisma migrate deploy && pnpm --filter @decabeca/api start"]
