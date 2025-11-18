/**
 * CONFIGURACIÓN DE RUTAS DE LA APLICACIÓN
 * 
 * Este archivo define todas las rutas (URLs) de la aplicación y qué componente
 * se muestra en cada una.
 * 
 * ¿Qué es React Router?
 * React Router es una librería que permite crear aplicaciones de "una sola página"
 * (SPA - Single Page Application) donde diferentes URLs muestran diferentes componentes
 * sin recargar toda la página.
 * 
 * ¿Cómo funciona?
 * - Routes: Contenedor que agrupa todas las rutas
 * - Route: Define una ruta individual (path + componente a mostrar)
 * - path: La URL (ej: "/dashboard")
 * - element: El componente React que se renderiza en esa ruta
 * 
 * Rutas de la aplicación:
 * - "/" → Página de inicio (Home)
 * - "/login" → Página de login/registro
 * - "/dashboard" → Dashboard principal (protegida, requiere login)
 * 
 * ¿Qué es ProtectedRoute?
 * ProtectedRoute es un componente que verifica si el usuario está logueado.
 * Si no está logueado, redirige a /login. Si está logueado, muestra el contenido.
 */

import { Routes, Route } from 'react-router';
import { Home } from '../pages/Home';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { ProtectedRoute } from '../components/ProtectedRoute';

/**
 * Componente que define todas las rutas de la aplicación
 * @returns {JSX.Element} Configuración de rutas con Routes y Route
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* Ruta raíz: muestra la página de inicio */}
      <Route path="/" element={<Home />} />
      
      {/* Ruta de login: muestra el formulario de login/registro */}
      <Route path="/login" element={<Login />} />
      
      {/* Ruta de dashboard: protegida, solo accesible si hay sesión activa */}
      <Route
        path="/dashboard"
        element={
          // ProtectedRoute verifica si el usuario está logueado
          // Si no está logueado, redirige a /login
          // Si está logueado, muestra el Dashboard
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

