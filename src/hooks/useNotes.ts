import { useCallback, useEffect, useState } from 'react';
import { createNote, deleteNote as deleteNoteApi, getAllNotes } from '../api/notes';
import { useAuth } from './useAuth';
import type { NoteDto, GetAllNoteResponse } from '../types/notes';
import type { ErrorResponse } from '../types/auth';

const PAGE_SIZE = 20;
const NEW_NOTE_TITLE = 'New Note';

interface UseNotesResult {
  notes: NoteDto[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  addNote: () => Promise<{ ok: boolean; note?: NoteDto; error?: string }>;
  creating: boolean;
  createError: string | null;
  deleteNote: (id: number) => Promise<{ ok: boolean; error?: string }>;
  patchNoteInList: (id: number, patch: Partial<Pick<NoteDto, 'title' | 'dateModified'>>) => void;
}

export function useNotes(): UseNotesResult {
  const { token } = useAuth();
  const [notes, setNotes] = useState<NoteDto[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (pageToFetch: number, append: boolean) => {
      if (!token) return;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await getAllNotes(token, pageToFetch, PAGE_SIZE);
        if (res.responseOutcome === 'SUCCESS') {
          const success = res as GetAllNoteResponse;
          setNotes(prev => (append ? [...prev, ...success.notes] : success.notes));
          setPage(success.page);
          setTotalPages(success.totalPages);
        } else {
          setError((res as ErrorResponse).message ?? 'Failed to load notes.');
        }
      } catch {
        setError('Network error. Please check your connection and try again.');
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchPage(0, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (page + 1 < totalPages) fetchPage(page + 1, true);
  }, [fetchPage, page, totalPages]);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const addNote = useCallback(async (): Promise<{ ok: boolean; note?: NoteDto; error?: string }> => {
    if (!token) return { ok: false, error: 'Your session has expired. Please log in again.' };
    setCreating(true);
    setCreateError(null);

    try {
      const createRes = await createNote({ noteTitle: NEW_NOTE_TITLE, noteContent: '' }, token);
      if (createRes.responseOutcome !== 'SUCCESS') {
        const message = (createRes as ErrorResponse).message ?? 'Failed to create note.';
        setCreateError(message);
        return { ok: false, error: message };
      }

      // Create response carries no note data, so fetch the note back — it is
      // guaranteed to sort first since the list is ordered by dateModified desc.
      const listRes = await getAllNotes(token, 0, 1);
      if (listRes.responseOutcome !== 'SUCCESS') {
        const message = (listRes as ErrorResponse).message ?? 'Note created, but failed to load it.';
        setCreateError(message);
        return { ok: false, error: message };
      }

      const newNote = (listRes as GetAllNoteResponse).notes[0] ?? null;
      if (!newNote) return { ok: false, error: 'Note created, but failed to load it.' };
      setNotes(prev => [newNote, ...prev]);
      return { ok: true, note: newNote };
    } catch {
      const message = 'Network error. Please check your connection and try again.';
      setCreateError(message);
      return { ok: false, error: message };
    } finally {
      setCreating(false);
    }
  }, [token]);

  const deleteNote = useCallback(
    async (id: number): Promise<{ ok: boolean; error?: string }> => {
      if (!token) return { ok: false, error: 'Your session has expired. Please log in again.' };

      try {
        const res = await deleteNoteApi(id, token);
        if (res.responseOutcome === 'SUCCESS') {
          setNotes(prev => prev.filter(n => n.id !== id));
          return { ok: true };
        }
        return { ok: false, error: (res as ErrorResponse).message ?? 'Failed to delete note.' };
      } catch {
        return { ok: false, error: 'Network error. Please check your connection and try again.' };
      }
    },
    [token],
  );

  const patchNoteInList = useCallback(
    (id: number, patch: Partial<Pick<NoteDto, 'title' | 'dateModified'>>) => {
      setNotes(prev => {
        const idx = prev.findIndex(n => n.id === id);
        if (idx === -1) return prev;
        const updated = { ...prev[idx], ...patch };
        // Mirror the backend's dateModified-desc sort so the edited note bubbles to the top.
        return [updated, ...prev.filter(n => n.id !== id)];
      });
    },
    [],
  );

  return {
    notes,
    loading,
    loadingMore,
    error,
    hasMore: page + 1 < totalPages,
    loadMore,
    addNote,
    creating,
    createError,
    deleteNote,
    patchNoteInList,
  };
}
