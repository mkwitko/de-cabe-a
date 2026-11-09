# Web image: the static site built by Vite, served by Caddy, which also forwards the API paths to
# the api service, so site and API share one origin (guest cookie, sign-in, SEO).
# Build from the repository root: docker build -f apps/web/Dockerfile .
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
ARG VITE_ADSENSE_CLIENT= VITE_ADSENSE_SLOT_HOME= VITE_ADSENSE_SLOT_RESULT= VITE_ADSENSE_SLOT_TRACK= VITE_SENTRY_DSN= VITE_POSTHOG_KEY=
RUN pnpm install --frozen-lockfile --filter @decabeca/web... && pnpm --filter @decabeca/web build

FROM caddy:2-alpine
COPY --from=build /app/apps/web/dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
