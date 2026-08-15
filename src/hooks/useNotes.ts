import { useCallback, useEffect, useState } from 'react';
import { getAllNotes } from '../api/notes';
import { useAuth } from './useAuth';
import type { NoteDto, GetAllNoteResponse } from '../types/notes';
import type { ErrorResponse } from '../types/auth';

const PAGE_SIZE = 20;

interface UseNotesResult {
  notes: NoteDto[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
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

  return { notes, loading, loadingMore, error, hasMore: page + 1 < totalPages, loadMore };
}
