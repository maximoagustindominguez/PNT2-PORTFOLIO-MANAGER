import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useSessionStore } from '../store/sessionStore';
import { useNavigate } from 'react-router';

export function useAuth() {
  const setUser = useSessionStore((state) => state.setUser);
  const clearUser = useSessionStore((state) => state.clearUser);
  const navigate = useNavigate();

  const logIn = async (email, password) => {
    try {
      // Verificar que Supabase esté configurado
      if (!isSupabaseConfigured()) {
        return { 
          success: false, 
          error: 'Supabase no está configurado. Verifica tu archivo .env y reinicia el servidor.' 
        };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Error en la sesión:', error);
        throw error;
      }

      setUser(data.user);
      navigate('/dashboard');
      return { success: true };
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      
      // Manejar errores de red
      if (error.message === 'Failed to fetch' || error.message.includes('fetch')) {
        return { 
          success: false, 
          error: 'No se pudo conectar con Supabase. Verifica tu conexión a internet y las variables de entorno.' 
        };
      }
      
      return { success: false, error: error.message || 'Error al iniciar sesión' };
    }
  };

  const signUp = async (email, password) => {
    try {
      // Verificar que Supabase esté configurado
      if (!isSupabaseConfigured()) {
        return { 
          success: false, 
          error: 'Supabase no está configurado. Verifica tu archivo .env y reinicia el servidor.' 
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('Error al registrarse:', error);
        throw error;
      }

      if (data.user) {
        setUser(data.user);
        navigate('/dashboard');
      }
      return { success: true };
    } catch (error) {
      console.error('Error al registrarse:', error);
      
      // Manejar errores de red
      if (error.message === 'Failed to fetch' || error.message.includes('fetch')) {
        return { 
          success: false, 
          error: 'No se pudo conectar con Supabase. Verifica tu conexión a internet y las variables de entorno.' 
        };
      }
      
      return { success: false, error: error.message || 'Error al registrarse' };
    }
  };

  const logOut = async () => {
    try {
      await supabase.auth.signOut();
      clearUser();
      navigate('/login');
      return { success: true };
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    logIn,
    signUp,
    logOut,
  };
}

