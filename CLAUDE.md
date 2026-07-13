# CLAUDE.md

This file provides guidance to Claude Code when working with the I-Note frontend.

> **Self-reminder:** After completing any task that introduces new pages, components, API integrations, auth changes, env variables, or routing changes — update this file before ending the conversation.

---

## Project Overview

Frontend for **I-Note** — a collaborative note-taking app. Communicates exclusively with the `note-backend` Spring Boot REST API. Users can create, edit, delete, and share notes with granular READ/WRITE permissions.

**Stack:** React 19 + TypeScript + Vite (rolldown-vite)

---

## Commands

```bash
# Start dev server
npm run dev

# Type-check + build
npm run build

# Lint
npm run lint

# Preview production build
npm run preview
```

---

## Architecture Principles

### Code Quality Standards
- **No redundancy** — extract shared logic into hooks, utilities, or components. Three similar lines is a candidate for abstraction.
- **Component reusability** — components must be self-contained and prop-driven. Avoid hardcoding values that belong in props or config.
- **Type safety** — no `any`. All API responses, props, and state must be fully typed.
- **No dead code** — unused imports, variables, and components must be removed.

### Folder Structure (target)

```
src/
├── api/              - API client functions (one file per resource: notes.ts, auth.ts, shares.ts)
├── components/       - Reusable UI components (Button, Modal, Input, etc.)
├── features/         - Feature-level components grouped by domain (notes/, auth/, shares/)
├── hooks/            - Custom React hooks (useAuth, useNotes, etc.)
├── layouts/          - Page layout wrappers
├── pages/            - Route-level page components
├── store/            - Global state (auth context / token management)
├── types/            - Shared TypeScript interfaces and enums
└── utils/            - Pure utility functions
```

### Component Rules
- Prefer small, focused components over large monoliths.
- Co-locate component-specific styles/hooks with the component.
- Extract any logic with side effects into a custom hook — keep components declarative.
- Use `React.memo` only where profiling shows a real render cost, not by default.

---

## API Integration

**Base URL:** configured via `VITE_API_BASE_URL` env var.

All API calls go through a central `api/client.ts` that:
- Attaches `Authorization: Bearer <token>` header on protected requests
- Handles 401 responses by attempting a silent token refresh (via `/api/users/refresh`)
- Logs out the user if refresh fails or returns 401

### Endpoints (mirrors backend)

#### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/users/signup` | Register |
| POST | `/api/users/login` | Login — returns `token` + `refreshToken` |
| POST | `/api/users/refresh` | Rotate refresh token, get new JWT |

#### Notes
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/notes` | Create note |
| GET | `/api/notes` | Get all user's notes |
| GET | `/api/notes/{id}` | Get single note |
| PATCH | `/api/notes/{id}` | Update title/content |
| DELETE | `/api/notes/{id}` | Delete note |

#### Shares
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/shares` | Share note with a user |
| GET | `/api/shares/received` | Get notes shared to me |
| GET | `/api/shares/{id}` | Get single shared note |
| PATCH | `/api/shares/{id}` | Edit shared note (WRITE permission only) |
| GET | `/api/shares/note/{noteId}/users` | List users a note is shared to |
| DELETE | `/api/shares/note/{noteId}/user/{username}` | Revoke access |
| PATCH | `/api/shares/note/{noteId}/user/{username}/permission` | Change READ/WRITE permission |

### API Response Shape
All responses include a `responseOutcome` field. Success responses carry data fields alongside it. Error responses include `message` and optionally `fieldErrors: Record<string, string>`.

---

## Authentication & Token Management

- **Access token (JWT):** 15 min expiry. Stored in memory (never localStorage). Attached as `Authorization: Bearer <token>`.
- **Refresh token:** 7 day expiry. Stored in an `HttpOnly` cookie (set by backend) or `localStorage` — confirm with backend config. Rotated on every use.
- **Silent refresh:** On 401, attempt one refresh before logging out.
- **Security invariant:** Never store the access JWT in localStorage or sessionStorage — XSS can exfiltrate it.

---

## Security Standards

- **XSS:** Never use `dangerouslySetInnerHTML`. Sanitize any user-generated content rendered as HTML.
- **Token storage:** Access token in memory only. Refresh token in `HttpOnly` cookie if backend supports it.
- **Input validation:** Validate on the client for UX, but treat server validation as the source of truth.
- **CORS:** Backend is configured to allow the frontend origin via `cors.allowed-origins`. Do not bypass this.
- **No secrets in code:** All environment-specific values go in `.env.local` (gitignored). Never commit API URLs, keys, or tokens.

---

## State Management

- Use **React Context** for global auth state (current user, token, login/logout).
- Use **local component state** (`useState`) for UI-only state.
- Use **custom hooks** to encapsulate data fetching and mutation logic per resource.
- Avoid over-engineering — no Redux or Zustand unless complexity genuinely demands it.

---

## Error Handling

- Every API call must handle errors explicitly — no silent failures.
- Display user-friendly error messages mapped from `responseOutcome` values.
- Field-level validation errors from `fieldErrors` must map to the corresponding form fields.
- Network errors (offline, timeout) must be caught and shown as feedback.

---

## UI / UX Standards

- **Smooth & elegant:** Use CSS transitions/animations for state changes (loading, appearing, disappearing). Nothing should snap abruptly.
- **Loading states:** Every async action must show a loading indicator.
- **Empty states:** Every list must handle the empty case with a helpful message.
- **Optimistic updates:** Where appropriate (e.g. delete, toggle), update UI before server confirmation and roll back on error.
- **Accessibility:** Semantic HTML, proper `aria-*` labels on interactive elements, keyboard navigable.
- **Responsive:** Mobile-first. Layouts must work on small screens.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes | Backend base URL e.g. `http://localhost:8080` |

Set in `.env.local` for development (gitignored). Set as build-time env vars for production.

---

## TypeScript

- `strict: true` is enforced.
- All API response shapes must have corresponding interfaces in `src/types/`.
- No `as any` or `// @ts-ignore` without a documented reason.
- Use discriminated unions for state that has multiple modes (e.g. loading / success / error).
