import { Navigate } from 'react-router';
import { useSessionStore } from '../store/sessionStore';

export function ProtectedRoute({ children }) {
  const user = useSessionStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}



