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
    let isMounted = true;
    let sessionChecked = false;
    let assetsLoadedFromStateChange = false;

    // Escuchar cambios de autenticación (login, logout, etc.)
    // Esta es la fuente principal de verdad para cambios de estado
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      
      if (session?.user) {
        setUser(session.user);
        // Cargar activos del usuario cuando inicia sesión
        assetsLoadedFromStateChange = true;
        loadAssets(session.user.id);
      } else {
        // Solo limpiar si realmente no hay sesión (no en la carga inicial)
        if (sessionChecked) {
          clearUser();
          clearAssets();
          if (window.location.pathname !== '/login') {
            navigate('/login');
          }
        }
      }
    });

    // Verificar sesión actual al cargar la página (solo una vez)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      sessionChecked = true;
      
      if (session?.user) {
        setUser(session.user);
        // Cargar activos del usuario solo si onAuthStateChange no lo hizo
        // Esperar un momento para que onAuthStateChange tenga oportunidad de ejecutarse
        setTimeout(() => {
          if (!isMounted) return;
          
          // Solo cargar si onAuthStateChange no lo hizo y no hay activos cargados
          if (!assetsLoadedFromStateChange) {
            const currentAssets = useAssetsStore.getState().assets;
            if (currentAssets.length === 0) {
              loadAssets(session.user.id);
            }
          }
        }, 50);
      } else {
        // Solo limpiar si onAuthStateChange no se ejecutó (primera carga sin sesión)
        if (!assetsLoadedFromStateChange) {
          clearUser();
          clearAssets();
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setUser, clearUser, loadAssets, clearAssets, navigate]);

  return { user };
}



