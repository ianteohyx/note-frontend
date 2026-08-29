import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from './auth-context';
import type { AuthContextValue } from './auth-context';
import { logout as logoutRequest, refresh } from '../api/auth';
import { getUsernameFromToken } from '../utils/jwt';
import type { LoginResponse } from '../types/auth';

interface AuthState {
  token: string | null;
  username: string | null;
}

const LOGGED_OUT: AuthState = { token: null, username: null };

// Memoised so the startup refresh fires exactly once per page load even though
// React 18 StrictMode mounts effects twice in dev. Two concurrent /refresh calls
// would race the rotating refresh-token cookie and could trip the backend's
// "revoked token reused" defence, logging the user out.
let bootstrapPromise: Promise<string | null> | null = null;

function bootstrapRefresh(): Promise<string | null> {
  if (!bootstrapPromise) {
    bootstrapPromise = refresh()
      .then((res) => (res.responseOutcome === 'SUCCESS' ? (res as LoginResponse).token : null))
      .catch(() => null);
  }
  return bootstrapPromise;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(LOGGED_OUT);
  const [initializing, setInitializing] = useState(true);

  // On mount, try to trade the HttpOnly refresh-token cookie for a fresh access
  // token. This is what lets a full page reload (F5) stay signed in — the access
  // token itself is memory-only and always gone after a reload.
  useEffect(() => {
    let cancelled = false;

    bootstrapRefresh().then((token) => {
      if (cancelled) return;
      if (token) setState({ token, username: getUsernameFromToken(token) });
      setInitializing(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback((token: string) => {
    setState({ token, username: getUsernameFromToken(token) });
  }, []);

  const logout = useCallback(() => {
    setState(LOGGED_OUT);
    // Fire-and-forget: revoke the refresh token and clear its cookie server-side
    // so a later reload can't silently re-authenticate. UI already reflects logout.
    void logoutRequest().catch(() => {});
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: state.token !== null,
      initializing,
      login,
      logout,
    }),
    [state, initializing, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
