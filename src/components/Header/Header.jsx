import { useState, useRef, useEffect } from 'react';
import { APP_TITLE } from '../../constants';
import { useSessionStore } from '../../store/sessionStore';
import { UserProfile } from '../UserProfile/UserProfile';
import styles from './Header.module.css';

export const Header = ({ onLogout, onAddAsset }) => {
  const user = useSessionStore((state) => state.user);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [logoImage, setLogoImage] = useState(null);
  const dropdownRef = useRef(null);
  
  // Cargar el logo dinámicamente
  useEffect(() => {
    const loadLogo = async () => {
      // Lista de posibles nombres de archivo del logo (en orden de prioridad)
      const logoFiles = [
        'Logo.jpg',
        'logo.jpg',
        '@logo.jpg',
        'logo.png',
      ];
      
      for (const fileName of logoFiles) {
        try {
          // Importación dinámica con Vite
          const logoModule = await import(`../../assets/images/${fileName}?url`);
          setLogoImage(logoModule.default);
          break; // Si se carga exitosamente, salir del loop
        } catch (error) {
          // Si este archivo no existe, intentar el siguiente
          continue;
        }
      }
    };
    
    loadLogo();
  }, []);
  
  // Obtener nombre del usuario: primero custom name, luego email
  const customName = user?.user_metadata?.custom_name;
  const userName = customName || (user?.email ? user.email.split('@')[0] : 'Usuario');

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleLogout = () => {
    setIsDropdownOpen(false);
    onLogout();
  };

  return (
    <header className={styles.header}>
      <div className={styles.disclaimer}>
        Esta aplicación es un proyecto de estudio. No debe hacerse ningún uso útil de la misma, ni realizarse acciones en base a los datos que en ella se muestran. Los desarrolladores se desligan de modo absoluto de cualquier consecuencia surgida por el uso de esta aplicación, la cual no persigue fines comerciales ni se distribuye al público en general.
      </div>
      {logoImage && (
        <div className={styles.logoContainer}>
          <img 
            src={logoImage} 
            alt="Portfolio Manager - ORT Escuela Técnica Buenos Aires" 
            className={styles.logo}
          />
        </div>
      )}
      {onLogout && user && (
        <div className={styles.userActions} ref={dropdownRef}>
          {onAddAsset && (
            <button
              type="button"
              onClick={onAddAsset}
              className={styles.addAssetButton}
              aria-label="Agregar nuevo activo"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 5V19M5 12H19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Agregar Asset
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={styles.userButton}
            aria-label={`Usuario: ${userName}`}
            aria-expanded={isDropdownOpen}
          >
            <svg
              className={styles.userIcon}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Hola, {userName}
            <span className={styles.arrow}>{isDropdownOpen ? '▲' : '▼'}</span>
          </button>
          
          {isDropdownOpen && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownContent}>
                <UserProfile />
                <button
                  type="button"
                  onClick={handleLogout}
                  className={styles.logoutButton}
                  aria-label="Cerrar sesión"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
