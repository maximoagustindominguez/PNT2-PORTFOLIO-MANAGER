/**
 * HOOK PERSONALIZADO: useAuth
 * 
 * Este hook proporciona funciones para autenticación de usuarios:
 * - Iniciar sesión (login)
 * - Registrarse (sign up)
 * - Cerrar sesión (logout)
 * 
 * ¿Cómo funciona la autenticación?
 * 1. El usuario ingresa email y contraseña
 * 2. Hacemos una petición a Supabase para verificar las credenciales
 * 3. Si son correctas, Supabase nos devuelve un objeto "user"
 * 4. Guardamos ese objeto en el store de sesión
 * 5. Redirigimos al usuario al dashboard
 * 
 * ¿Qué es Supabase Auth?
 * Supabase Auth es el sistema de autenticación que usa Supabase.
 * Maneja todo lo relacionado con usuarios: registro, login, tokens, etc.
 * Nosotros solo llamamos a sus funciones y manejamos el resultado.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useSessionStore } from '../store/sessionStore';
import { useNavigate } from 'react-router';

/**
 * Hook de autenticación que proporciona funciones de login, registro y logout
 * @returns {Object} Objeto con funciones logIn, signUp y logOut
 */
export function useAuth() {
  // ============================================
  // OBTENER FUNCIONES DEL STORE Y NAVEGACIÓN
  // ============================================
  const setUser = useSessionStore((state) => state.setUser); // Función para guardar el usuario
  const clearUser = useSessionStore((state) => state.clearUser); // Función para limpiar el usuario
  const navigate = useNavigate(); // Función de React Router para cambiar de página

  /**
   * INICIAR SESIÓN (LOGIN)
   * 
   * Autentica al usuario con email y contraseña.
   * Si las credenciales son correctas, guarda el usuario en el store y redirige al dashboard.
   * 
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña del usuario
   * @returns {Promise<{success: boolean, error?: string}>} 
   *   - success: true si el login fue exitoso
   *   - error: Mensaje de error si algo falló
   */
  const logIn = async (email, password) => {
    try {
      // ============================================
      // VALIDAR CONFIGURACIÓN DE SUPABASE
      // ============================================
      // Antes de intentar hacer login, verificamos que Supabase esté configurado
      // Si no lo está, devolvemos un error claro
      if (!isSupabaseConfigured()) {
        return { 
          success: false, 
          error: 'Supabase no está configurado. Verifica tu archivo .env y reinicia el servidor.' 
        };
      }

      // ============================================
      // INTENTAR INICIAR SESIÓN CON SUPABASE
      // ============================================
      // signInWithPassword es una función de Supabase Auth
      // Hace una petición HTTP a Supabase para verificar las credenciales
      // Devuelve { data, error } donde:
      //   - data contiene el usuario si el login fue exitoso
      //   - error contiene información del error si falló
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Si hay un error, lanzarlo para que lo capture el catch
      if (error) {
        console.error('Error en la sesión:', error);
        throw error;
      }

      // ============================================
      // GUARDAR USUARIO Y REDIRIGIR
      // ============================================
      // Si llegamos aquí, el login fue exitoso
      // Guardamos el usuario en el store (para que otros componentes puedan acceder)
      setUser(data.user);
      // Redirigimos al usuario al dashboard
      navigate('/dashboard');
      return { success: true };
    } catch (error) {
      // ============================================
      // MANEJAR ERRORES
      // ============================================
      console.error('Error al iniciar sesión:', error);
      
      // Errores de red (no se pudo conectar con Supabase)
      if (error.message === 'Failed to fetch' || error.message.includes('fetch')) {
        return { 
          success: false, 
          error: 'No se pudo conectar con Supabase. Verifica tu conexión a internet y las variables de entorno.' 
        };
      }
      
      // Otros errores (credenciales incorrectas, etc.)
      return { success: false, error: error.message || 'Error al iniciar sesión' };
    }
  };

  /**
   * REGISTRARSE (SIGN UP)
   * 
   * Crea una nueva cuenta de usuario con email y contraseña.
   * Si el registro es exitoso, inicia sesión automáticamente.
   * 
   * @param {string} email - Email del nuevo usuario
   * @param {string} password - Contraseña del nuevo usuario
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const signUp = async (email, password) => {
    try {
      // Verificar configuración de Supabase
      if (!isSupabaseConfigured()) {
        return { 
          success: false, 
          error: 'Supabase no está configurado. Verifica tu archivo .env y reinicia el servidor.' 
        };
      }

      // ============================================
      // CREAR NUEVA CUENTA
      // ============================================
      // signUp crea un nuevo usuario en Supabase
      // Por defecto, Supabase puede requerir confirmación de email
      // (depende de la configuración del proyecto)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('Error al registrarse:', error);
        throw error;
      }

      // ============================================
      // INICIAR SESIÓN AUTOMÁTICAMENTE
      // ============================================
      // Si el registro fue exitoso y tenemos un usuario, iniciar sesión
      // (algunas configuraciones de Supabase requieren confirmación de email primero)
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

  /**
   * CERRAR SESIÓN (LOGOUT)
   * 
   * Cierra la sesión del usuario actual:
   * 1. Notifica a Supabase que el usuario cerró sesión
   * 2. Limpia el usuario del store local
   * 3. Redirige al usuario a la página de login
   * 
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const logOut = async () => {
    try {
      // ============================================
      // CERRAR SESIÓN EN SUPABASE
      // ============================================
      // signOut notifica a Supabase que el usuario cerró sesión
      // Esto invalida cualquier token de autenticación
      await supabase.auth.signOut();
      
      // ============================================
      // LIMPIAR ESTADO LOCAL
      // ============================================
      // Limpiar el usuario del store (ya no hay sesión activa)
      clearUser();
      
      // ============================================
      // REDIRIGIR A LOGIN
      // ============================================
      // Redirigir al usuario a la página de login
      navigate('/login');
      return { success: true };
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      return { success: false, error: error.message };
    }
  };

  // ============================================
  // EXPONER FUNCIONES
  // ============================================
  // Los componentes que usen este hook recibirán estas tres funciones
  return {
    logIn,
    signUp,
    logOut,
  };
}

