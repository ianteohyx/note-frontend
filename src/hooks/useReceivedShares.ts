import { useCallback, useEffect, useState } from 'react';
import { getReceivedShares } from '../api/shares';
import { useAuth } from './useAuth';
import type { GetAllSharedToMeResponse, SharedNoteDto } from '../types/shares';
import type { ErrorResponse } from '../types/auth';

const PAGE_SIZE = 20;

interface UseReceivedSharesResult {
  sharedNotes: SharedNoteDto[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  patchSharedNoteInList: (noteId: number, patch: Partial<Pick<SharedNoteDto['note'], 'title' | 'dateModified'>>) => void;
}

export function useReceivedShares(): UseReceivedSharesResult {
  const { token } = useAuth();
  const [sharedNotes, setSharedNotes] = useState<SharedNoteDto[]>([]);
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
        const res = await getReceivedShares(token, pageToFetch, PAGE_SIZE);
        if (res.responseOutcome === 'SUCCESS') {
          const success = res as GetAllSharedToMeResponse;
          setSharedNotes(prev => (append ? [...prev, ...success.sharedNotes] : success.sharedNotes));
          setPage(success.page);
          setTotalPages(success.totalPages);
        } else {
          setError((res as ErrorResponse).message ?? 'Failed to load shared notes.');
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

  const patchSharedNoteInList = useCallback(
    (noteId: number, patch: Partial<Pick<SharedNoteDto['note'], 'title' | 'dateModified'>>) => {
      setSharedNotes(prev => {
        const idx = prev.findIndex(sn => sn.note.id === noteId);
        if (idx === -1) return prev;
        const updated = { ...prev[idx], note: { ...prev[idx].note, ...patch } };
        // Mirror the backend's dateModified-desc sort so the edited note bubbles to the top.
        return [updated, ...prev.filter(sn => sn.note.id !== noteId)];
      });
    },
    [],
  );

  return {
    sharedNotes,
    loading,
    loadingMore,
    error,
    hasMore: page + 1 < totalPages,
    loadMore,
    patchSharedNoteInList,
  };
}
