import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from './auth-context';
import type { AuthContextValue } from './auth-context';

const REFRESH_TOKEN_KEY = 'refreshToken';

interface AuthState {
  token: string | null;
  username: string | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ token: null, username: null });

  const login = useCallback((username: string, token: string, refreshToken: string) => {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    setState({ token, username });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setState({ token: null, username: null });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, isAuthenticated: state.token !== null, login, logout }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
