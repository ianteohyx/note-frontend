import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import NoteListPanel from '../features/notes/NoteListPanel';
import NoteDetailPanel from '../features/notes/NoteDetailPanel';
import ToolbarButton from '../components/ToolbarButton';
import { useNotes } from '../hooks/useNotes';
import { useReceivedShares } from '../hooks/useReceivedShares';
import { useNote } from '../hooks/useNote';
import { useAutosaveNote } from '../hooks/useAutosaveNote';
import { useAuth } from '../hooks/useAuth';
import type { NoteFilter, NoteListItem, SelectedNoteRef } from '../types/notes';

const LIST_WIDTH_DEFAULT = 320;
const LIST_WIDTH_MIN = 240;
const LIST_WIDTH_MAX = 560;

export default function NotesPage() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<NoteFilter>('MY');
  const [selected, setSelected] = useState<SelectedNoteRef | null>(null);

  // Resizable note-list panel: dragging the divider between the two panels
  // adjusts this width (desktop only — the mobile layout stacks the panels
  // and ignores it, see the `md:` grid-template-columns below).
  const [listWidth, setListWidth] = useState(LIST_WIDTH_DEFAULT);
  const resizingRef = useRef(false);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!resizingRef.current) return;
      setListWidth(w => Math.min(LIST_WIDTH_MAX, Math.max(LIST_WIDTH_MIN, w + e.movementX)));
    }
    function handleMouseUp() {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  function handleResizerMouseDown(e: ReactMouseEvent) {
    e.preventDefault();
    resizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  const {
    notes,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    addNote,
    creating,
    deleteNote,
    patchNoteInList,
  } = useNotes();
  const {
    sharedNotes,
    loading: sharedLoading,
    loadingMore: sharedLoadingMore,
    error: sharedError,
    hasMore: sharedHasMore,
    loadMore: sharedLoadMore,
    patchSharedNoteInList,
  } = useReceivedShares();

  const ownItems = useMemo<NoteListItem[]>(
    () => notes.map(note => ({ id: note.id, kind: 'own' as const, note })),
    [notes],
  );
  const sharedItems = useMemo<NoteListItem[]>(
    () => sharedNotes.map(sn => ({ id: sn.id, kind: 'shared' as const, note: sn.note })),
    [sharedNotes],
  );
  const visibleItems = useMemo<NoteListItem[]>(() => {
    if (filter === 'MY') return ownItems;
    if (filter === 'SHARED') return sharedItems;
    return [...ownItems, ...sharedItems].sort(
      (a, b) => new Date(b.note.dateModified).getTime() - new Date(a.note.dateModified).getTime(),
    );
  }, [filter, ownItems, sharedItems]);

  const listLoading = filter === 'SHARED' ? sharedLoading : filter === 'ALL' ? loading || sharedLoading : loading;
  const listLoadingMore =
    filter === 'SHARED' ? sharedLoadingMore : filter === 'ALL' ? loadingMore || sharedLoadingMore : loadingMore;
  const listError = filter === 'SHARED' ? sharedError : filter === 'ALL' ? (error ?? sharedError) : error;
  const listHasMore = filter === 'SHARED' ? sharedHasMore : filter === 'ALL' ? hasMore || sharedHasMore : hasMore;

  function handleLoadMore() {
    if (filter !== 'SHARED') loadMore();
    if (filter !== 'MY') sharedLoadMore();
  }

  const { note, permission, loading: noteLoading, error: noteError } = useNote(selected);
  // Lifted up (rather than owned by NoteDetailPanel) so the formatting toolbar in the
  // header can read and drive the same editor instance the detail panel renders.
  const { editor, saving, saveError, lastSavedAt } = useAutosaveNote(selected, note, permission, handleNoteSaved);

  function handleNoteSaved(target: SelectedNoteRef, noteId: number, patch: { title: string; dateModified: string }) {
    if (target.kind === 'own') patchNoteInList(noteId, patch);
    else patchSharedNoteInList(noteId, patch);
  }

  // Auto-select the first note once, right after the initial list load finishes,
  // so the detail panel isn't left on the "no note selected" empty state after login.
  // Adjusted directly during render (React's documented escape hatch for this) rather
  // than in an effect, guarded by hasAutoSelected so it never re-fires afterwards —
  // in particular it won't override the user intentionally deselecting a note via the
  // mobile "back to list" button.
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  if (!hasAutoSelected && !loading) {
    setHasAutoSelected(true);
    if (selected === null && notes.length > 0) {
      setSelected({ id: notes[0].id, kind: 'own' });
    }
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  async function handleCreateNote(): Promise<{ ok: boolean; error?: string }> {
    const result = await addNote();
    if (result.ok && result.note) setSelected({ id: result.note.id, kind: 'own' });
    return { ok: result.ok, error: result.error };
  }

  async function handleDeleteNote(id: number) {
    const result = await deleteNote(id);
    if (result.ok && selected?.kind === 'own' && selected.id === id) {
      // Selection follows the issue spec: jump to the first note of the updated, currently visible list.
      const remaining = visibleItems.filter(item => !(item.kind === 'own' && item.note.id === id));
      setSelected(remaining[0] ? { id: remaining[0].id, kind: remaining[0].kind } : null);
    }
    return result;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#1a1525]">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-6 py-4 border-b border-white/8 shrink-0">
        <h1 className="justify-self-start text-xl font-bold text-[#c8a96e] tracking-[0.05em] m-0">I-Note</h1>

        <div className="justify-self-center flex items-center gap-2">
          {note && permission === 'WRITE' && (
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

      <main
        className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[var(--list-width)_auto_1fr] overflow-hidden"
        style={{ '--list-width': `${listWidth}px` } as CSSProperties}
      >
        <section
          aria-label="Note list"
          className={`${
            selected !== null ? 'hidden md:block' : 'block'
          } min-h-0 border-r border-white/8 overflow-y-auto`}
        >
          <NoteListPanel
            items={visibleItems}
            filter={filter}
            onFilterChange={setFilter}
            loading={listLoading}
            loadingMore={listLoadingMore}
            error={listError}
            hasMore={listHasMore}
            selected={selected}
            onSelect={setSelected}
            onLoadMore={handleLoadMore}
            onDeleteNote={handleDeleteNote}
            onAddNote={handleCreateNote}
            creating={creating}
          />
        </section>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize note list panel"
          onMouseDown={handleResizerMouseDown}
          className="hidden md:block w-1.5 shrink-0 cursor-col-resize bg-white/5 hover:bg-[#c8a96e]/40 transition-colors"
        />

        <section
          aria-label="Note details"
          className={`${selected !== null ? 'block' : 'hidden md:block'} min-h-0 overflow-y-auto`}
        >
          <NoteDetailPanel
            note={note}
            permission={permission}
            loading={noteLoading}
            error={noteError}
            selected={selected}
            onBack={() => setSelected(null)}
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
