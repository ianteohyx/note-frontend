# I-Note Frontend

Web client for the I-Note collaborative note-taking app, built with React 19, TypeScript and Vite. Talks exclusively to the [I-Note Backend](../note-backend) REST API.

## Features

- Sign up / log in with a short-lived access token and an HttpOnly refresh cookie (sessions survive a page reload)
- Create, rich-text edit (bold / italic / underline / strikethrough), autosave and delete notes
- Share a note with another user as **Read only** or **Read and write**, change their permission, or revoke access
- Filter the list by **My notes**, **Shared to me** or **All**
- Resizable list panel, responsive layout that stacks on mobile

## Prerequisites

- Node.js 20.19+ (or 22.12+) — required by Vite 7
- The I-Note backend running locally (see its README) on `http://localhost:8080`

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` (gitignored) in the project root:

```bash
VITE_API_BASE_URL=http://localhost:8080
```

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes | Base URL of the backend API |

`VITE_*` variables are inlined at build time, so a production build needs this set in the build environment.

### 3. Start the backend

From `note-backend`:

```bash
docker compose up -d
./mvnw spring-boot:run
```

### 4. Run the app

```bash
npm run dev
```

The app starts on `http://localhost:5173`.

> The dev port matters: the backend's `dev` profile only allows the CORS origin `http://localhost:5173`, and the refresh-token cookie is `SameSite=Lax`, which only works because `localhost:5173` → `localhost:8080` is same-site. Use `localhost` (not `127.0.0.1`) and keep the default port.

## Other Commands

```bash
# Type-check + production build (output in dist/)
npm run build

# Lint
npm run lint

# Preview the production build locally
npm run preview
```

There is no automated test suite yet.

## Project Structure

```
src/
├── api/         - fetch wrappers, one file per resource (auth, notes, shares)
├── components/  - reusable UI (ConfirmDialog, ToolbarButton, icons, ProtectedRoute…)
├── features/    - domain components (auth/, notes/)
├── hooks/       - data fetching and mutation logic (useNotes, useAutosaveNote…)
├── pages/       - route-level components
├── store/       - AuthContext (in-memory access token)
├── types/       - API request/response interfaces
└── utils/       - pure helpers (JWT decoding, date formatting)
```

## Routes

| Path | Page | Access |
|------|------|--------|
| `/` | Landing | Public (redirects to `/notes` if signed in) |
| `/login` | Login | Public (redirects to `/notes` if signed in) |
| `/signup` | Sign up | Public |
| `/notes` | Notes | Authenticated |

## Deploying

`npm run build` produces a static bundle in `dist/`. Host it on any static host and configure a fallback to `index.html` so client-side routes like `/notes` survive a refresh. In production the backend must list the frontend's origin in `CORS_ALLOWED_ORIGINS`, and the refresh cookie needs `Secure` + `SameSite=None` if the two live on different sites.

## More

See [I-Note-Frontend-Design.md](I-Note-Frontend-Design.md) for the architecture and design rationale.
