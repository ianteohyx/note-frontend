import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useShareNote } from '../../hooks/useShareNote';
import { CloseIcon, ShareIcon } from '../../components/icons';
import type { Permission } from '../../types/shares';

const spinnerClass =
  'inline-block w-4 h-4 border-2 border-[#c8b8e8]/30 border-t-[#c8b8e8] rounded-full animate-spin shrink-0';

interface ShareNoteButtonProps {
  noteId: number;
}

export default function ShareNoteButton({ noteId }: ShareNoteButtonProps) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [permission, setPermission] = useState<Permission>('READ');
  const { sharing, shareError, shareSuccess, share, reset } = useShareNote();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setUsername('');
    setPermission('READ');
    reset();
  }, [reset]);

  // Switching notes should never leak the previous note's share popover/state. Adjusted
  // directly during render (React's documented escape hatch) rather than in an effect,
  // matching the prevSaving pattern in NoteDetailPanel.
  const [prevNoteId, setPrevNoteId] = useState(noteId);
  if (noteId !== prevNoteId) {
    setPrevNoteId(noteId);
    setOpen(false);
    setUsername('');
    setPermission('READ');
    reset();
  }

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();

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
  }, [open, close]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed || sharing) return;
    await share(noteId, trimmed, permission);
  }

  return (
    <div ref={wrapperRef} className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {open && (
        <div
          role="dialog"
          aria-label="Share this note"
          className="w-72 rounded-xl border border-white/10 bg-[#241c33] p-4 shadow-2xl shadow-black/50 animate-[card-in_0.15s_ease]"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="m-0 text-sm font-semibold text-[#f0eaf8]">Share note</h2>
            <button
              type="button"
              aria-label="Close"
              onClick={close}
              className="text-[#c8b8e8] hover:text-[#f0eaf8] transition-colors cursor-pointer"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={username}
                onChange={e => {
                  setUsername(e.target.value);
                  if (shareError || shareSuccess) reset();
                }}
                placeholder="Username"
                disabled={sharing}
                aria-label="Username to share with"
                aria-invalid={!!shareError}
                className="flex-1 min-w-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#f0eaf8] placeholder:text-[#f0eaf8]/40 outline-none focus:border-[#c8a96e]/60 disabled:opacity-60"
              />
              {sharing && <span className={spinnerClass} aria-hidden="true" />}
            </div>

            <select
              value={permission}
              onChange={e => {
                setPermission(e.target.value as Permission);
                if (shareError || shareSuccess) reset();
              }}
              disabled={sharing}
              aria-label="Permission level"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#f0eaf8] outline-none focus:border-[#c8a96e]/60 disabled:opacity-60 cursor-pointer"
            >
              <option value="READ" className="bg-[#241c33] text-[#f0eaf8]">
                Read only
              </option>
              <option value="WRITE" className="bg-[#241c33] text-[#f0eaf8]">
                Read and write
              </option>
            </select>

            {shareError && (
              <p className="m-0 text-xs text-[#e07a7a]" role="alert">
                {shareError}
              </p>
            )}
            {!shareError && shareSuccess && (
              <p className="m-0 text-xs text-[#6fcf97]" role="status">
                Shared successfully!
              </p>
            )}

            <button
              type="submit"
              disabled={sharing || !username.trim()}
              className="mt-1.5 rounded-lg bg-[#c8a96e] px-3 py-2 text-sm font-medium text-[#1a1525] transition-colors hover:bg-[#d9bc82] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {sharing ? 'Sharing…' : 'Share'}
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        aria-label="Share note"
        title="Share note"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#c8a96e] text-[#1a1525] shadow-lg shadow-black/30 transition-transform hover:scale-105 hover:bg-[#d9bc82] cursor-pointer"
      >
        <ShareIcon className="h-6 w-6" />
      </button>
    </div>
  );
}
