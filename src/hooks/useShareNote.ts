import { useCallback, useState } from 'react';
import { shareNote } from '../api/shares';
import { useAuth } from './useAuth';
import type { ErrorResponse } from '../types/auth';
import type { Permission } from '../types/shares';

interface UseShareNoteResult {
  sharing: boolean;
  shareError: string | null;
  shareSuccess: boolean;
  share: (noteId: number, username: string, permission: Permission) => Promise<void>;
  reset: () => void;
}

export function useShareNote(): UseShareNoteResult {
  const { token } = useAuth();
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);

  const share = useCallback(
    async (noteId: number, username: string, permission: Permission) => {
      if (!token) {
        setShareError('Your session has expired. Please log in again.');
        return;
      }
      setSharing(true);
      setShareError(null);
      setShareSuccess(false);

      try {
        const res = await shareNote({ noteId, sharedToUsername: username, permission }, token);
        if (res.responseOutcome === 'SUCCESS') {
          setShareSuccess(true);
        } else {
          setShareError((res as ErrorResponse).message ?? 'Failed to share note.');
        }
      } catch {
        setShareError('Network error. Please check your connection and try again.');
      } finally {
        setSharing(false);
      }
    },
    [token],
  );

  const reset = useCallback(() => {
    setShareError(null);
    setShareSuccess(false);
  }, []);

  return { sharing, shareError, shareSuccess, share, reset };
}
