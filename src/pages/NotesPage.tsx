import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NoteListPanel from '../features/notes/NoteListPanel';
import NoteDetailPanel from '../features/notes/NoteDetailPanel';
import { useNotes } from '../hooks/useNotes';
import { useNote } from '../hooks/useNote';
import { useAuth } from '../hooks/useAuth';

const NewNoteIcon = ({ className }: { className?: string }) => (
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
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M12 12v6M9 15h6" />
  </svg>
);

export default function NotesPage() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);

  const { notes, loading, loadingMore, error, hasMore, loadMore, addNote, creating, createError } = useNotes();
  const { note, loading: noteLoading, error: noteError } = useNote(selectedNoteId);

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
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-[#c8a96e] tracking-[0.05em] m-0">I-Note</h1>
          <button
            type="button"
            onClick={handleCreateNote}
            disabled={creating}
            aria-label="Create new note"
            title="New note"
            className="flex items-center justify-center text-[#c8a96e] cursor-pointer transition-colors duration-150 hover:text-[#d9bc82] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? (
              <span
                className="inline-block w-5 h-5 border-2 border-[#c8a96e]/30 border-t-[#c8a96e] rounded-full animate-spin"
                aria-hidden="true"
              />
            ) : (
              <NewNoteIcon className="w-5 h-5" />
            )}
          </button>
        </div>
        <div className="flex items-center gap-4">
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
          />
        </section>
      </main>
    </div>
  );
}
