import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validar que las variables de entorno estén configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas');
  console.error('📋 Valores actuales:');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl || '(vacío)');
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

// Crear el cliente de Supabase
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Función helper para verificar si Supabase está configurado
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && 
           supabaseUrl !== 'https://placeholder.supabase.co' && 
           supabaseAnonKey !== 'placeholder-key');
};


