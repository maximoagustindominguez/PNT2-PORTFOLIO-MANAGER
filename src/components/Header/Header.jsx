import { APP_TITLE } from '../../constants';
import styles from './Header.module.css';

export const Header = () => {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{APP_TITLE}</h1>
    </header>
  );
};
