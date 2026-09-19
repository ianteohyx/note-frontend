# CLAUDE.md

This file provides guidance to Claude Code when working with the I-Note frontend.

> **Self-reminder:** After completing any task that introduces new pages, components, API integrations, auth changes, env variables, or routing changes — update this file before ending the conversation.

---

## Project Overview

Frontend for **I-Note** — a collaborative note-taking app. Communicates exclusively with the `Desktop/I-note/note-backend` Spring Boot REST API. Users can create, edit, delete, and share notes with granular READ/WRITE permissions.

**Stack:** React 19 + TypeScript + Vite (rolldown-vite)

**Docs:** `README.md` (setup, commands, structure) and `I-Note-Frontend-Design.md` (design rationale, mirrors the backend's `I-Note-Backend-Design.md`). Update both when auth, the API layer, the editor/autosave design, sharing, or env variables change.

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

## Routing

Routes are declared in `src/App.tsx` (React Router v7, `BrowserRouter`).

| Path | Page | Access |
|------|------|--------|
| `/` | `LandingPage` | Public — marketing/entry page; redirects to `/notes` if already authenticated |
| `/login` | `LoginPage` | Public — redirects to `/notes` if already authenticated |
| `/signup` | `SignupPage` | Public |
| `/notes` | `NotesPage` | Protected — wrapped in `src/components/ProtectedRoute.tsx` |
| `*` | — | Redirects to `/` |

`ProtectedRoute` reads `isAuthenticated` and `initializing` from `useAuth()`. The access token lives only in memory (`AuthContext`), so every full page reload starts unauthenticated — but on mount `AuthProvider` fires one silent `POST /api/users/refresh` (the HttpOnly `refreshToken` cookie is the credential) to rehydrate the session. While that call is in flight `initializing` is `true` and `ProtectedRoute` / `LoginPage` / `LandingPage` render `<FullScreenLoader />` instead of redirecting, so a reload on `/notes` stays on `/notes`. Only if the refresh fails does `ProtectedRoute` redirect to `/login`.

---

## API Integration

**Base URL:** configured via `VITE_API_BASE_URL` env var.

All API calls go through a central `api/client.ts` `request()` helper. Target design:
- Attaches `Authorization: Bearer <token>` header on protected requests
- Handles 401 responses by attempting a silent token refresh (via `/api/users/refresh`)
- Logs out the user if refresh fails or returns 401

**Current state:** `request()` sends `credentials: 'include'` on every call (so the HttpOnly `refreshToken` cookie rides along on `/api/users/refresh` and `/api/users/logout`), and attaches the access token only when it's explicitly passed as an argument — every resource module (e.g. `api/notes.ts`) takes `token` as a parameter and forwards it. There is **one** silent refresh: `AuthProvider` calls `POST /api/users/refresh` once on app start to rehydrate the session after a reload. There is still no automatic *401-triggered* silent-refresh mid-session; that's a known gap, not a feature to assume exists.

**Auth API (`api/auth.ts`):** `login()`, `signup()`, `refresh()` (no args — cookie is the credential), `logout()` (no args — revokes + clears cookie server-side). `getUsernameFromToken()` in `utils/jwt.ts` decodes the JWT `sub` claim (unverified, display-only) since `/refresh` returns no username.

### Endpoints (mirrors backend)

#### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/users/signup` | Register |
| POST | `/api/users/login` | Login — returns `token` (JWT) in the body; refresh token is set as an HttpOnly `refreshToken` cookie |
| POST | `/api/users/refresh` | No body. Reads the `refreshToken` cookie, rotates it (new cookie), returns a fresh `token`. 401 if the cookie is missing/invalid |
| POST | `/api/users/logout` | No body. Revokes the refresh token and clears its cookie. Always 200. Idempotent |

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
| GET | `/api/shares/received` | Get notes shared to me, sorted by the note's `dateModified` descending (latest-edited first) |
| GET | `/api/shares/{id}` | Get single shared note |
| PATCH | `/api/shares/{id}` | Edit shared note (WRITE permission only) |
| GET | `/api/shares/note/{noteId}/users` | List users a note is shared to, each with their permission (`sharedUsers: [{ username, permission }]`) — owner-only |
| PATCH | `/api/shares/permissions` | Batch change READ/WRITE permission — body `{ updates: [{ noteId, sharedToUsername, permission }] }`, applies all items in one transaction |
| DELETE | `/api/shares/unshare` | Batch revoke access — body `{ unshares: [{ noteId, sharedToUsername }] }`, applies all items in one transaction. (This replaces an earlier, incorrect doc entry for a path-variable `DELETE /api/shares/note/{noteId}/user/{username}` — that route never existed; the real endpoint is this bulk one.) |

### API Response Shape
All responses include a `responseOutcome` field. Success responses carry data fields alongside it. Error responses include `message` and optionally `fieldErrors: Record<string, string>`.

---

## Note Editing (Rich Text)

`NoteDetailPanel` + `hooks/useAutosaveNote.ts` implement in-place note editing:

- **Editor ownership:** `useAutosaveNote` is called once, in `NotesPage` (not inside `NoteDetailPanel`) — `editor`/`saving`/`saveError`/`lastSavedAt` are passed down to `NoteDetailPanel` as props. This is so the Bold/Italic/Underline/Strikethrough toolbar, which lives in `NotesPage`'s header (centered, in its own rounded pill — only rendered once a note is loaded and has WRITE permission), can drive the same Tiptap `editor` instance that `NoteDetailPanel` renders via `EditorContent`. `ToolbarButton` (`src/components/ToolbarButton.tsx`) is shared between the two.
- **Editor:** [Tiptap](https://tiptap.dev/) v3 (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`) with the `tiptap-markdown` extension. Toolbar supports Bold/Italic/Underline/Strikethrough only — no block-level formatting (lists, blockquote, code block, links, horizontal rule are disabled via `StarterKit.configure(...)`).
- **Storage format:** the note is a single Tiptap document. The **first line is always a Heading 1 and doubles as the title**; everything after it is the body. On save, the document is serialized to Markdown (`tiptap-markdown`), then split into `noteTitle` (first line, heading markup stripped) + `noteContent` (the rest) for the PATCH request. On load, `noteTitle`/`noteContent` are rejoined (`# {title}\n\n{content}`) and handed to the editor as markdown to reconstruct the document.
- **Underline has no Markdown syntax** — `tiptap-markdown`'s default `html: true` option round-trips it as a raw `<u>` inline tag inside the stored markdown string. This is safe today because the only consumer of `content` is the Tiptap editor itself, which renders via ProseMirror (not `dangerouslySetInnerHTML`). If `content` is ever rendered anywhere else (e.g. a read-only preview), it must go through a safe markdown renderer or the Tiptap editor in read-only mode — never raw HTML injection.
- **Autosave:** debounced 1s after the last edit (`AUTOSAVE_DELAY_MS` in `useAutosaveNote.ts`), and flushed immediately when switching notes or unmounting. `PATCH /api/notes/{id}` requires both `noteTitle` and `noteContent` on every call — the backend's update query unconditionally overwrites both columns, so omitting one nulls it out (not "keep existing" despite the Swagger doc).
- **List sync:** on successful autosave, `useNotes().patchNoteInList(id, { title, dateModified })` updates the note in the sidebar list in place and re-sorts it to the top (mirroring the backend's `dateModified`-desc sort), without refetching the whole list.

---

## Note Deletion & Sharing Triggers

- **Trigger:** right-click (`onContextMenu`) a note in `NoteListPanel` opens a small `position: fixed` context menu at the cursor with two items — "Share note" (see Note Sharing below) and "Delete note". The menu closes on outside `mousedown`, `Escape`, `resize`, or `scroll` (capture). No touch/long-press equivalent yet — desktop right-click only (matches issue #16). Owner-only: `handleContextMenu` no-ops for `kind === 'shared'` items, so a recipient viewing a shared note never gets this menu at all.
- **Delete confirmation:** selecting "Delete note" opens `src/components/ConfirmDialog.tsx` — a reusable, prop-driven modal (`role="alertdialog"`, backdrop + `Escape` to cancel, confirm button auto-focused, `destructive` red variant, `loading`/`error` props). All delete state (`deleting`, `deleteError`) is local to `NoteListPanel`; errors render inside the dialog.
- **API + list sync:** `deleteNote(id, token)` in `api/notes.ts` → `DELETE /api/notes/{id}`. `useNotes().deleteNote(id)` calls it and, on `SUCCESS`, drops the note from the list state (`setNotes(prev => prev.filter(...))`); it returns `{ ok: boolean; error?: string }` (no hook-level loading/error state).
- **Selection follow:** `NotesPage.handleDeleteNote` wraps `useNotes().deleteNote`; when the deleted note was the selected one it moves selection to the first note of the updated list (`remaining[0]?.id ?? null`). Deleting a non-selected note leaves selection untouched.
- **`useNote` reset:** `useNote(selected)` (takes a `SelectedNoteRef | null` — see Note Filtering below) resets `note`/`permission`/`error` to `null` when `selected` is `null` (previously it kept stale data). This is why the header formatting toolbar (gated on `note`) correctly disappears after the last note is deleted or the mobile "back" button is used.

---

## Note Creation

- **Trigger:** a greyish, dashed-border placeholder row ("Add a new note here +") renders as the first item in `NoteListPanel`'s list whenever `filter` is `'MY'` or `'ALL'` (hidden for `'SHARED'` — a recipient can't create notes into someone else's list). It matches the size/shape of a real note row but uses muted text and a dashed border to read as "not a note." Clicking it opens `ConfirmDialog` ("Add a new note?"); confirming calls `onAddNote()`. This replaces the old header icon button (`AddNoteIcon`), which has been removed from `NotesPage`'s header entirely.
- **API + hook:** `useNotes().addNote()` returns `{ ok: boolean; note?: NoteDto; error?: string }` (previously `NoteDto | null`) so `NoteListPanel` can drive the confirm dialog's `loading`/`error` props the same way it already does for `onDeleteNote`. `NotesPage.handleCreateNote` wraps it, selecting the new note on success and forwarding `{ ok, error }` down as `onAddNote`.
- **Ordering:** the placeholder is rendered outside `visibleItems` (it isn't a `NoteListItem`), so it always stays pinned above every note regardless of sort — a newly created note lands directly below it since `addNote` prepends to `useNotes`' `notes` state and the list is sorted by `dateModified` descending.
- **Empty state:** when `items.length === 0`, a short hint line (e.g. "Notes you create will show up here.") renders below the placeholder instead of a full-panel empty state. `SHARED` keeps its own full-panel empty state ("No shared notes yet") since it has no placeholder.

---

## Note Sharing

- **Trigger:** right-click a note in `NoteListPanel` (the same context menu used for deletion — see above) and choose "Share note". This opens `src/features/notes/ShareNoteDialog.tsx`, a centered modal (`fixed inset-0` backdrop + centered card, mirroring `ConfirmDialog`'s overlay) rather than an anchored popover — it replaces the earlier floating action button (`ShareNoteButton`, deleted). The dialog contains a username input, a native `<select>` for permission (`READ`/`WRITE`, labeled "Read only"/"Read and write", defaults to `READ`), and a "Share" submit button. Changing another user's permission after an existing share still goes through the separate batch `PATCH /api/shares/permissions` endpoint, wired up in the "Shared with" popover (see Listing Shared Users below) — this dialog only sets the permission at share-creation time.
- **State ownership:** `pendingShare: NoteListItem | null` lives in `NoteListPanel` (set from the context menu's "Share note" item, cleared via `ShareNoteDialog`'s `onClose`). `ShareNoteDialog` fully unmounts (`if (!open) return null`, gated on `noteId !== null`) whenever it's closed, so its internal form state resets naturally between shares — no `prevNoteId` reset pattern needed (unlike the old FAB popover, which stayed mounted).
- **Dialog lifecycle:** closes on outside click (backdrop `onClick`), `Escape`, or the header "×" button.
- **API + hook:** `shareNote(body, token)` in `api/shares.ts` → `POST /api/shares` with `{ noteId, sharedToUsername, permission }` (`types/shares.ts`). `hooks/useShareNote.ts` wraps the call — `share(noteId, username, permission)` — and exposes `sharing`/`shareError`/`shareSuccess`/`share()`/`reset()`; unchanged by the move to a context-menu trigger.
- **Error mapping:** the dialog renders `res.message` verbatim from the backend's `ErrorResponse` under the input — `USER_NOT_EXIST` → "User not found: {username}", `NOTE_ALREADY_SHARED` → "Note {id} is already shared to user: {username}", any other failure/network error → a generic fallback string. Typing in the input after an error or success clears it (calls `reset()`).
- **Success indicator:** a green "Shared successfully!" text (`text-xs text-[#6fcf97]`, `role="status"`) renders below the permission `<select>` when `shareSuccess` is true — same slot/size/feel as the `shareError` message it sits beside (mutually exclusive with it), not an icon beside the input.
- **Icons:** `ShareIcon` and `CloseIcon` live in `src/components/icons.tsx`. `ShareIcon` doubles as the "Share note" context-menu item's icon and the shared-note list-item marker (see Note Filtering below). `CheckIcon` also lives there (used by `NoteDetailPanel`'s "Saved" toast).

## Listing Shared Users

- **Trigger:** a transparent pill button (`src/features/notes/SharedUsersButton.tsx`, `UsersIcon` + "Shared to users" label) renders centered below the "By {author} · Created … · Edited …" line in `NoteDetailPanel`, only for owned notes (`isOwner`) once `note` is loaded — mirroring where the "Share note" context-menu item is available (see Note Sharing above). Clicking it toggles a popover (`role="dialog"`) anchored directly below the button (`absolute top-full`, centered via the button's own `relative flex justify-center` wrapper) that scrolls with the panel content.
- **Data fetch:** the list is fetched fresh every time the popover opens (`fetchSharedUsers(noteId)` inside a `useEffect` gated on `open`) rather than preloaded — there's no caching/invalidation to keep in sync with new shares otherwise. `hooks/useSharedUsers.ts` exposes `sharedUsers`/`loading`/`error`/`fetchSharedUsers()`/`reset()`, calling `getSharedUsers(noteId, token)` in `api/shares.ts` → `GET /api/shares/note/{noteId}/users`.
- **Backend response shape:** the endpoint returns `{ responseOutcome, sharedUsers: [{ username, permission }] }` (`types/shares.ts` `SharedUserDto`/`GetSharedUsersResponse`) — note this is *not* what the endpoint originally returned (a bare `usernames: string[]` with no per-user permission). The backend was updated for this issue to include `permission` per user; if `note-backend`'s `GetSharedToUsersResponse`/`GetSharedToUsersService` ever regress to the old shape, this feature loses its permission column.
- **States:** loading spinner, error message (`role="alert"`, backend `message` verbatim), empty state ("This note hasn't been shared with anyone yet."), and the populated list (`<ul>` of username left / permission `<select>` + remove button right — see below). A second empty-ish state — "No one will have access after you save. Click Undo to keep current access." — shows when every row has been locally marked for removal but nothing's saved yet (`sharedUsers.length > 0 && visibleUsers.length === 0`). Only the note's owner can call this endpoint (backend enforces `assertIsOwner`); `NoteDetailPanel` only renders `SharedUsersButton` when `selected.kind === 'own'`, and `NoteListPanel`'s context menu (which includes "Share note") only opens for `kind === 'own'` items too, so a recipient viewing a shared note (opened via the "Shared to me"/"All" filters — see Note Filtering below) never sees either sharing affordance.
- **Editing permissions:** each row's permission is a native `<select>` (`READ`/`WRITE`, same "Read only"/"Read and write" labels as `ShareNoteDialog`'s select), not a static label. Edits are tracked as local `overrides: Record<username, Permission>` state in `SharedUsersButton` (not committed until Save) — a row's displayed value is `overrides[username] ?? sharedUsers.find(...).permission`.
- **Removing (un-sharing) a user:** each row also has a small icon button (`TrashIcon`, `aria-label="Remove {username}"`) that opens `ConfirmDialog` ("Remove shared user?", destructive variant, no `loading`/`error` props since — per the issue — this step is purely local UI state, no API call yet). Confirming adds the username to a local `removed: Set<string>` state and drops any pending permission override for that user; the row then disappears from the rendered list (`visibleUsers = sharedUsers.filter(u => !removed.has(u.username))`) without touching the backend. `pendingRemove: string | null` tracks which username the dialog is confirming for.
- **Dirty state:** `isDirty = changes.length > 0 || removed.size > 0` (`changes` is the existing permission-diff array, now derived from `visibleUsers` so a removed user's stale override can't leak into a save). Both the Save and the new **Undo** button are disabled unless dirty.
- **Undo:** a button beside Save that discards *all* uncommitted edits in one click — clears `overrides` and `removed` (and any open confirm dialog) back to empty, so the list re-derives from the still-unchanged `sharedUsers` fetched from the server: every permission reverts and every locally-removed user reappears with their original permission. Pure client-state reset, no refetch needed.
- **API + hooks:** clicking Save runs both pending operations together via `Promise.all` (not sequential) so a mixed batch of permission edits and removals costs exactly two requests total, not N+1:
  - `hooks/useUpdateSharePermissions.ts`'s `updatePermissions(changes)` → `PATCH /api/shares/permissions` (unchanged from before, only fires when `changes.length > 0`).
  - `hooks/useUnshareUsers.ts`'s `unshareUsers(targets)` → `DELETE /api/shares/unshare` via `unshareNote(body, token)` in `api/shares.ts`, body `{ unshares: [{ noteId, sharedToUsername }, ...] }` (`types/shares.ts` `UnshareNoteItem`/`UnshareNoteRequest`) — only fires when `removed.size > 0`. Both endpoints apply their batch in one backend transaction (all-or-nothing per call). The hook mirrors `useUpdateSharePermissions`'s shape (`unsharing`/`unshareError`/`unshareUsers()`/`reset()`).
  - Only if **both** calls succeed does the component clear `overrides`/`removed` and `fetchSharedUsers(noteId)` to reflect the committed state; if either fails, both `saveError`/`unshareError` are left in place (rendered stacked) and `overrides`/`removed` are kept so the user doesn't lose their in-progress edits and can retry Save. This does not special-case a partial success (e.g. permissions saved but unshare failed) beyond leaving state as-is for retry — a known minor gap, not a transactional guarantee across the two endpoints.
- **Popover lifecycle:** same `prevNoteId` render-time-reset pattern used elsewhere in this codebase (e.g. `NoteDetailPanel`'s `prevSaving`), plus outside-`mousedown`/`Escape` close — both of which also clear `overrides`/`removed`/`pendingRemove`/`saveError`/`unshareError`, so switching notes never leaks stale state into the new note's popover. Toggling the popover via the "Shared to users" trigger button itself does *not* clear edits — accidentally closing and reopening the popover doesn't discard unsaved changes. The popover's own Escape handler checks a `pendingRemoveRef` and no-ops while the remove-confirm dialog is open, so pressing Escape to cancel that dialog doesn't also close the whole popover underneath it (the dialog's own Escape handler, attached separately, handles dismissing itself).
- **Icons:** `UsersIcon`, `TrashIcon` (moved here from a local definition in `NoteListPanel.tsx`, now shared by both) in `src/components/icons.tsx` alongside `CheckIcon`/`ShareIcon`/`CloseIcon`.

## Note Filtering & Viewing Shared Notes

- **Filter dropdown:** a native `<select>` (`My notes` / `Shared to me` / `All`, `aria-label="Filter notes"`) renders at the top of `NoteListPanel`, above the list. Filter state (`NoteFilter`, `types/notes.ts`) is owned by `NotesPage` (not `NoteListPanel`) and defaults to `'MY'`, since the two source lists it switches between are fetched by hooks that live in `NotesPage`.
- **Two independent list hooks, always fetching:** `useNotes()` (own notes) and `hooks/useReceivedShares.ts`'s `useReceivedShares()` (notes shared to me, via `getReceivedShares(token, page, size)` in `api/shares.ts` → `GET /api/shares/received`) both fetch on mount regardless of the current filter — simpler than fetching on-demand per filter switch, and the shared list is expected to stay small. `NotesPage` derives `ownItems`/`sharedItems` (`NoteListItem[]`, `types/notes.ts`) from each, then a `visibleItems` `useMemo` picks/merges them per filter: `MY` → `ownItems`, `SHARED` → `sharedItems`, `ALL` → both concatenated and re-sorted client-side by `note.dateModified` descending. `loading`/`loadingMore`/`error`/`hasMore` are similarly switched (or OR'd, for `ALL`) per filter, and `handleLoadMore` calls whichever hook(s) apply for the current filter (each hook's own `loadMore` is already a no-op past its last page).
- **`NoteListItem`:** `{ id, kind: 'own' | 'shared', note: NoteDto }` — `id` is the note id for an owned note, but the *shared-note record's own id* for a shared one (what `GET/PATCH /api/shares/{id}` expect — distinct from, and not to be confused with, the underlying note's id, which is always `note.id`). `SelectedNoteRef` (`Pick<NoteListItem, 'id' | 'kind'>`) is the shape passed around for "which note is open."
- **List display:** a shared item shows a small `ShareIcon` (`src/components/icons.tsx`) to the right of its title (not the left) and "Shared by {authorName}" instead of the author's bare name, so it's visually distinct from an owned note in the `SHARED`/`ALL` views — this is purely presentational, applied in `NoteListPanel`, not a separate component. Right-click (the shared context menu — see Note Deletion & Sharing Triggers above) is owner-only: `handleContextMenu` no-ops for `kind === 'shared'` items, since neither sharing nor deleting is something a recipient can do.
- **Opening a shared note:** selecting a `kind: 'shared'` item fetches via `getSharedNoteById(id, token)` (`GET /api/shares/{id}`) instead of `getNoteById`. `hooks/useNote.ts` was generalized to take a `SelectedNoteRef | null` and branch on `kind`, returning `{ note, permission, loading, error }` — `permission` is hardcoded `'WRITE'` for `kind: 'own'` (the owner always has full access) and comes from the backend's `SharedNoteDto.permission` for `kind: 'shared'`.
- **Editing a shared note:** the Tiptap editor's `editable` flag is `note !== null && permission === 'WRITE'` (`useAutosaveNote.ts`), so a `READ`-permission shared note renders read-only (`contenteditable="false"`) and the Bold/Italic/Underline/Strikethrough toolbar in `NotesPage`'s header is hidden entirely (gated on `permission === 'WRITE'`, not just `note`). Autosave routes its PATCH per `target.kind`: `updateNote` (`/api/notes/{id}`) for `'own'`, `updateSharedNote` (`/api/shares/{id}`, body `{ updatedShareNoteTitle, updatedShareNoteContent }`) for `'shared'`. The backend enforces write permission server-side regardless (`assertHasWritePermission`), so even a forced/synthetic edit past the disabled editor is rejected with a 403 surfaced through the existing `saveError` banner — the client-side `editable` gate is a UX convenience, not the security boundary.
- **List sync after a shared-note edit:** `onSaved` from `useAutosaveNote` now carries `(target: SelectedNoteRef, noteId: number, patch)` — `noteId` is always the *underlying* note id (not the shared-note id) so `NotesPage.handleNoteSaved` can route the patch to the matching list: `patchNoteInList` (own list, keyed by note id) for `target.kind === 'own'`, or `useReceivedShares().patchSharedNoteInList` (shared list, matches by nested `note.id`) for `'shared'` — both re-sort their list so the edited note bubbles to the top, mirroring the backend's `dateModified`-desc order.
- **Detail panel byline:** for a shared note, `NoteDetailPanel` appends `· Read only` to the byline when `permission === 'READ'`, since the editor gives no other visual cue that typing is blocked.
- **Backend sort fix:** `GET /api/shares/received` originally sorted by the share record's own `id` (creation order) — fixed in `note-backend`'s `GetAllSharedToMeService` to sort by `note.dateModified` descending, matching `GetAllNotesService`'s own-notes sort, so the "descending chronological order" requirement holds for the `SHARED` filter (and, combined with the frontend's client-side re-sort, for `ALL` too — though `ALL`'s cross-source ordering is only as correct as the currently-loaded pages of each list, a known limitation of merging two independently-paginated sources).

## Note List / Detail Panel Layout

- **Independent scrolling:** `NotesPage`'s root wrapper is `h-screen overflow-hidden` (not `min-h-screen`) so the whole page can never grow taller than the viewport and trigger a document-level scrollbar. `main` is `flex-1 min-h-0 grid ...` and both `<section>` panels are `min-h-0 overflow-y-auto` — the `min-h-0` overrides are required because flex/grid items default to `min-height: auto`, which otherwise lets a panel's content push its row taller than the container instead of scrolling internally. Without **both** the `h-screen` root and the `min-h-0` panels, scrolling one panel scrolls the whole page (and the other panel) along with it — `min-h-screen` alone reintroduces the bug.
- **Resizable list panel:** `NotesPage` holds `listWidth` state (default `320`, clamped to `[240, 560]`) and renders a `<div role="separator">` between the two `<section>`s; dragging it (`mousedown` on the separator, then tracking `mousemove`/`mouseup` on `window` using `e.movementX`) updates `listWidth`. The width is applied via a CSS custom property (`style={{ '--list-width': ... }}`) consumed by an arbitrary-value Tailwind class (`md:grid-cols-[var(--list-width)_auto_1fr]`), so the `md:` breakpoint prefix still governs whether resizing applies at all — on mobile the panels stack (`grid-cols-1`) and the separator is `hidden`, ignoring `listWidth` entirely.

---

## Authentication & Token Management

- **Access token (JWT):** 15 min expiry. Held in memory only, in `AuthContext` state (never localStorage). Attached as `Authorization: Bearer <token>` by passing it explicitly to resource API functions.
- **Refresh token:** 7 day expiry. Set by the backend as an **HttpOnly `refreshToken` cookie** — the frontend never sees or stores it (no localStorage, ever). Sent automatically on `/api/users/refresh` and `/api/users/logout` because `request()` uses `credentials: 'include'`. Rotated on every refresh.
- **Rehydrate on reload:** `AuthProvider` runs one `POST /api/users/refresh` on mount. Success → JWT back in memory, username decoded from the JWT (`utils/jwt.ts`), `initializing` flips to `false`. Failure → stays logged out. The bootstrap promise is memoised at module scope so StrictMode's double-mount can't fire two racing refreshes (which would trip the backend's revoked-token-reuse defence).
- **Logout:** `AuthContext.logout()` clears the in-memory state immediately, then fires `POST /api/users/logout` (fire-and-forget) so the server revokes the refresh token and sends a `Max-Age=0` cookie — without this, the still-valid cookie would silently re-auth the user on the next reload.
- **Silent refresh on 401 mid-session:** not implemented yet (known gap).
- **Security invariant:** Never store the access JWT or refresh token in localStorage or sessionStorage — XSS can exfiltrate them. The refresh token is HttpOnly precisely so script can't read it.

---

## Security Standards

- **XSS:** Never use `dangerouslySetInnerHTML`. Sanitize any user-generated content rendered as HTML.
- **Token storage:** Access token in memory only. Refresh token lives in a backend-set `HttpOnly` cookie — the frontend must never read, copy, or persist it.
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
