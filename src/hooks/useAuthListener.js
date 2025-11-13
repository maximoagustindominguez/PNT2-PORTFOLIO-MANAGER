import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSessionStore } from '../store/sessionStore';
import { useNavigate } from 'react-router';

export function useAuthListener() {
  const setUser = useSessionStore((state) => state.setUser);
  const clearUser = useSessionStore((state) => state.clearUser);
  const user = useSessionStore((state) => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        clearUser();
      }
    });

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        clearUser();
        if (window.location.pathname !== '/login') {
          navigate('/login');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, clearUser, navigate]);

  return { user };
}

