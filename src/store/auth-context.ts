import { createContext } from 'react';

export interface AuthContextValue {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  /** True while the app-start silent refresh is in flight — routes should wait, not redirect. */
  initializing: boolean;
  login: (token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
