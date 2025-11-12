import styles from './Summary.module.css'
import { CURRENCY_SYMBOL } from '../../constants'

export const Summary = ({ totalValue, totalInvestment, totalProfit }) => {
  const profitPercentage = totalInvestment > 0
    ? ((totalProfit / totalInvestment) * 100).toFixed(2)
    : 0

  const isProfit = totalProfit >= 0

  return (
    <div className={styles.summary}>
      <div className={styles.card}>
        <div className={styles.label}>Valor Total</div>
        <div className={styles.value}>
          {CURRENCY_SYMBOL}{totalValue.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>Inversión Total</div>
        <div className={styles.value}>
          {CURRENCY_SYMBOL}{totalInvestment.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
      <div className={`${styles.card} ${isProfit ? styles.profit : styles.loss}`}>
        <div className={styles.label}>Ganancia/Pérdida</div>
        <div className={styles.value}>
          {isProfit ? '+' : ''}{CURRENCY_SYMBOL}{totalProfit.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className={styles.percentage}>
          {isProfit ? '+' : ''}{profitPercentage}%
        </div>
      </div>
    </div>
  )
}

