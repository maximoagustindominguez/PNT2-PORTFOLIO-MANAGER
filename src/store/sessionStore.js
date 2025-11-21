/**
 * STORE DE SESIÓN (ZUSTAND)
 * 
 * Este archivo crea un "store" (almacén de estado) usando Zustand para manejar
 * la información del usuario que tiene la sesión iniciada.
 * 
 * ¿Qué es Zustand?
 * Zustand es una librería de gestión de estado para React. Es más simple que Redux
 * pero más potente que useState cuando necesitas compartir estado entre componentes.
 * 
 * ¿Por qué un store para la sesión?
 * - Varios componentes necesitan saber si hay un usuario logueado
 * - Necesitamos acceder a los datos del usuario desde cualquier parte de la app
 * - Es más fácil que pasar props por toda la aplicación
 * 
 * ¿Cómo se usa?
 * En cualquier componente, puedes hacer:
 *   const user = useSessionStore((state) => state.user);
 *   const setUser = useSessionStore((state) => state.setUser);
 * 
 * Esto te da acceso al usuario actual y a la función para actualizarlo.
 */

import { create } from 'zustand';

/**
 * Store de sesión que contiene:
 * - user: Objeto con la información del usuario (null si no hay sesión)
 * - setUser: Función para establecer el usuario (cuando hace login)
 * - clearUser: Función para limpiar el usuario (cuando hace logout)
 */
export const useSessionStore = create((set) => ({
  // Estado inicial: no hay usuario logueado
  user: null,
  
  // Función para establecer el usuario (se llama cuando el usuario hace login)
  // Recibe un objeto con la información del usuario de Supabase
  setUser: (user) => set({ user }),
  
  // Función para limpiar el usuario (se llama cuando el usuario hace logout)
  // Establece user a null
  clearUser: () => set({ user: null }),
}));



