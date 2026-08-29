import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import FullScreenLoader from './FullScreenLoader';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, initializing } = useAuth();

  if (initializing) return <FullScreenLoader />;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}
