import styles from './Header.module.css'
import { APP_TITLE } from '../../constants'

export const Header = () => {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{APP_TITLE}</h1>
    </header>
  )
}

