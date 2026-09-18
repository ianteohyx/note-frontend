import { useCallback, useEffect, useRef, useState } from 'react';
import { useSharedUsers } from '../../hooks/useSharedUsers';
import { useUpdateSharePermissions } from '../../hooks/useUpdateSharePermissions';
import { UsersIcon } from '../../components/icons';
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
  const [overrides, setOverrides] = useState<Record<string, Permission>>({});
  const wrapperRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setOverrides({});
    reset();
    resetSave();
  }, [reset, resetSave]);

  // Switching notes should never leak the previous note's shared-users popover/state.
  // Adjusted directly during render (React's documented escape hatch) rather than in
  // an effect, matching the prevSaving pattern in NoteDetailPanel.
  const [prevNoteId, setPrevNoteId] = useState(noteId);
  if (noteId !== prevNoteId) {
    setPrevNoteId(noteId);
    setOpen(false);
    setOverrides({});
    reset();
    resetSave();
  }

  useEffect(() => {
    if (!open) return;
    fetchSharedUsers(noteId);

    function handlePointerDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) close();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
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

  const changes: UpdateSharePermissionItem[] = sharedUsers
    .filter(u => overrides[u.username] !== undefined && overrides[u.username] !== u.permission)
    .map(u => ({ noteId, sharedToUsername: u.username, permission: overrides[u.username] }));
  const isDirty = changes.length > 0;

  async function handleSave() {
    if (!isDirty || saving) return;
    const ok = await updatePermissions(changes);
    if (ok) {
      setOverrides({});
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
              <ul className="m-0 flex max-h-56 list-none flex-col gap-2 overflow-y-auto p-0">
                {sharedUsers.map(u => (
                  <li key={u.username} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-[#f0eaf8]">{u.username}</span>
                    <select
                      value={overrides[u.username] ?? u.permission}
                      onChange={e =>
                        setOverrides(prev => ({ ...prev, [u.username]: e.target.value as Permission }))
                      }
                      disabled={saving}
                      aria-label={`Permission for ${u.username}`}
                      className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-[#c8b8e8] outline-none focus:border-[#c8a96e]/60 disabled:opacity-60 cursor-pointer"
                    >
                      <option value="READ" className="bg-[#241c33] text-[#f0eaf8]">
                        Read only
                      </option>
                      <option value="WRITE" className="bg-[#241c33] text-[#f0eaf8]">
                        Read and write
                      </option>
                    </select>
                  </li>
                ))}
              </ul>

              {saveError && (
                <p className="m-0 mt-3 text-xs text-[#e07a7a]" role="alert">
                  {saveError}
                </p>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || saving}
                className="mt-3 w-full rounded-lg bg-[#c8a96e] px-3 py-2 text-sm font-medium text-[#1a1525] transition-colors hover:bg-[#d9bc82] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
