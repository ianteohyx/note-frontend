import { useCallback, useEffect, useState } from 'react';
import { getNoteById } from '../api/notes';
import { getSharedNoteById } from '../api/shares';
import { useAuth } from './useAuth';
import type { NoteDto, GetSingleNoteResponse, SelectedNoteRef } from '../types/notes';
import type { GetSingleSharedNoteResponse, Permission } from '../types/shares';
import type { ErrorResponse } from '../types/auth';

interface UseNoteResult {
  note: NoteDto | null;
  permission: Permission | null;
  loading: boolean;
  error: string | null;
}

export function useNote(selected: SelectedNoteRef | null): UseNoteResult {
  const { token } = useAuth();
  const [note, setNote] = useState<NoteDto | null>(null);
  const [permission, setPermission] = useState<Permission | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNote = useCallback(
    async (target: SelectedNoteRef, authToken: string, isCancelled: () => boolean) => {
      setLoading(true);
      setError(null);

      try {
        if (target.kind === 'own') {
          const res = await getNoteById(target.id, authToken);
          if (isCancelled()) return;
          if (res.responseOutcome === 'SUCCESS') {
            setNote((res as GetSingleNoteResponse).noteDto);
            setPermission('WRITE');
          } else {
            setNote(null);
            setPermission(null);
            setError((res as ErrorResponse).message ?? 'Failed to load note.');
          }
        } else {
          const res = await getSharedNoteById(target.id, authToken);
          if (isCancelled()) return;
          if (res.responseOutcome === 'SUCCESS') {
            const sharedNote = (res as GetSingleSharedNoteResponse).sharedNote;
            setNote(sharedNote.note);
            setPermission(sharedNote.permission);
          } else {
            setNote(null);
            setPermission(null);
            setError((res as ErrorResponse).message ?? 'Failed to load shared note.');
          }
        }
      } catch {
        if (!isCancelled()) {
          setNote(null);
          setPermission(null);
          setError('Network error. Please check your connection and try again.');
        }
      } finally {
        if (!isCancelled()) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (selected === null || !token) {
      setNote(null);
      setPermission(null);
      setError(null);
      return;
    }

    let cancelled = false;
    fetchNote(selected, token, () => cancelled);

    return () => {
      cancelled = true;
    };
  }, [selected, token, fetchNote]);

  return { note, permission, loading, error };
}
