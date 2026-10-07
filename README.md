# I-Note Frontend

Web client for the I-Note collaborative note-taking app, built with React 19, TypeScript and Vite. Talks to the [I-Note Backend](https://github.com/ianteohyx/note-app) REST API.

## Prerequisites

- Node.js 20.19+ (or 22.12+)
- Docker
- The backend repo cloned next to this one

## Local Setup

### 1. Start the backend

Follow the [backend README](https://github.com/ianteohyx/note-app) to configure its `.env`, then from `note-backend`:

```bash
docker compose up -d --build
```

The API should now answer on `http://localhost:8080`.

### 2. Configure environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

It holds one value, `VITE_API_BASE_URL=http://localhost:8080`: where the dev server's app sends API calls. Only Option A below uses it.

### 3. Start the frontend

**Option A — Vite dev server (for active development):**

```bash
npm install
npm run dev
```

App at `http://localhost:5173`, with hot reload.

Open it as `localhost`, not `127.0.0.1`, and keep port 5173. The backend's dev profile only allows that origin (CORS), and the refresh-token cookie relies on `localhost:5173` → `localhost:8080` being same-site.

**Option B — the production image, in Docker:**

```bash
docker build -t inote-frontend .
docker run -d --name inote-frontend -p 3000:8080 \
  -e BACKEND_URL=http://host.docker.internal:8080 \
  inote-frontend
```

App at `http://localhost:3000`. Nginx serves the built app and forwards `/api/*` to the backend, so the browser only talks to one origin. `.env.local` is not used here (it's kept out of the image).

Either way: sign up in the app to create your first user.

## Other Commands

```bash
# Type-check + production build (output in dist/)
npm run build

# Lint
npm run lint

# Preview the production build locally
npm run preview

# Rebuild the image after a code change, then restart the container
docker build -t inote-frontend . && docker rm -f inote-frontend
docker run -d --name inote-frontend -p 3000:8080 -e BACKEND_URL=http://host.docker.internal:8080 inote-frontend

# Follow the container's logs (Nginx access + error log)
docker logs -f inote-frontend

# Stop and remove the container
docker rm -f inote-frontend
```

There is no automated test suite yet.

## Production

Hosted as a static site on S3 + CloudFront. CloudFront serves `dist/` from S3 and routes `/api/*` to the backend ALB, so the browser only talks to one origin.

```bash
npm run build
aws s3 sync dist/ s3://<bucket> --delete
aws cloudfront create-invalidation --distribution-id <id> --paths "/index.html"
```

`npm run build` loads `.env.production`, which sets `VITE_API_BASE_URL` empty (overriding `.env.local`), so the bundle calls relative `/api/...` URLs.

## More

See [I-Note-Frontend-Design.md](I-Note-Frontend-Design.md) for the architecture, project structure and design rationale.
