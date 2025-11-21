import styles from './Footer.module.css';

/**
 * Componente Footer
 * Muestra información de los autores del proyecto
 */
export function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.footerText}>
        Proyecto hecho por Tomás José Martínez y Máximo Agustín Domínguez para la materia Nuevas Tecnologías 2
      </p>
    </footer>
  );
}

