import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useSessionStore } from '../store/sessionStore';

export function Home() {
  const navigate = useNavigate();
  const user = useSessionStore((state) => state.user);

  useEffect(() => {
    // Si el usuario ya está logueado, redirigir al dashboard
    if (user) {
      navigate('/dashboard', { replace: true });
    } else {
      // Si no está logueado, redirigir al login
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  return null;
}

