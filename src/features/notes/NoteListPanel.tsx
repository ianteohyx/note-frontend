import { useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { formatDate } from '../../utils/date';
import ConfirmDialog from '../../components/ConfirmDialog';
import type { NoteDto } from '../../types/notes';

const spinnerClass =
  'inline-block w-5 h-5 border-2 border-[#c8a96e]/30 border-t-[#c8a96e] rounded-full animate-spin shrink-0';

const TrashIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
  </svg>
);

interface ContextMenuState {
  note: NoteDto;
  x: number;
  y: number;
}

interface NoteListPanelProps {
  notes: NoteDto[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onLoadMore: () => void;
  onDeleteNote: (id: number) => Promise<{ ok: boolean; error?: string }>;
}

export default function NoteListPanel({
  notes,
  loading,
  loadingMore,
  error,
  hasMore,
  selectedId,
  onSelect,
  onLoadMore,
  onDeleteNote,
}: NoteListPanelProps) {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<NoteDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Dismiss the context menu on any outside interaction.
  useEffect(() => {
    if (!menu) return;

    function close() {
      setMenu(null);
    }
    function handlePointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) close();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [menu]);

  function handleContextMenu(e: ReactMouseEvent, note: NoteDto) {
    e.preventDefault();
    setMenu({ note, x: e.clientX, y: e.clientY });
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await onDeleteNote(pendingDelete.id);
    setDeleting(false);
    if (result.ok) setPendingDelete(null);
    else setDeleteError(result.error ?? 'Failed to delete note.');
  }

  return (
    <>
      {renderContent()}

      {menu && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Actions for ${menu.note.title || 'Untitled'}`}
          className="fixed z-50 min-w-40 rounded-lg border border-white/10 bg-[#241c33] p-1 shadow-xl shadow-black/40 animate-[toast-in_0.12s_ease]"
          style={{
            top: Math.min(menu.y, window.innerHeight - 60),
            left: Math.min(menu.x, window.innerWidth - 176),
          }}
        >
          <button
            type="button"
            role="menuitem"
            autoFocus
            onClick={() => {
              setPendingDelete(menu.note);
              setDeleteError(null);
              setMenu(null);
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[#e07a7a] transition-colors hover:bg-[#e07a7a]/12 cursor-pointer"
          >
            <TrashIcon className="h-4 w-4 shrink-0" />
            Delete note
          </button>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete note?"
        message={`"${pendingDelete?.title || 'Untitled'}" will be permanently deleted. This can't be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (deleting) return;
          setPendingDelete(null);
          setDeleteError(null);
        }}
      />
    </>
  );

  function renderContent() {
    if (loading) {
      return (
        <div className="flex items-center justify-center gap-2 py-16 text-[#f0eaf8]/55 text-sm">
          <span className={spinnerClass} aria-hidden="true" />
          Loading notes…
        </div>
      );
    }

    if (error) {
      return (
        <p
          className="bg-[#e07a7a]/12 border border-[#e07a7a]/35 rounded-lg mx-4 mt-4 px-4 py-3 text-sm text-[#e07a7a]"
          role="alert"
        >
          {error}
        </p>
      );
    }

    if (notes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-1.5 py-16 px-6 text-center">
          <p className="text-[#f0eaf8] font-medium m-0">No notes yet</p>
          <p className="text-sm text-[#f0eaf8]/50 m-0">Notes you create will show up here.</p>
        </div>
      );
    }

    return (
      <div>
        <ul className="list-none m-0 p-2 flex flex-col gap-1" aria-label="Your notes">
          {notes.map(note => {
            const isSelected = note.id === selectedId;
            return (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => onSelect(note.id)}
                  onContextMenu={e => handleContextMenu(e, note)}
                  aria-current={isSelected}
                  className={`w-full text-left rounded-lg px-4 py-3 transition-colors duration-150 border cursor-pointer ${
                    isSelected
                      ? 'bg-[#c8a96e]/12 border-[#c8a96e]/50'
                      : 'bg-transparent border-transparent hover:bg-white/5'
                  }`}
                >
                  <p className="text-[#f0eaf8] font-medium m-0 mb-1 truncate">{note.title || 'Untitled'}</p>
                  <p className="text-xs text-[#c8b8e8]/80 m-0 truncate">
                    {note.authorName} · {formatDate(note.dateModified)}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>

        {hasMore && (
          <div className="flex justify-center py-3">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 text-sm text-[#c8b8e8] hover:text-[#c8a96e] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loadingMore && <span className={spinnerClass} aria-hidden="true" />}
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    );
  }
}
