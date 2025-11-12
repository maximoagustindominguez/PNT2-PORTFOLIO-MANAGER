import { CURRENCY_SYMBOL } from '../../constants';
import styles from './AssetTable.module.css';

export const AssetTable = ({ assets }) => {
  const getTypeLabel = (type) => {
    const types = {
      accion: 'Acción',
      criptomoneda: 'Cripto',
      fondo: 'Fondo',
    };
    return types[type] || type;
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Activo</th>
            <th>Tipo</th>
            <th>Cantidad</th>
            <th>Precio Promedio</th>
            <th>Precio Actual</th>
            <th>Valor Total</th>
            <th>Ganancia/Pérdida</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => {
            const totalValue = asset.quantity * asset.currentPrice;
            const totalInvestment = asset.quantity * asset.purchasePrice;
            const profit = totalValue - totalInvestment;
            const profitPercentage =
              totalInvestment > 0 ? ((profit / totalInvestment) * 100).toFixed(2) : '0.00';
            const isProfit = profit >= 0;

            return (
              <tr key={asset.id}>
                <td>
                  <div className={styles.assetName}>
                    <div className={styles.name}>{asset.name}</div>
                    <div className={styles.symbol}>{asset.symbol}</div>
                  </div>
                </td>
                <td>
                  <span className={styles.type}>{getTypeLabel(asset.type)}</span>
                </td>
                <td>{asset.quantity}</td>
                <td>
                  {CURRENCY_SYMBOL}
                  {asset.purchasePrice.toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td>
                  {CURRENCY_SYMBOL}
                  {asset.currentPrice.toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className={styles.totalValue}>
                  {CURRENCY_SYMBOL}
                  {totalValue.toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className={isProfit ? styles.profit : styles.loss}>
                  {isProfit ? '+' : ''}
                  {CURRENCY_SYMBOL}
                  {profit.toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className={isProfit ? styles.profit : styles.loss}>
                  {isProfit ? '+' : ''}
                  {profitPercentage}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
