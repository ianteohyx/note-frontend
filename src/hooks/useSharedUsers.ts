import { useCallback, useState } from 'react';
import { getSharedUsers } from '../api/shares';
import { useAuth } from './useAuth';
import type { ErrorResponse } from '../types/auth';
import type { GetSharedUsersResponse, SharedUserDto } from '../types/shares';

interface UseSharedUsersResult {
  sharedUsers: SharedUserDto[];
  loading: boolean;
  error: string | null;
  fetchSharedUsers: (noteId: number) => Promise<void>;
  reset: () => void;
}

export function useSharedUsers(): UseSharedUsersResult {
  const { token } = useAuth();
  const [sharedUsers, setSharedUsers] = useState<SharedUserDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSharedUsers = useCallback(
    async (noteId: number) => {
      if (!token) {
        setError('Your session has expired. Please log in again.');
        return;
      }
      setLoading(true);
      setError(null);

      try {
        const res = await getSharedUsers(noteId, token);
        if (res.responseOutcome === 'SUCCESS') {
          setSharedUsers((res as GetSharedUsersResponse).sharedUsers);
        } else {
          setSharedUsers([]);
          setError((res as ErrorResponse).message ?? 'Failed to load shared users.');
        }
      } catch {
        setSharedUsers([]);
        setError('Network error. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  const reset = useCallback(() => {
    setSharedUsers([]);
    setError(null);
    setLoading(false);
  }, []);

  return { sharedUsers, loading, error, fetchSharedUsers, reset };
}
