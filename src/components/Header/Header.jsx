import { APP_TITLE } from '../../constants';
import styles from './Header.module.css';

export const Header = ({ onLogout }) => {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{APP_TITLE}</h1>
      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          className={styles.logoutButton}
          aria-label="Cerrar sesión"
        >
          Cerrar sesión
        </button>
      )}
    </header>
  );
};
