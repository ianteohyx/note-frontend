import { useEffect, useState } from 'react';
import { EditorContent, type Editor } from '@tiptap/react';
import { formatDate } from '../../utils/date';
import type { NoteDto } from '../../types/notes';

const SAVED_TOAST_DURATION_MS = 2000;

const spinnerClass =
  'inline-block w-5 h-5 border-2 border-[#c8a96e]/30 border-t-[#c8a96e] rounded-full animate-spin shrink-0';

interface NoteDetailPanelProps {
  note: NoteDto | null;
  loading: boolean;
  error: string | null;
  selectedId: number | null;
  onBack: () => void;
  editor: Editor | null;
  saving: boolean;
  saveError: string | null;
  lastSavedAt: string | null;
}

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export default function NoteDetailPanel({
  note,
  loading,
  error,
  selectedId,
  onBack,
  editor,
  saving,
  saveError,
  lastSavedAt,
}: NoteDetailPanelProps) {
  // Adjusted directly during render (React's documented escape hatch) rather than in
  // an effect: when `saving` flips from true to false with no error, flag the "Saved"
  // toast to show. A separate effect owns the actual side effect — the hide timer.
  const [prevSaving, setPrevSaving] = useState(saving);
  const [showSavedToast, setShowSavedToast] = useState(false);
  if (saving !== prevSaving) {
    setPrevSaving(saving);
    if (!saving && !saveError) setShowSavedToast(true);
  }

  useEffect(() => {
    if (!showSavedToast) return;
    const timer = setTimeout(() => setShowSavedToast(false), SAVED_TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [showSavedToast]);

  const toast = saving ? 'Saving…' : showSavedToast ? 'Saved' : null;

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
    <div className="p-6 animate-[card-in_0.2s_ease]">
      <button
        type="button"
        onClick={onBack}
        className="md:hidden mb-4 text-sm text-[#c8b8e8] hover:text-[#c8a96e] transition-colors"
      >
        ← Back to notes
      </button>

      <p className="text-center text-xs text-[#c8b8e8]/70 mb-4">
        By {note.authorName} · Created {formatDate(note.dateCreated)}
        {lastSavedAt && lastSavedAt !== note.dateCreated && ` · Edited ${formatDate(lastSavedAt)}`}
      </p>

      {saveError && (
        <p
          className="max-w-[720px] bg-[#e07a7a]/12 border border-[#e07a7a]/35 rounded-lg px-4 py-3 text-sm text-[#e07a7a] mb-3"
          role="alert"
        >
          {saveError}
        </p>
      )}

      <div className="max-w-[720px]">
        <EditorContent editor={editor} className="tiptap-editor text-[#f0eaf8]/90" />
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm shadow-lg shadow-black/30 animate-[toast-in_0.2s_ease] ${
            toast === 'Saved'
              ? 'border-[#6fcf97]/50 bg-[#6fcf97]/10 text-[#6fcf97]'
              : 'border-white/10 bg-[#241c33] text-[#f0eaf8]'
          }`}
          role="status"
          aria-live="polite"
        >
          {toast === 'Saving…' && (
            <span
              className="inline-block w-3 h-3 border-2 border-[#c8b8e8]/30 border-t-[#c8b8e8] rounded-full animate-spin"
              aria-hidden="true"
            />
          )}
          {toast === 'Saved' && <CheckIcon className="w-4 h-4 shrink-0" />}
          {toast}
        </div>
      )}
    </div>
  );
}
