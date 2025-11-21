import { useAuthListener } from '../hooks/useAuthListener';

export function AuthProvider({ children }) {
  // Escuchar cambios de autenticación
  useAuthListener();

  return children;
}



