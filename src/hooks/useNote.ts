import { useCallback, useEffect, useState } from 'react';
import { getNoteById } from '../api/notes';
import { useAuth } from './useAuth';
import type { NoteDto, GetSingleNoteResponse } from '../types/notes';
import type { ErrorResponse } from '../types/auth';

interface UseNoteResult {
  note: NoteDto | null;
  loading: boolean;
  error: string | null;
}

export function useNote(noteId: number | null): UseNoteResult {
  const { token } = useAuth();
  const [note, setNote] = useState<NoteDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNote = useCallback(async (id: number, authToken: string, isCancelled: () => boolean) => {
    setLoading(true);
    setError(null);

    try {
      const res = await getNoteById(id, authToken);
      if (isCancelled()) return;
      if (res.responseOutcome === 'SUCCESS') {
        setNote((res as GetSingleNoteResponse).noteDto);
      } else {
        setNote(null);
        setError((res as ErrorResponse).message ?? 'Failed to load note.');
      }
    } catch {
      if (!isCancelled()) {
        setNote(null);
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (noteId === null || !token) return;

    let cancelled = false;
    fetchNote(noteId, token, () => cancelled);

    return () => {
      cancelled = true;
    };
  }, [noteId, token, fetchNote]);

  return { note, loading, error };
}
