import { formatDate } from '../../utils/date';
import type { NoteDto } from '../../types/notes';

const spinnerClass =
  'inline-block w-5 h-5 border-2 border-[#c8a96e]/30 border-t-[#c8a96e] rounded-full animate-spin shrink-0';

interface NoteListPanelProps {
  notes: NoteDto[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onLoadMore: () => void;
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
}: NoteListPanelProps) {
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
