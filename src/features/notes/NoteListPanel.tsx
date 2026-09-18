import { useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { formatDate } from '../../utils/date';
import ConfirmDialog from '../../components/ConfirmDialog';
import { ShareIcon, TrashIcon } from '../../components/icons';
import type { NoteFilter, NoteListItem, SelectedNoteRef } from '../../types/notes';

const spinnerClass =
  'inline-block w-5 h-5 border-2 border-[#c8a96e]/30 border-t-[#c8a96e] rounded-full animate-spin shrink-0';

const FILTER_OPTIONS: { value: NoteFilter; label: string }[] = [
  { value: 'MY', label: 'My notes' },
  { value: 'SHARED', label: 'Shared to me' },
  { value: 'ALL', label: 'All' },
];

interface ContextMenuState {
  item: NoteListItem;
  x: number;
  y: number;
}

interface NoteListPanelProps {
  items: NoteListItem[];
  filter: NoteFilter;
  onFilterChange: (filter: NoteFilter) => void;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  selected: SelectedNoteRef | null;
  onSelect: (ref: SelectedNoteRef) => void;
  onLoadMore: () => void;
  onDeleteNote: (id: number) => Promise<{ ok: boolean; error?: string }>;
}

export default function NoteListPanel({
  items,
  filter,
  onFilterChange,
  loading,
  loadingMore,
  error,
  hasMore,
  selected,
  onSelect,
  onLoadMore,
  onDeleteNote,
}: NoteListPanelProps) {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<NoteListItem | null>(null);
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

  function handleContextMenu(e: ReactMouseEvent, item: NoteListItem) {
    // Deleting is an owner-only action — shared notes get no context menu.
    if (item.kind !== 'own') return;
    e.preventDefault();
    setMenu({ item, x: e.clientX, y: e.clientY });
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await onDeleteNote(pendingDelete.note.id);
    setDeleting(false);
    if (result.ok) setPendingDelete(null);
    else setDeleteError(result.error ?? 'Failed to delete note.');
  }

  const filterSelect = (
    <div className="px-3 pt-3 pb-1">
      <select
        value={filter}
        onChange={e => onFilterChange(e.target.value as NoteFilter)}
        aria-label="Filter notes"
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#f0eaf8] outline-none focus:border-[#c8a96e]/60 cursor-pointer"
      >
        {FILTER_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-[#241c33] text-[#f0eaf8]">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <>
      {filterSelect}
      {renderContent()}

      {menu && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Actions for ${menu.item.note.title || 'Untitled'}`}
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
              setPendingDelete(menu.item);
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
        message={`"${pendingDelete?.note.title || 'Untitled'}" will be permanently deleted. This can't be undone.`}
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

    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-1.5 py-16 px-6 text-center">
          <p className="text-[#f0eaf8] font-medium m-0">
            {filter === 'SHARED' ? 'No shared notes yet' : 'No notes yet'}
          </p>
          <p className="text-sm text-[#f0eaf8]/50 m-0">
            {filter === 'SHARED'
              ? 'Notes others share with you will show up here.'
              : filter === 'ALL'
                ? 'Notes you create or that others share with you will show up here.'
                : 'Notes you create will show up here.'}
          </p>
        </div>
      );
    }

    return (
      <div>
        <ul className="list-none m-0 p-2 flex flex-col gap-1" aria-label="Your notes">
          {items.map(item => {
            const isSelected = item.kind === selected?.kind && item.id === selected?.id;
            return (
              <li key={`${item.kind}-${item.id}`}>
                <button
                  type="button"
                  onClick={() => onSelect({ id: item.id, kind: item.kind })}
                  onContextMenu={e => handleContextMenu(e, item)}
                  aria-current={isSelected}
                  className={`w-full text-left rounded-lg px-4 py-3 transition-colors duration-150 border cursor-pointer ${
                    isSelected
                      ? 'bg-[#c8a96e]/12 border-[#c8a96e]/50'
                      : 'bg-transparent border-transparent hover:bg-white/5'
                  }`}
                >
                  <p className="flex items-center gap-1.5 text-[#f0eaf8] font-medium m-0 mb-1 truncate">
                    {item.kind === 'shared' && (
                      <ShareIcon className="h-3.5 w-3.5 shrink-0 text-[#c8b8e8]/70" />
                    )}
                    <span className="truncate">{item.note.title || 'Untitled'}</span>
                  </p>
                  <p className="text-xs text-[#c8b8e8]/80 m-0 truncate">
                    {item.kind === 'shared' ? `Shared by ${item.note.authorName}` : item.note.authorName} ·{' '}
                    {formatDate(item.note.dateModified)}
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
