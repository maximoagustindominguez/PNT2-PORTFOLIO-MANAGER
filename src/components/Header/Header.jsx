import { useState, useRef, useEffect } from 'react';
import { APP_TITLE, CURRENCY_SYMBOL } from '../../constants';
import { useSessionStore } from '../../store/sessionStore';
import { useNotificationsStore } from '../../store/notificationsStore';
import { UserProfile } from '../UserProfile/UserProfile';
import styles from './Header.module.css';

// Importar el logo estáticamente - Vite procesará esta ruta automáticamente
import logoImageSrc from '../../assets/images/Logo.png';

export const Header = ({ onLogout, onAddAsset }) => {
  const user = useSessionStore((state) => state.user);
  const { notifications, loadNotifications, markAllAsRead, getUnreadCount } = useNotificationsStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const dropdownRef = useRef(null);
  const notificationsRef = useRef(null);
  
  // Obtener nombre del usuario: primero custom name, luego email
  const customName = user?.user_metadata?.custom_name;
  const userName = customName || (user?.email ? user.email.split('@')[0] : 'Usuario');
  
  const unreadCount = getUnreadCount();

  // Cargar notificaciones cuando el usuario inicia sesión
  useEffect(() => {
    if (user?.id) {
      loadNotifications(user.id);
    } else {
      useNotificationsStore.getState().clearNotifications();
    }
  }, [user?.id, loadNotifications]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };

    if (isDropdownOpen || isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, isNotificationsOpen]);

  // Manejar "Marcar todas como leídas"
  const handleMarkAllAsRead = async () => {
    if (user?.id) {
      await markAllAsRead(user.id);
      // Recargar notificaciones para actualizar el estado
      await loadNotifications(user.id);
    }
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    onLogout();
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.disclaimer}>
          Esta aplicación es un proyecto de estudio. No debe hacerse ningún uso útil de la misma, ni realizarse acciones en base a los datos que en ella se muestran. Los desarrolladores se desligan de modo absoluto de cualquier consecuencia surgida por el uso de esta aplicación, la cual no persigue fines comerciales ni se distribuye al público en general.
        </div>
        <div className={styles.logoContainer}>
          {logoImageSrc && !logoError ? (
            <img 
              src={logoImageSrc} 
              alt="Portfolio Manager - ORT Escuela Técnica Buenos Aires" 
              className={styles.logo}
              onError={(e) => {
                console.error('Error al cargar el logo:', e);
                setLogoError(true);
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div className={styles.logoPlaceholder}>Logo</div>
          )}
        </div>
        {onLogout && user && (
          <div className={styles.userActions}>
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
            <div ref={dropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(!isDropdownOpen);
                  setIsNotificationsOpen(false);
                }}
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
            <div ref={notificationsRef} className={styles.notificationsContainer}>
              <button
                type="button"
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsDropdownOpen(false);
                  // Recargar notificaciones al abrir
                  if (!isNotificationsOpen && user?.id) {
                    loadNotifications(user.id);
                  }
                }}
                className={styles.notificationsButton}
                aria-label="Notificaciones"
                aria-expanded={isNotificationsOpen}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className={styles.notificationBadge}>{unreadCount}</span>
                )}
              </button>
              
              {isNotificationsOpen && (
                <div className={styles.notificationsDropdown}>
                  <div className={styles.notificationsHeader}>
                    <h3 className={styles.notificationsTitle}>Notificaciones</h3>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllAsRead}
                        className={styles.markAllReadButton}
                        aria-label="Marcar todas como leídas"
                      >
                        Marcar todas como leídas
                      </button>
                    )}
                  </div>
                  <div className={styles.notificationsContent}>
                    {notifications.length === 0 ? (
                      <div className={styles.emptyNotifications}>
                        No hay notificaciones
                      </div>
                    ) : (
                      <div className={styles.notificationsList}>
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`${styles.notificationItem} ${!notification.isRead ? styles.notificationUnread : ''}`}
                          >
                            <div className={styles.notificationMessage}>
                              {notification.message}
                            </div>
                            <div className={styles.notificationDate}>
                              {new Date(notification.createdAt).toLocaleDateString('es-AR', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
