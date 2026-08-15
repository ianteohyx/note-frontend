import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NoteListPanel from '../features/notes/NoteListPanel';
import NoteDetailPanel from '../features/notes/NoteDetailPanel';
import { useNotes } from '../hooks/useNotes';
import { useNote } from '../hooks/useNote';
import { useAuth } from '../hooks/useAuth';

export default function NotesPage() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);

  const { notes, loading, loadingMore, error, hasMore, loadMore } = useNotes();
  const { note, loading: noteLoading, error: noteError } = useNote(selectedNoteId);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#1a1525]">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
        <h1 className="text-xl font-bold text-[#c8a96e] tracking-[0.05em] m-0">I-Note</h1>
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
