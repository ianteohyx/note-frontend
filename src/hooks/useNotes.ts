import { useCallback, useEffect, useState } from 'react';
import { createNote, getAllNotes } from '../api/notes';
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
  addNote: () => Promise<NoteDto | null>;
  creating: boolean;
  createError: string | null;
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

  const addNote = useCallback(async (): Promise<NoteDto | null> => {
    if (!token) return null;
    setCreating(true);
    setCreateError(null);

    try {
      const createRes = await createNote({ noteTitle: NEW_NOTE_TITLE, noteContent: '' }, token);
      if (createRes.responseOutcome !== 'SUCCESS') {
        setCreateError((createRes as ErrorResponse).message ?? 'Failed to create note.');
        return null;
      }

      // Create response carries no note data, so fetch the note back — it is
      // guaranteed to sort first since the list is ordered by dateModified desc.
      const listRes = await getAllNotes(token, 0, 1);
      if (listRes.responseOutcome !== 'SUCCESS') {
        setCreateError((listRes as ErrorResponse).message ?? 'Note created, but failed to load it.');
        return null;
      }

      const newNote = (listRes as GetAllNoteResponse).notes[0] ?? null;
      if (newNote) setNotes(prev => [newNote, ...prev]);
      return newNote;
    } catch {
      setCreateError('Network error. Please check your connection and try again.');
      return null;
    } finally {
      setCreating(false);
    }
  }, [token]);

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
    patchNoteInList,
  };
}
