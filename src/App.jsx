/**
 * COMPONENTE PRINCIPAL DE LA APLICACIÓN
 * 
 * Este componente es el "corazón" de la aplicación. Envuelve todo con:
 * 1. BrowserRouter: Habilita el enrutamiento (navegación entre páginas)
 * 2. AuthProvider: Proporciona contexto de autenticación a toda la app
 * 3. AppRoutes: Define las rutas (páginas) de la aplicación
 * 
 * ¿Qué es BrowserRouter?
 * BrowserRouter es un componente de React Router que permite usar URLs
 * como "/dashboard", "/login", etc. Sin esto, no podríamos navegar entre páginas.
 * 
 * ¿Qué es AuthProvider?
 * AuthProvider es un componente que "envuelve" la app y proporciona información
 * de autenticación a todos los componentes hijos. Escucha cambios en la sesión
 * de Supabase y actualiza el store cuando el usuario hace login/logout.
 * 
 * Estructura de la aplicación:
 * BrowserRouter (habilita rutas)
 *   └── AuthProvider (proporciona autenticación)
 *       └── AppRoutes (define las páginas)
 *           ├── / → Home
 *           ├── /login → Login
 *           └── /dashboard → Dashboard (protegida)
 */

import { BrowserRouter } from 'react-router';
import { AuthProvider } from './components/AuthProvider';
import { AppRoutes } from './app/AppRoutes';
import './App.css'; // Estilos específicos del componente App

/**
 * Componente raíz de la aplicación
 * @returns {JSX.Element} Aplicación completa con routing y autenticación
 */
function App() {
  return (
    // BrowserRouter debe estar en el nivel más alto para que el routing funcione
    <BrowserRouter>
      {/* AuthProvider escucha cambios en la sesión de Supabase */}
      <AuthProvider>
        {/* AppRoutes define todas las rutas de la aplicación */}
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
