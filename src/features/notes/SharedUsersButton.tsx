import { useCallback, useEffect, useRef, useState } from 'react';
import { useSharedUsers } from '../../hooks/useSharedUsers';
import { useUpdateSharePermissions } from '../../hooks/useUpdateSharePermissions';
import { useUnshareUsers } from '../../hooks/useUnshareUsers';
import { UsersIcon, TrashIcon } from '../../components/icons';
import ConfirmDialog from '../../components/ConfirmDialog';
import type { Permission, UpdateSharePermissionItem } from '../../types/shares';

const spinnerClass =
  'inline-block w-4 h-4 border-2 border-[#c8b8e8]/30 border-t-[#c8b8e8] rounded-full animate-spin shrink-0';

interface SharedUsersButtonProps {
  noteId: number;
}

export default function SharedUsersButton({ noteId }: SharedUsersButtonProps) {
  const [open, setOpen] = useState(false);
  const { sharedUsers, loading, error, fetchSharedUsers, reset } = useSharedUsers();
  const { saving, saveError, updatePermissions, reset: resetSave } = useUpdateSharePermissions();
  const { unsharing, unshareError, unshareUsers, reset: resetUnshare } = useUnshareUsers();
  const [overrides, setOverrides] = useState<Record<string, Permission>>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Read inside the popover's window listener below so Escape closes only the
  // confirm dialog (which owns its own Escape handler) while it's open, not the
  // whole popover underneath it.
  const pendingRemoveRef = useRef(pendingRemove);
  pendingRemoveRef.current = pendingRemove;

  const resetEdits = useCallback(() => {
    setOverrides({});
    setRemoved(new Set());
    setPendingRemove(null);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    resetEdits();
    reset();
    resetSave();
    resetUnshare();
  }, [reset, resetSave, resetUnshare, resetEdits]);

  // Switching notes should never leak the previous note's shared-users popover/state.
  // Adjusted directly during render (React's documented escape hatch) rather than in
  // an effect, matching the prevSaving pattern in NoteDetailPanel.
  const [prevNoteId, setPrevNoteId] = useState(noteId);
  if (noteId !== prevNoteId) {
    setPrevNoteId(noteId);
    setOpen(false);
    resetEdits();
    reset();
    resetSave();
    resetUnshare();
  }

  useEffect(() => {
    if (!open) return;
    fetchSharedUsers(noteId);

    function handlePointerDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) close();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !pendingRemoveRef.current) close();
    }
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
    // fetchSharedUsers/close intentionally omitted: they're stable per noteId/token and
    // re-including them would refire the fetch on every render while open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, noteId]);

  const visibleUsers = sharedUsers.filter(u => !removed.has(u.username));
  const changes: UpdateSharePermissionItem[] = visibleUsers
    .filter(u => overrides[u.username] !== undefined && overrides[u.username] !== u.permission)
    .map(u => ({ noteId, sharedToUsername: u.username, permission: overrides[u.username] }));
  const isDirty = changes.length > 0 || removed.size > 0;
  const isSaving = saving || unsharing;

  function handleRemoveClick(username: string) {
    setPendingRemove(username);
  }

  function handleConfirmRemove() {
    if (!pendingRemove) return;
    const username = pendingRemove;
    setRemoved(prev => new Set(prev).add(username));
    setOverrides(prev => {
      if (!(username in prev)) return prev;
      const next = { ...prev };
      delete next[username];
      return next;
    });
    setPendingRemove(null);
  }

  function handleUndo() {
    if (!isDirty || isSaving) return;
    resetEdits();
    resetSave();
    resetUnshare();
  }

  async function handleSave() {
    if (!isDirty || isSaving) return;
    const toRemove = Array.from(removed).map(username => ({ noteId, sharedToUsername: username }));

    const [updateOk, removeOk] = await Promise.all([
      changes.length > 0 ? updatePermissions(changes) : Promise.resolve(true),
      toRemove.length > 0 ? unshareUsers(toRemove) : Promise.resolve(true),
    ]);

    if (updateOk && removeOk) {
      resetEdits();
      await fetchSharedUsers(noteId);
    }
  }

  return (
    <div ref={wrapperRef} className="relative flex justify-center mb-4">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Shared to users"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-full border border-white/15 bg-transparent px-5 py-1.5 text-xs text-[#c8b8e8] transition-colors hover:border-[#c8a96e]/50 hover:text-[#c8a96e] cursor-pointer"
      >
        <UsersIcon className="h-3.5 w-3.5" />
        Shared to users
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Users this note is shared with"
          className="absolute top-full z-30 mt-2 w-72 rounded-xl border border-white/10 bg-[#241c33] p-4 text-left shadow-2xl shadow-black/50 animate-[card-in_0.15s_ease]"
        >
          <h2 className="m-0 mb-3 text-sm font-semibold text-[#f0eaf8]">Shared with</h2>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-3 text-xs text-[#f0eaf8]/55">
              <span className={spinnerClass} aria-hidden="true" />
              Loading…
            </div>
          )}

          {!loading && error && (
            <p className="m-0 text-xs text-[#e07a7a]" role="alert">
              {error}
            </p>
          )}

          {!loading && !error && sharedUsers.length === 0 && (
            <p className="m-0 text-xs text-[#f0eaf8]/50">This note hasn&apos;t been shared with anyone yet.</p>
          )}

          {!loading && !error && sharedUsers.length > 0 && (
            <>
              {visibleUsers.length === 0 && (
                <p className="m-0 text-xs text-[#f0eaf8]/50">
                  No one will have access after you save. Click Undo to keep current access.
                </p>
              )}

              {visibleUsers.length > 0 && (
                <ul className="m-0 flex max-h-56 list-none flex-col gap-2 overflow-y-auto p-0">
                  {visibleUsers.map(u => (
                    <li key={u.username} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-[#f0eaf8]">{u.username}</span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <select
                          value={overrides[u.username] ?? u.permission}
                          onChange={e =>
                            setOverrides(prev => ({ ...prev, [u.username]: e.target.value as Permission }))
                          }
                          disabled={isSaving}
                          aria-label={`Permission for ${u.username}`}
                          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-[#c8b8e8] outline-none focus:border-[#c8a96e]/60 disabled:opacity-60 cursor-pointer"
                        >
                          <option value="READ" className="bg-[#241c33] text-[#f0eaf8]">
                            Read only
                          </option>
                          <option value="WRITE" className="bg-[#241c33] text-[#f0eaf8]">
                            Read and write
                          </option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveClick(u.username)}
                          disabled={isSaving}
                          aria-label={`Remove ${u.username}`}
                          title={`Remove ${u.username}`}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-[#f0eaf8]/50 transition-colors hover:bg-[#e07a7a]/15 hover:text-[#e07a7a] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {(saveError || unshareError) && (
                <p className="m-0 mt-3 text-xs text-[#e07a7a]" role="alert">
                  {saveError || unshareError}
                </p>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={!isDirty || isSaving}
                  className="flex-1 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-[#c8b8e8] transition-colors hover:border-[#c8a96e]/50 hover:text-[#c8a96e] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isDirty || isSaving}
                  className="flex-1 rounded-lg bg-[#c8a96e] px-3 py-2 text-sm font-medium text-[#1a1525] transition-colors hover:bg-[#d9bc82] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={pendingRemove !== null}
        title="Remove shared user?"
        message={`"${pendingRemove}" will lose access to this note once you save. This won't take effect until you click Save.`}
        confirmLabel="Remove"
        destructive
        onConfirm={handleConfirmRemove}
        onCancel={() => setPendingRemove(null)}
      />
    </div>
  );
}
