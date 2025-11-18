/**
 * PUNTO DE ENTRADA DE LA APLICACIÓN
 * 
 * Este es el primer archivo que se ejecuta cuando la aplicación se carga.
 * Su función es:
 * 1. Encontrar el elemento HTML donde se renderizará React (el div con id="root")
 * 2. Crear la "raíz" de React en ese elemento
 * 3. Renderizar el componente App dentro de StrictMode
 * 
 * ¿Qué es StrictMode?
 * StrictMode es un componente de React que ayuda a detectar problemas en desarrollo.
 * No afecta la producción, pero muestra advertencias sobre código problemático.
 * 
 * ¿Qué es createRoot?
 * createRoot es la forma moderna de renderizar aplicaciones React (desde React 18).
 * La forma antigua era ReactDOM.render(), pero createRoot es más eficiente.
 * 
 * ¿Dónde está el elemento "root"?
 * Está en el archivo index.html en la raíz del proyecto.
 * Es un <div id="root"></div> donde React "monta" toda la aplicación.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css'; // Estilos globales de la aplicación
import App from './App.jsx'; // Componente principal de la aplicación

// ============================================
// RENDERIZAR LA APLICACIÓN
// ============================================
// 1. Buscar el elemento HTML con id="root" (está en index.html)
// 2. Crear la raíz de React en ese elemento
// 3. Renderizar el componente App dentro de StrictMode

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
