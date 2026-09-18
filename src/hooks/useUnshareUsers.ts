import { useCallback, useState } from 'react';
import { unshareNote } from '../api/shares';
import { useAuth } from './useAuth';
import type { ErrorResponse } from '../types/auth';
import type { UnshareNoteItem } from '../types/shares';

interface UseUnshareUsersResult {
  unsharing: boolean;
  unshareError: string | null;
  unshareUsers: (targets: UnshareNoteItem[]) => Promise<boolean>;
  reset: () => void;
}

export function useUnshareUsers(): UseUnshareUsersResult {
  const { token } = useAuth();
  const [unsharing, setUnsharing] = useState(false);
  const [unshareError, setUnshareError] = useState<string | null>(null);

  const unshareUsers = useCallback(
    async (targets: UnshareNoteItem[]) => {
      if (!token) {
        setUnshareError('Your session has expired. Please log in again.');
        return false;
      }
      setUnsharing(true);
      setUnshareError(null);

      try {
        const res = await unshareNote({ unshares: targets }, token);
        if (res.responseOutcome === 'SUCCESS') {
          return true;
        }
        setUnshareError((res as ErrorResponse).message ?? 'Failed to remove access.');
        return false;
      } catch {
        setUnshareError('Network error. Please check your connection and try again.');
        return false;
      } finally {
        setUnsharing(false);
      }
    },
    [token],
  );

  const reset = useCallback(() => {
    setUnsharing(false);
    setUnshareError(null);
  }, []);

  return { unsharing, unshareError, unshareUsers, reset };
}
