import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSessionStore } from '../store/sessionStore';
import { useAssetsStore } from '../store/assetsStore';
import { useNavigate } from 'react-router';

/**
 * HOOK: useAuthListener
 * 
 * Este hook escucha los cambios de autenticación y:
 * 1. Carga los activos del usuario cuando inicia sesión
 * 2. Limpia los activos cuando cierra sesión
 * 3. Redirige al login si no hay sesión activa
 */
export function useAuthListener() {
  const setUser = useSessionStore((state) => state.setUser);
  const clearUser = useSessionStore((state) => state.clearUser);
  const user = useSessionStore((state) => state.user);
  const loadAssets = useAssetsStore((state) => state.loadAssets);
  const clearAssets = useAssetsStore((state) => state.clearAssets);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar sesión actual al cargar la página
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        // Cargar activos del usuario
        loadAssets(session.user.id);
      } else {
        clearUser();
        clearAssets();
      }
    });

    // Escuchar cambios de autenticación (login, logout, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Cargar activos del usuario cuando inicia sesión
        loadAssets(session.user.id);
      } else {
        clearUser();
        clearAssets(); // Limpiar activos cuando cierra sesión
        if (window.location.pathname !== '/login') {
          navigate('/login');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, clearUser, loadAssets, clearAssets, navigate]);

  return { user };
}



