/**
 * CONFIGURACIÓN DE VITE
 * 
 * Vite es el bundler (empaquetador) y servidor de desarrollo que usamos en este proyecto.
 * Es mucho más rápido que Webpack y proporciona Hot Module Replacement (HMR) instantáneo.
 * 
 * Documentación: https://vite.dev/config/
 */

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Configuración principal de Vite
 * @see https://vite.dev/config/
 */
export default defineConfig({
  // ============================================
  // PLUGINS
  // ============================================
  // Los plugins extienden la funcionalidad de Vite
  // @vitejs/plugin-react: Habilita soporte para React (JSX, HMR, etc.)
  plugins: [react()],
  
  // ============================================
  // BASE PATH (RUTA BASE)
  // ============================================
  // Ruta base pública cuando se despliega en producción.
  // Si la app se despliega en un subdirectorio (ej: /mi-app/), cambiar a '/mi-app/'
  // Por defecto: '/' (raíz del dominio)
  // Se puede sobrescribir con la variable de entorno VITE_PUBLIC_BASE_PATH
  base: process.env.VITE_PUBLIC_BASE_PATH || '/',
  
  // ============================================
  // CONFIGURACIÓN DEL SERVIDOR DE DESARROLLO
  // ============================================
  // Configuración para 'npm run dev' (servidor de desarrollo local)
  server: {
    // Puerto donde se ejecutará el servidor de desarrollo
    // Se puede sobrescribir con la variable de entorno PORT
    // Por defecto: 8080
    port: process.env.PORT || 8080,
    
    // Host: '0.0.0.0' permite acceder al servidor desde cualquier IP de la red local
    // Útil para probar en dispositivos móviles conectados a la misma red
    // Si solo quieres localhost, cambiar a 'localhost' o '127.0.0.1'
    host: '0.0.0.0',
  },
  
  // ============================================
  // CONFIGURACIÓN DEL BUILD (PRODUCCIÓN)
  // ============================================
  // Configuración para 'npm run build' (generar archivos para producción)
  build: {
    // sourcemap: false - No generar source maps (archivos que mapean código minificado al original)
    // Los source maps son útiles para debugging pero aumentan el tamaño del build
    // En producción generalmente se desactivan para reducir el tamaño
    sourcemap: false,
    
    // minify: 'esbuild' - Usar esbuild para minificar el código
    // esbuild es muy rápido y produce builds optimizados
    // Alternativas: 'terser' (más lento pero más optimizado) o 'swc'
    minify: 'esbuild',
  },
});
