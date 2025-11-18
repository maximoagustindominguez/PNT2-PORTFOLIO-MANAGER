/**
 * CONFIGURACIÓN DE SUPABASE
 * 
 * Este archivo configura la conexión con Supabase, que es nuestro servicio de backend.
 * Supabase nos proporciona:
 * - Autenticación de usuarios (login, registro, logout)
 * - Base de datos (aunque en este proyecto aún no la usamos completamente)
 * - Almacenamiento de archivos (no usado en este proyecto)
 * 
 * ¿Qué es Supabase?
 * Supabase es un servicio "backend as a service" (BaaS) que nos permite tener
 * autenticación y base de datos sin tener que crear nuestro propio servidor.
 * Es como Firebase, pero usando tecnologías open-source.
 * 
 * ¿Cómo funciona?
 * 1. Necesitamos dos credenciales: URL del proyecto y clave anónima
 * 2. Estas credenciales se guardan en un archivo .env (no se suben a Git)
 * 3. Con estas credenciales, creamos un "cliente" que nos permite hacer peticiones
 * 4. El cliente se exporta para que otros archivos puedan usarlo
 */

import { createClient } from '@supabase/supabase-js';

// ============================================
// OBTENER VARIABLES DE ENTORNO
// ============================================
// En Vite (nuestro bundler), las variables de entorno deben empezar con VITE_
// import.meta.env es la forma de acceder a variables de entorno en Vite
// Si no están configuradas, usamos strings vacíos como valor por defecto

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// ============================================
// VALIDACIÓN DE CONFIGURACIÓN
// ============================================
// Verificamos que las variables de entorno estén configuradas antes de continuar
// Si no lo están, mostramos mensajes de error útiles en la consola

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas');
  console.error('📋 Valores actuales:');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl || '(vacío)');
  // Solo mostramos los primeros 20 caracteres de la clave por seguridad
  console.error('   VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : '(vacío)');
  console.error('');
  console.error('✅ Solución:');
  console.error('1. Crea un archivo .env en la raíz del proyecto (misma carpeta que package.json)');
  console.error('2. Agrega estas líneas (sin espacios, sin comillas):');
  console.error('   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co');
  console.error('   VITE_SUPABASE_ANON_KEY=tu_clave_anon_aqui');
  console.error('3. Reinicia el servidor: detén con Ctrl+C y ejecuta "npm run dev" nuevamente');
  console.error('');
  console.error('💡 Obtén tus credenciales en: Supabase Dashboard > Settings > API');
}

// ============================================
// CREAR CLIENTE DE SUPABASE
// ============================================
// createClient crea un objeto que nos permite interactuar con Supabase
// Este objeto tiene métodos como:
// - supabase.auth.signInWithPassword() para hacer login
// - supabase.auth.signUp() para registrar usuarios
// - supabase.auth.signOut() para cerrar sesión
// - supabase.from('tabla').select() para consultar la base de datos

// Si no hay credenciales, usamos valores "placeholder" para evitar errores
// (aunque la aplicación no funcionará correctamente sin credenciales reales)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// ============================================
// FUNCIÓN HELPER PARA VERIFICAR CONFIGURACIÓN
// ============================================
// Esta función verifica si Supabase está correctamente configurado
// Útil para mostrar mensajes de error antes de intentar usar Supabase

/**
 * Verifica si Supabase está configurado correctamente
 * @returns {boolean} true si las credenciales están configuradas y no son placeholders
 */
export const isSupabaseConfigured = () => {
  // Verificamos que:
  // 1. Las variables no estén vacías
  // 2. No sean los valores placeholder que usamos por defecto
  return !!(supabaseUrl && supabaseAnonKey && 
           supabaseUrl !== 'https://placeholder.supabase.co' && 
           supabaseAnonKey !== 'placeholder-key');
};


