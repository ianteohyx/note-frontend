import { useCallback, useState } from 'react';
import { updateSharePermissions } from '../api/shares';
import { useAuth } from './useAuth';
import type { ErrorResponse } from '../types/auth';
import type { UpdateSharePermissionItem } from '../types/shares';

interface UseUpdateSharePermissionsResult {
  saving: boolean;
  saveError: string | null;
  updatePermissions: (updates: UpdateSharePermissionItem[]) => Promise<boolean>;
  reset: () => void;
}

export function useUpdateSharePermissions(): UseUpdateSharePermissionsResult {
  const { token } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const updatePermissions = useCallback(
    async (updates: UpdateSharePermissionItem[]) => {
      if (!token) {
        setSaveError('Your session has expired. Please log in again.');
        return false;
      }
      setSaving(true);
      setSaveError(null);

      try {
        const res = await updateSharePermissions({ updates }, token);
        if (res.responseOutcome === 'SUCCESS') {
          return true;
        }
        setSaveError((res as ErrorResponse).message ?? 'Failed to update permissions.');
        return false;
      } catch {
        setSaveError('Network error. Please check your connection and try again.');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [token],
  );

  const reset = useCallback(() => {
    setSaving(false);
    setSaveError(null);
  }, []);

  return { saving, saveError, updatePermissions, reset };
}
