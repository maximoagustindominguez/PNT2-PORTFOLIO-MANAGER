import { useState, useRef, useEffect } from 'react';
import { APP_TITLE } from '../../constants';
import { useSessionStore } from '../../store/sessionStore';
import { UserProfile } from '../UserProfile/UserProfile';
import styles from './Header.module.css';
// Importar el logo
import logoImage from '../../assets/images/Imagen de WhatsApp 2025-11-18 a las 19.46.47_305e2560.jpg';

export const Header = ({ onLogout }) => {
  const user = useSessionStore((state) => state.user);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  
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
      <div className={styles.logoContainer}>
        <img 
          src={logoImage} 
          alt="Portfolio Manager - ORT Escuela Técnica Buenos Aires" 
          className={styles.logo}
        />
      </div>
      <h1 className={styles.title}>{APP_TITLE}</h1>
      {onLogout && user && (
        <div className={styles.userActions} ref={dropdownRef}>
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
