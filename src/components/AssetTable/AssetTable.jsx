import { CURRENCY_SYMBOL } from '../../constants';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import styles from './AssetTable.module.css';

export const AssetTable = ({ assets }) => {
  const getTypeLabel = (type) => {
    const types = {
      accion: 'Acción',
      criptomoneda: 'Cripto',
      fondo: 'Fondo',
      bond: 'Bond',
    };
    return types[type] || type;
  };

  const exportToExcel = () => {
    const data = assets.map((asset) => {
      const totalValue = asset.quantity * asset.currentPrice;
      const totalInvestment = asset.quantity * asset.purchasePrice;
      const profit = totalValue - totalInvestment;
      const profitPercentage =
        totalInvestment > 0 ? ((profit / totalInvestment) * 100).toFixed(2) : '0.00';

      return {
        Activo: asset.name,
        Símbolo: asset.symbol,
        Tipo: getTypeLabel(asset.type),
        Cantidad: asset.quantity,
        'Precio Promedio': asset.purchasePrice,
        'Precio Actual': asset.currentPrice,
        'Valor Total': totalValue,
        'Ganancia/Pérdida': profit,
        '%': `${profitPercentage}%`,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Activos');
    XLSX.writeFile(wb, 'activos_portfolio.xlsx');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(16);
    doc.text('Portfolio de Activos', 14, 15);

    // Preparar datos para la tabla
    const tableData = assets.map((asset) => {
      const totalValue = asset.quantity * asset.currentPrice;
      const totalInvestment = asset.quantity * asset.purchasePrice;
      const profit = totalValue - totalInvestment;
      const profitPercentage =
        totalInvestment > 0 ? ((profit / totalInvestment) * 100).toFixed(2) : '0.00';

      return [
        asset.name,
        asset.symbol,
        getTypeLabel(asset.type),
        asset.quantity.toString(),
        `${CURRENCY_SYMBOL}${asset.purchasePrice.toFixed(2)}`,
        `${CURRENCY_SYMBOL}${asset.currentPrice.toFixed(2)}`,
        `${CURRENCY_SYMBOL}${totalValue.toFixed(2)}`,
        `${CURRENCY_SYMBOL}${profit.toFixed(2)}`,
        `${profitPercentage}%`,
      ];
    });

    autoTable(doc, {
      head: [['Activo', 'Símbolo', 'Tipo', 'Cantidad', 'Precio Promedio', 'Precio Actual', 'Valor Total', 'Ganancia/Pérdida', '%']],
      body: tableData,
      startY: 25,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [26, 26, 26] },
      alternateRowStyles: { fillColor: [42, 42, 42] },
    });

    doc.save('activos_portfolio.pdf');
  };

  const exportToJPG = async () => {
    const tableElement = document.querySelector(`.${styles.tableContainer}`);
    if (!tableElement) return;

    try {
      const canvas = await html2canvas(tableElement, {
        backgroundColor: '#2a2a2a',
        scale: 2,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = 'activos_portfolio.jpg';
      link.href = imgData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error al exportar a JPG:', error);
    }
  };

  return (
    <div className={styles.tableContainer} id="asset-table-container">
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
      <div className={styles.exportContainer}>
        <h3 className={styles.exportTitle}>Exportar información</h3>
        <div className={styles.exportButtons}>
          <button
          type="button"
          onClick={exportToExcel}
          className={styles.exportButton}
          title="Exportar a Excel"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Excel
        </button>
        <button
          type="button"
          onClick={exportToPDF}
          className={styles.exportButton}
          title="Exportar a PDF"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          PDF
        </button>
        <button
          type="button"
          onClick={exportToJPG}
          className={styles.exportButton}
          title="Exportar a JPG"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
            <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          JPG
        </button>
        </div>
      </div>
    </div>
  );
};
