import { formatDate } from '../../utils/date';
import type { NoteDto } from '../../types/notes';

const spinnerClass =
  'inline-block w-5 h-5 border-2 border-[#c8a96e]/30 border-t-[#c8a96e] rounded-full animate-spin shrink-0';

interface NoteDetailPanelProps {
  note: NoteDto | null;
  loading: boolean;
  error: string | null;
  selectedId: number | null;
  onBack: () => void;
}

export default function NoteDetailPanel({ note, loading, error, selectedId, onBack }: NoteDetailPanelProps) {
  if (selectedId === null) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 h-full py-16 px-6 text-center">
        <p className="text-[#f0eaf8] font-medium m-0">No note selected</p>
        <p className="text-sm text-[#f0eaf8]/50 m-0">Choose a note from the list to view its details.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-[#f0eaf8]/55 text-sm">
        <span className={spinnerClass} aria-hidden="true" />
        Loading note…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p
          className="bg-[#e07a7a]/12 border border-[#e07a7a]/35 rounded-lg px-4 py-3 text-sm text-[#e07a7a]"
          role="alert"
        >
          {error}
        </p>
      </div>
    );
  }

  if (!note) return null;

  return (
    <div className="p-6 animate-[card-in_0.2s_ease] max-w-[720px]">
      <button
        type="button"
        onClick={onBack}
        className="md:hidden mb-4 text-sm text-[#c8b8e8] hover:text-[#c8a96e] transition-colors"
      >
        ← Back to notes
      </button>

      <h2 className="text-2xl font-semibold text-[#f0eaf8] m-0 mb-2 break-words">{note.title || 'Untitled'}</h2>
      <p className="text-sm text-[#c8b8e8]/80 m-0 mb-6">
        By {note.authorName} · Created {formatDate(note.dateCreated)}
        {note.dateModified !== note.dateCreated && ` · Edited ${formatDate(note.dateModified)}`}
      </p>

      <p className="text-[#f0eaf8]/90 whitespace-pre-wrap leading-relaxed m-0">
        {note.content || <span className="text-[#f0eaf8]/40 italic">This note has no content.</span>}
      </p>
    </div>
  );
}
