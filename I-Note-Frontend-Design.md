# I-Note Frontend Design

> Personal reference for interviews and presentations — covers architecture, authentication, security, editor design, and the decisions behind the I-Note collaborative note-taking web client.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Architecture](#architecture)
3. [Authentication & Session Design](#authentication--session-design)
4. [Security Design](#security-design)
5. [API Layer](#api-layer)
6. [Rich Text Editing & Autosave](#rich-text-editing--autosave)
7. [Sharing & Permissions](#sharing--permissions)
8. [State Management](#state-management)
9. [Performance & UX](#performance--ux)
10. [Error Handling](#error-handling)
11. [Configuration & Environment](#configuration--environment)
12. [Known Gaps & Trade-offs](#known-gaps--trade-offs)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5.9 (`strict`, `noUnusedLocals`, `noUnusedParameters`) |
| UI | React 19 |
| Build | Vite (rolldown-vite 7.2.5) |
| Routing | React Router 7 (`BrowserRouter`) |
| Styling | Tailwind CSS 4 (via `@tailwindcss/vite`) |
| Editor | Tiptap 3 (ProseMirror) + `tiptap-markdown` |
| State | React Context (auth) + local state + custom hooks |
| Lint | ESLint 9 + typescript-eslint + react-hooks + react-refresh |

No Redux/Zustand, no data-fetching library, no component library. The app has one global concern (who is logged in), so the tooling is kept to what that actually needs.

---

## Architecture

### Pattern: Layered, Hook-Driven

```
Page → Feature components → Hooks → api/ (request helper) → REST API
```

- **Pages** compose the screen and own cross-panel state (e.g. the selected note, the active filter)
- **Feature components** render one domain concern (`NoteListPanel`, `NoteDetailPanel`, `ShareNoteDialog`, `SharedUsersButton`)
- **Hooks** own all side effects — fetching, mutating, timers. Components stay declarative
- **`api/`** is the only layer that knows URLs, HTTP methods and headers
- **`types/`** holds an interface for every request and response shape

### Folder Structure

```
src/
├── api/         - auth.ts, notes.ts, shares.ts + client.ts (shared request helper)
├── components/  - ConfirmDialog, ToolbarButton, FullScreenLoader, ProtectedRoute, icons
├── features/
│   ├── auth/    - LoginForm, SignupForm
│   └── notes/   - NoteListPanel, NoteDetailPanel, ShareNoteDialog, SharedUsersButton
├── hooks/       - useNotes, useNote, useReceivedShares, useAutosaveNote,
│                  useShareNote, useSharedUsers, useUpdateSharePermissions, useUnshareUsers
├── pages/       - LandingPage, LoginPage, SignupPage, NotesPage
├── store/       - AuthContext (provider) + auth-context (context object/types)
├── types/       - auth.ts, notes.ts, shares.ts
└── utils/       - jwt.ts, date.ts
```

**Key design principle:** UI components never call `fetch`. They call a hook; the hook calls an `api/` function; the `api/` function calls `request()`. Swapping the transport or changing an endpoint touches one layer.

### Code Quality Rules

- No `any`, no `@ts-ignore` without a documented reason
- No dead code — unused imports/variables fail the build (`noUnusedLocals`)
- Shared UI (`ConfirmDialog`, `ToolbarButton`, icons) is prop-driven and reused rather than copied
- Logic with side effects lives in hooks, not components

---

## Authentication & Session Design

The frontend is the other half of the backend's JWT + rotating refresh-token scheme. The interesting problem is **where each token lives**.

### Where tokens live

| Token | Lifetime | Storage | Why |
|-------|----------|---------|-----|
| Access token (JWT) | 15 min | **JavaScript memory only** (`AuthContext` state) | Never touches `localStorage`/`sessionStorage`, so an XSS payload can't read it out of storage |
| Refresh token | 7 days | **HttpOnly cookie**, set by the backend | Script can't read it at all. The frontend never sees, copies or stores it |

### Flow

```
1. Login
   POST /api/users/login → body: { token }, Set-Cookie: refreshToken (HttpOnly)
   → token goes into AuthContext state

2. Every protected request
   → the hook passes the in-memory token to the api function
   → request() sends Authorization: Bearer <token>

3. Page reload (F5)
   → memory is wiped, so state starts logged out and `initializing = true`
   → AuthProvider fires ONE POST /api/users/refresh (cookie rides along)
   → success: new JWT in memory, `initializing = false`, user stays on /notes
   → failure: stays logged out, ProtectedRoute redirects to /login

4. Logout
   → state cleared immediately (UI reacts instantly)
   → POST /api/users/logout, fire-and-forget: backend revokes the token
     and sends Max-Age=0 so the cookie can't silently re-auth on next reload
```

### The `initializing` flag

Without it, a reload on `/notes` would render for one frame as "not authenticated" and `ProtectedRoute` would bounce the user to `/login` before the refresh finished. While `initializing` is true, `ProtectedRoute`, `LoginPage` and `LandingPage` render `<FullScreenLoader />` instead of making a redirect decision.

### StrictMode-safe bootstrap

The refresh token **rotates** on every use, and the backend treats reuse of an already-rotated token as theft and revokes every session for that user. React StrictMode double-invokes effects in dev, which would fire two concurrent `/refresh` calls and trip exactly that defence, logging the developer out on every reload.

Fix: the bootstrap promise is memoised at module scope, so both effect runs await the same single request.

```ts
let bootstrapPromise: Promise<string | null> | null = null;
function bootstrapRefresh() {
  if (!bootstrapPromise) bootstrapPromise = refresh().then(...).catch(() => null);
  return bootstrapPromise;
}
```

### Username from the JWT

`/refresh` returns only a token, not a username. `utils/jwt.ts` decodes the `sub` claim client-side **without verifying the signature**. That is safe because the value is display-only (the header shows who is logged in) — every real authorization decision is made by the backend against the `Authorization` header. The frontend never treats a decoded claim as a permission.

---

## Security Design

### XSS

- `dangerouslySetInnerHTML` is banned. All user content renders through React (escaped) or through the Tiptap/ProseMirror editor (schema-validated, not raw HTML)
- The stored note format can contain a raw `<u>` tag (see [Rich Text Editing](#rich-text-editing--autosave)). That's safe **only because** the sole consumer of `content` is the Tiptap editor. If a read-only preview is ever built, it must use a safe markdown renderer or Tiptap in read-only mode — never HTML injection
- Because XSS is the main threat to a browser-held token, the two tokens are split as above: the long-lived one is unreadable to script; the readable one is short-lived and in memory

### CSRF

The refresh cookie is the only credential that rides along automatically. Mitigations:

- Cookie is scoped to `/api/users` (only the refresh/logout endpoints ever receive it)
- `SameSite=Lax` in dev; `SameSite=None; Secure` in prod (needed for a cross-site frontend), set by the backend
- The cookie can only mint a new access token; it cannot authorize a note mutation on its own. Note endpoints require the `Authorization` header, which a cross-site request cannot attach

### CORS

`request()` sends `credentials: 'include'` on every call so the refresh cookie is sent cross-origin. That only works because the backend lists the exact frontend origin in `cors.allowed-origins` (`http://localhost:5173` in dev, `${CORS_ALLOWED_ORIGINS}` in prod). There's no wildcard and no proxy hack.

### Client checks are UX, not security

Several gates exist purely for usability, and the backend independently enforces each one:

| Client behaviour | Server enforcement |
|------------------|-------------------|
| Editor is read-only for `READ` shares; toolbar hidden | `assertHasWritePermission` → 403 |
| Delete/Share context menu only for owned notes | `assertIsOwner` → 403 |
| "Shared to users" button only for owned notes | Owner-only endpoint |

A user who bypasses the UI (devtools, curl) is rejected server-side, and the rejection surfaces through the normal error banner.

### Secrets

No API keys, tokens or URLs in source. The only environment value is `VITE_API_BASE_URL`, kept in the gitignored `.env.local`. Since `VITE_*` values are compiled into the public bundle, nothing secret may ever go in one.

---

## API Layer

### One request helper

Every call goes through `request<T>(method, path, body?, token?)` in `api/client.ts`:

- Builds the URL from `VITE_API_BASE_URL`
- Attaches `Authorization: Bearer <token>` when a token is passed
- Always sends `credentials: 'include'`
- Returns the parsed JSON body

Resource modules (`notes.ts`, `shares.ts`, `auth.ts`) are thin typed wrappers: one function per endpoint, taking `token` explicitly.

### Why the token is passed explicitly

The token comes from `useAuth()` in hooks and is passed down as an argument. This keeps the `api/` layer pure and stateless (no hidden global, trivially testable) at the cost of threading `token` through every call. See [Known Gaps](#known-gaps--trade-offs) for the trade-off this creates.

### Typed response envelope

The backend returns a consistent envelope with a `responseOutcome`. Success responses add data fields; errors add `message` and optionally `fieldErrors`. Each response has an interface in `src/types/`, and hooks branch on `responseOutcome === 'SUCCESS'` before narrowing to the success shape:

```ts
const res = await getAllNotes(token, page, PAGE_SIZE);
if (res.responseOutcome === 'SUCCESS') {
  const success = res as GetAllNoteResponse;   // narrowed here, once
} else {
  setError((res as ErrorResponse).message ?? 'Failed to load notes.');
}
```

The backend's `message` is shown verbatim (e.g. "User not found: bob"), so error copy has a single source of truth.

### Pagination

`useNotes` and `useReceivedShares` fetch 20 at a time and expose `loadMore` / `hasMore`, driven by the backend's `page` / `totalPages`. The list panel shows a "Load more" button while more pages exist.

---

## Rich Text Editing & Autosave

### One document, first line is the title

The backend stores `title` and `content` as separate columns, but the editing experience is a single Tiptap document:

- The **first line is always a Heading 1** and doubles as the title
- Everything after it is the body

```
load:  { title, content } → "# {title}\n\n{content}" → editor
save:  editor → markdown → split at first newline → { noteTitle, noteContent }
```

**Why:** the user gets one continuous writing surface with no separate title input, while the backend keeps a clean `title` column that the list view can read without parsing markdown.

### Markdown as the storage format

Content is serialized to Markdown via `tiptap-markdown` rather than stored as ProseMirror JSON or HTML. Markdown is compact, human-readable in the database, and not tied to Tiptap's schema version. The toolbar is deliberately limited to Bold / Italic / Underline / Strikethrough; block-level nodes (lists, blockquote, code block, links, horizontal rule) are disabled in `StarterKit.configure(...)`, so the editor can't produce content the rest of the app doesn't expect.

Underline has no Markdown syntax, so `tiptap-markdown` round-trips it as an inline `<u>` tag. That's the one place raw HTML enters the stored string — see [Security Design](#security-design) for why it's safe.

### Autosave

`useAutosaveNote` owns the editor and the save loop:

- **Debounced 1s** after the last keystroke (`AUTOSAVE_DELAY_MS`) — one request per pause, not one per key
- **Flushed immediately** when switching notes or unmounting, so a quick switch never drops the last edit
- Pending edits live in a ref (`pendingRef`), not state, so keystrokes don't cause re-renders
- `onSaved` is held in a ref so a changing callback doesn't retrigger the effect
- Sends **both** `noteTitle` and `noteContent` every time — the backend's update query overwrites both columns, so omitting one would null it out
- Save status (`saving` / `saveError` / `lastSavedAt`) drives a "Saved" toast and an error banner

### Editor ownership lives in the page

`useAutosaveNote` is called in `NotesPage`, not inside `NoteDetailPanel`. The formatting toolbar lives in the page header, while the editor is rendered in the detail panel; both need the *same* Tiptap `editor` instance. Lifting the hook one level up lets both consume it via props with no context or ref gymnastics.

### Read-only shares

The editor's `editable` flag is `note !== null && permission === 'WRITE'`. A `READ` share renders `contenteditable="false"`, the toolbar disappears, and the byline appends "· Read only" — the one visual cue explaining why typing does nothing.

---

## Sharing & Permissions

### Two id spaces, one list

The list can show notes you own and notes shared to you. They're different resources with different ids:

```ts
interface NoteListItem {
  id: number;                 // note id (own) OR shared-note record id (shared)
  kind: 'own' | 'shared';
  note: NoteDto;              // always carries the underlying note (note.id)
}
type SelectedNoteRef = Pick<NoteListItem, 'id' | 'kind'>;
```

`GET/PATCH /api/shares/{id}` expects the *share record's* id, not the note's. Carrying `kind` alongside `id` means `useNote` and `useAutosaveNote` route to the right endpoint with a simple branch, and it's impossible to accidentally send a note id to a share endpoint.

### Filtering

A `NoteFilter` (`'MY' | 'SHARED' | 'ALL'`) lives in `NotesPage`, defaulting to `'MY'`. Both source lists are fetched on mount by independent hooks; a `useMemo` picks or merges them per filter (`ALL` concatenates and re-sorts by `dateModified` descending).

**Why fetch both up front:** it's simpler than fetch-on-switch, switching filters is instant, and the shared list is expected to stay small.

### Sharing UI

- **Right-click** a note → context menu with "Share note" / "Delete note" (owner-only; no-ops for shared notes)
- **`ShareNoteDialog`** — username + permission, sets permission at creation time
- **`SharedUsersButton`** — popover listing who a note is shared with, refetched fresh each time it opens (no cache to invalidate)

### Batched, all-or-nothing edits

In the "Shared with" popover, permission changes and removals are staged locally and only committed on **Save**:

- `overrides: Record<username, Permission>` — pending permission edits
- `removed: Set<string>` — pending removals
- `isDirty` enables **Save** and **Undo**; Undo clears both, and the list re-derives from the still-unchanged server data (no refetch)

Save fires both operations in parallel — `PATCH /api/shares/permissions` and `DELETE /api/shares/unshare` — so a mixed batch costs **two requests total, not N+1**. Each endpoint applies its whole batch in one backend transaction. On any failure, local edits are kept so the user can retry without losing work.

**Why stage locally instead of saving on each click:** removing access is destructive. A confirm step plus an Undo lets users correct a mistake before it hits the server.

### Deletion & creation

Destructive/creating actions go through the reusable `ConfirmDialog` (`role="alertdialog"`, Escape/backdrop to cancel, confirm auto-focused, destructive variant, `loading`/`error` props). A dashed "Add a new note here +" placeholder row sits pinned above the list for `MY`/`ALL` filters and is hidden for `SHARED`, where creating makes no sense.

---

## State Management

| Kind of state | Where it lives | Why |
|---------------|----------------|-----|
| Auth (token, username, `initializing`) | `AuthContext` | Genuinely global; needed by routing and every hook |
| Server data (notes, shares, shared users) | Per-resource custom hooks | Each hook owns its loading/error/pagination; nothing else needs the raw fetch |
| Cross-panel UI (selected note, filter, list width) | `NotesPage` `useState` | Shared by exactly two sibling panels, so lifting to their parent is enough |
| Ephemeral UI (open menus, dialog form fields, popover edits) | Local `useState` in the component | Dies with the component; dialogs unmount when closed so form state resets for free |

The rule: put state at the lowest component that needs it, and reach for global state only when auth demands it.

### Render-time resets over effects

Where a piece of state must reset when a prop changes (e.g. the shared-users popover on note switch), the code uses the "compare previous prop during render" pattern instead of `useEffect` + `setState`, avoiding an extra render pass with stale UI.

---

## Performance & UX

### In-place list sync

After a successful autosave, the sidebar list is patched locally (`patchNoteInList` / `patchSharedNoteInList`): update the title and `dateModified`, move the note to the top. This mirrors the backend's `dateModified`-desc sort with **zero extra requests** — no refetch of the list on every save.

Deletes and creates likewise update list state directly rather than refetching.

### Debounce + refs

Autosave debounces at 1s and stores pending edits in refs, so typing triggers no React re-renders for persistence purposes and no request storms.

### Independent panel scrolling

`NotesPage`'s root is `h-screen overflow-hidden` and both panels are `min-h-0 overflow-y-auto`. **Both are required:** flex/grid children default to `min-height: auto`, so without `min-h-0` a panel's content pushes its row taller than the container instead of scrolling internally, and the whole page scrolls with it. `min-h-screen` alone reintroduces the bug.

### Resizable list panel

Dragging the divider updates a `listWidth` (clamped 240–560px), applied via a CSS custom property (`--list-width`) consumed by an arbitrary-value Tailwind class (`md:grid-cols-[var(--list-width)_auto_1fr]`). Using a variable keeps the `md:` breakpoint in charge: on mobile the panels stack and the separator is hidden, ignoring the width entirely.

### Motion & feedback

Every async action shows a loading indicator, every list has an empty state, and state changes use CSS transitions/keyframes (`card-in`, `toast-in`) so nothing snaps in abruptly. Semantic HTML with `aria-*` labels and keyboard support (Escape closes dialogs/menus/popovers).

---

## Error Handling

- Every API call is wrapped in `try/catch`; **no silent failures**
- Non-`SUCCESS` outcomes show the backend's `message` verbatim (mapped from `responseOutcome`)
- Network failures (offline, timeout) show a distinct "Network error. Please check your connection…" message
- Field-level errors (`fieldErrors`) map onto their form fields
- Hooks return `{ ok, error? }` from mutations (`addNote`, `deleteNote`) so the calling component can drive a dialog's `loading`/`error` props without hook-level state
- Stale-response guards: `useNote` uses a cancellation flag so a slow response for a previously selected note can't overwrite the current one

---

## Configuration & Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes | Backend base URL, e.g. `http://localhost:8080` |

- Dev: set in `.env.local` (gitignored)
- Prod: set as a build-time variable — `VITE_*` values are compiled into the bundle, so they must be public information

### Build & hosting

- `npm run build` runs `tsc -b` then `vite build`, so **type errors fail the build**
- Output is a static bundle in `dist/`, deployable to any static host
- `BrowserRouter` uses real paths, so the host needs an `index.html` fallback or a refresh on `/notes` will 404
- In production the backend must allow the frontend origin via `CORS_ALLOWED_ORIGINS`, and (for a cross-site frontend) send the refresh cookie as `Secure; SameSite=None`

---

## Known Gaps & Trade-offs

Honest limitations, in case they come up:

| Gap | Impact | Notes |
|-----|--------|-------|
| **No mid-session 401 refresh** | After the 15-min access token expires, API calls fail until the user reloads (which triggers the bootstrap refresh) | Fix: make `request()` retry once on 401 after a single-flight `/refresh`, then log out on failure. Explicit token-passing was chosen first for simplicity; this is the natural next step |
| **Last-write-wins autosave** | Two people editing the same note can overwrite each other; no conflict detection or live collaboration | Would need versioning/ETag or CRDT/OT |
| **`ALL` filter ordering** | Cross-source order is only as correct as the pages loaded so far | Consequence of merging two independently paginated lists client-side |
| **Partial failure on Save** | If permissions save but unshare fails (or vice versa), state is left as-is for retry, not rolled back | Two endpoints, two transactions |
| **Desktop-only context menu** | Share/Delete is right-click; no long-press for touch | |
| **No automated tests** | Behaviour verified manually | Hooks are the natural first unit-test target |
| **Unverified JWT decode** | Username shown could be wrong if a token were forged | Display-only by design; server is authoritative |

---

## Key Design Decisions — Summary for Interviews

| Decision | What | Why |
|----------|------|-----|
| Access token in memory, refresh token in HttpOnly cookie | JWT never in `localStorage`; refresh token invisible to JS | XSS can't exfiltrate a long-lived credential |
| Silent refresh on mount + `initializing` flag | One `/refresh` on app start; routes wait for it | Reload stays signed in with no redirect flicker |
| Module-scoped bootstrap promise | Startup refresh memoised across StrictMode double-mount | Two racing refreshes would trip the backend's reuse-detection and log the user out |
| Layered `page → hook → api → request()` | Components never call `fetch` | One place to change transport; components stay declarative |
| Explicit `token` argument in api functions | No hidden global auth state in the api layer | Pure, testable; trade-off is threading token everywhere |
| Title = first line of a single Tiptap doc | Split to `noteTitle`/`noteContent` on save | Seamless writing UX, clean title column for the list |
| Markdown storage, restricted schema | Only bold/italic/underline/strike | Compact, readable, and can't emit content the app doesn't handle |
| Debounced autosave with ref-held pending edit, flush on switch | 1s debounce, immediate flush on note change | No request storms, no lost edits |
| `NoteListItem { id, kind, note }` | Tag every item as own/shared | Different id spaces can't be confused; endpoint routing is one branch |
| Editor hook lifted into `NotesPage` | Header toolbar and detail panel share one editor | Avoids context/ref plumbing between siblings |
| Staged share edits + Undo, saved in parallel | Local overrides, two batch requests on Save | Destructive actions are reversible pre-commit; 2 requests, not N+1 |
| Client gates are UX only | Read-only editor, hidden menus | Backend re-enforces every one; UI is never the security boundary |
| In-place list patching | Update + re-sort locally after save/create/delete | Matches backend order with zero refetches |
| `h-screen` + `min-h-0` panels | Root fixed to viewport, panels scroll internally | Prevents the whole page scrolling with one panel |
| Context only for auth | Everything else is local state or hooks | No Redux for a single global concern |
| Type errors fail the build | `tsc -b && vite build`, `strict` on | Broken contracts with the API surface at build time |
