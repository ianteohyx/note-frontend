# syntax=docker/dockerfile:1

# ========================
# Stage 1: Build
# ========================
FROM node:20-alpine AS build
WORKDIR /app

# Install deps in their own layer so it only re-runs when the lockfile changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Empty by default: the bundle calls relative `/api/...` URLs, which Nginx
# (stage 2) reverse-proxies to the backend — same origin, so no CORS and no
# cross-site cookie issues. Only set this if the API lives on another origin.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ========================
# Stage 2: Serve
# ========================
# Unprivileged variant runs as a non-root user and listens on 8080.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS run

# Upstream for the /api reverse proxy. Defaults to the backend's compose
# service name; override at `docker run` time for other environments.
ENV BACKEND_URL=http://app:8080 \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

# The image's entrypoint runs envsubst on /etc/nginx/templates/*.template
# and writes the result to /etc/nginx/conf.d/ on startup.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
