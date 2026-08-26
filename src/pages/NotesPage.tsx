import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NoteListPanel from '../features/notes/NoteListPanel';
import NoteDetailPanel from '../features/notes/NoteDetailPanel';
import ToolbarButton from '../components/ToolbarButton';
import { useNotes } from '../hooks/useNotes';
import { useNote } from '../hooks/useNote';
import { useAutosaveNote } from '../hooks/useAutosaveNote';
import { useAuth } from '../hooks/useAuth';

const AddNoteIcon = ({ className }: { className?: string }) => (
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
    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
  </svg>
);

export default function NotesPage() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);

  const {
    notes,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    addNote,
    creating,
    createError,
    patchNoteInList,
  } = useNotes();
  const { note, loading: noteLoading, error: noteError } = useNote(selectedNoteId);
  // Lifted up (rather than owned by NoteDetailPanel) so the formatting toolbar in the
  // header can read and drive the same editor instance the detail panel renders.
  const { editor, saving, saveError, lastSavedAt } = useAutosaveNote(note, patchNoteInList);

  // Auto-select the first note once, right after the initial list load finishes,
  // so the detail panel isn't left on the "no note selected" empty state after login.
  // Adjusted directly during render (React's documented escape hatch for this) rather
  // than in an effect, guarded by hasAutoSelected so it never re-fires afterwards —
  // in particular it won't override the user intentionally deselecting a note via the
  // mobile "back to list" button.
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  if (!hasAutoSelected && !loading) {
    setHasAutoSelected(true);
    if (selectedNoteId === null && notes.length > 0) {
      setSelectedNoteId(notes[0].id);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  async function handleCreateNote() {
    const newNote = await addNote();
    if (newNote) setSelectedNoteId(newNote.id);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#1a1525]">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-6 py-4 border-b border-white/8 shrink-0">
        <h1 className="justify-self-start text-xl font-bold text-[#c8a96e] tracking-[0.05em] m-0">I-Note</h1>

        <div className="justify-self-center flex items-center gap-2">
          <div className="rounded-full border border-white/10 bg-white/5 px-1.5 py-1">
            <button
              type="button"
              onClick={handleCreateNote}
              disabled={creating}
              aria-label="Add note"
              title="Add note"
              className="flex items-center justify-center w-8 h-8 rounded-full text-[#c8a96e] hover:text-[#d9bc82] hover:bg-white/8 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <span
                  className="inline-block w-4 h-4 border-2 border-[#c8a96e]/30 border-t-[#c8a96e] rounded-full animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <AddNoteIcon className="w-4.5 h-4.5" />
              )}
            </button>
          </div>

          {note && (
            <div
              className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-1.5 py-1"
              role="toolbar"
              aria-label="Text formatting"
            >
              <ToolbarButton
                label="Bold"
                glyphClassName="font-bold"
                active={!!editor?.isActive('bold')}
                disabled={!editor}
                onClick={() => editor?.chain().focus().toggleBold().run()}
              >
                B
              </ToolbarButton>
              <ToolbarButton
                label="Italic"
                glyphClassName="italic"
                active={!!editor?.isActive('italic')}
                disabled={!editor}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
              >
                I
              </ToolbarButton>
              <ToolbarButton
                label="Underline"
                glyphClassName="underline"
                active={!!editor?.isActive('underline')}
                disabled={!editor}
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
              >
                U
              </ToolbarButton>
              <ToolbarButton
                label="Strikethrough"
                glyphClassName="line-through"
                active={!!editor?.isActive('strike')}
                disabled={!editor}
                onClick={() => editor?.chain().focus().toggleStrike().run()}
              >
                S
              </ToolbarButton>
            </div>
          )}
        </div>

        <div className="justify-self-end flex items-center gap-4">
          <span className="text-sm text-[#f0eaf8]/70 hidden sm:inline">{username}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-[#c8b8e8] hover:text-[#c8a96e] transition-colors cursor-pointer"
          >
            Log out
          </button>
        </div>
      </header>

      {createError && (
        <p
          className="bg-[#e07a7a]/12 border border-[#e07a7a]/35 rounded-lg mx-6 mt-4 px-4 py-3 text-sm text-[#e07a7a] shrink-0"
          role="alert"
        >
          {createError}
        </p>
      )}

      <main className="flex-1 grid grid-cols-1 md:grid-cols-[320px_1fr] overflow-hidden">
        <section
          aria-label="Note list"
          className={`${
            selectedNoteId !== null ? 'hidden md:block' : 'block'
          } border-r border-white/8 overflow-y-auto`}
        >
          <NoteListPanel
            notes={notes}
            loading={loading}
            loadingMore={loadingMore}
            error={error}
            hasMore={hasMore}
            selectedId={selectedNoteId}
            onSelect={setSelectedNoteId}
            onLoadMore={loadMore}
          />
        </section>

        <section
          aria-label="Note details"
          className={`${selectedNoteId !== null ? 'block' : 'hidden md:block'} overflow-y-auto`}
        >
          <NoteDetailPanel
            note={note}
            loading={noteLoading}
            error={noteError}
            selectedId={selectedNoteId}
            onBack={() => setSelectedNoteId(null)}
            editor={editor}
            saving={saving}
            saveError={saveError}
            lastSavedAt={lastSavedAt}
          />
        </section>
      </main>
    </div>
  );
}
