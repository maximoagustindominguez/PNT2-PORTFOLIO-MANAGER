import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CURRENCY_SYMBOL } from '../../constants';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import styles from './AssetTable.module.css';

export const AssetTable = ({ assets }) => {
  const [sortColumn, setSortColumn] = useState('activo'); // Ordenamiento por defecto
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' o 'desc'
  const [showExportModal, setShowExportModal] = useState(false);

  const getTypeLabel = (type) => {
    const types = {
      accion: 'Acción',
      criptomoneda: 'Cripto',
      fondo: 'Fondo',
      bond: 'Bond',
    };
    return types[type] || type;
  };

  const sortedAssets = useMemo(() => {
    if (!sortColumn) return assets;

    const sorted = [...assets].sort((a, b) => {
      let aValue, bValue;

      switch (sortColumn) {
        case 'activo':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'tipo':
          aValue = getTypeLabel(a.type).toLowerCase();
          bValue = getTypeLabel(b.type).toLowerCase();
          break;
        case 'cantidad':
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        case 'precioPromedio':
          aValue = a.purchasePrice;
          bValue = b.purchasePrice;
          break;
        case 'precioActual':
          aValue = a.currentPrice;
          bValue = b.currentPrice;
          break;
        case 'valorTotal':
          aValue = a.quantity * a.currentPrice;
          bValue = b.quantity * b.currentPrice;
          break;
        case 'gananciaPerdida':
          aValue = a.quantity * a.currentPrice - a.quantity * a.purchasePrice;
          bValue = b.quantity * b.currentPrice - b.quantity * b.purchasePrice;
          break;
        case 'porcentaje':
          const aProfit = a.quantity * a.currentPrice - a.quantity * a.purchasePrice;
          const bProfit = b.quantity * b.currentPrice - b.quantity * b.purchasePrice;
          const aInvestment = a.quantity * a.purchasePrice;
          const bInvestment = b.quantity * b.purchasePrice;
          aValue = aInvestment > 0 ? (aProfit / aInvestment) * 100 : 0;
          bValue = bInvestment > 0 ? (bProfit / bInvestment) * 100 : 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });

    return sorted;
  }, [assets, sortColumn, sortDirection]);

  const exportToExcel = () => {
    const dataToExport = sortedAssets;
    const data = dataToExport.map((asset) => {
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
    setShowExportModal(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(16);
    doc.text('Portfolio de Activos', 14, 15);

    // Preparar datos para la tabla usando sortedAssets
    const dataToExport = sortedAssets;
    const tableData = dataToExport.map((asset) => {
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
    setShowExportModal(false);
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
      setShowExportModal(false);
    } catch (error) {
      console.error('Error al exportar a JPG:', error);
    }
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      // Si ya está ordenando por esta columna, cambiar dirección
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Nueva columna, empezar con ascendente
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Deshabilitar scroll y grisar el fondo cuando el modal está abierto
  useEffect(() => {
    if (showExportModal) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [showExportModal]);

  return (
    <div className={styles.tableContainer} id="asset-table-container">
      <table className={styles.table}>
        <thead>
          <tr>
            <th
              className={styles.sortableHeader}
              onClick={() => handleSort('activo')}
            >
              <div className={styles.headerContent}>
                Activo
                {sortColumn === 'activo' && (
                  <span className={styles.sortIcon}>
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </th>
            <th
              className={styles.sortableHeader}
              onClick={() => handleSort('tipo')}
            >
              <div className={styles.headerContent}>
                Tipo
                {sortColumn === 'tipo' && (
                  <span className={styles.sortIcon}>
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </th>
            <th
              className={styles.sortableHeader}
              onClick={() => handleSort('cantidad')}
            >
              <div className={styles.headerContent}>
                Cantidad
                {sortColumn === 'cantidad' && (
                  <span className={styles.sortIcon}>
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </th>
            <th
              className={styles.sortableHeader}
              onClick={() => handleSort('precioPromedio')}
            >
              <div className={styles.headerContent}>
                Precio Promedio
                {sortColumn === 'precioPromedio' && (
                  <span className={styles.sortIcon}>
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </th>
            <th
              className={styles.sortableHeader}
              onClick={() => handleSort('precioActual')}
            >
              <div className={styles.headerContent}>
                Precio Actual
                {sortColumn === 'precioActual' && (
                  <span className={styles.sortIcon}>
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </th>
            <th
              className={styles.sortableHeader}
              onClick={() => handleSort('valorTotal')}
            >
              <div className={styles.headerContent}>
                Valor Total
                {sortColumn === 'valorTotal' && (
                  <span className={styles.sortIcon}>
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </th>
            <th
              className={styles.sortableHeader}
              onClick={() => handleSort('gananciaPerdida')}
            >
              <div className={styles.headerContent}>
                Ganancia/Pérdida
                {sortColumn === 'gananciaPerdida' && (
                  <span className={styles.sortIcon}>
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </th>
            <th
              className={styles.sortableHeader}
              onClick={() => handleSort('porcentaje')}
            >
              <div className={styles.headerContent}>
                %
                {sortColumn === 'porcentaje' && (
                  <span className={styles.sortIcon}>
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedAssets.map((asset) => {
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
        <button
          type="button"
          onClick={() => setShowExportModal(true)}
          className={styles.exportConsolidatedButton}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Exportar Consolidado
        </button>
      </div>

      {showExportModal &&
        createPortal(
          <div
            className={styles.modalOverlay}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowExportModal(false);
              }
            }}
          >
            <div
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className={styles.modalTitle}>Exportar información</h3>
              <div className={styles.exportModalOptions}>
                <button
                  type="button"
                  onClick={exportToExcel}
                  className={styles.exportOptionButton}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Excel</span>
                </button>
                <button
                  type="button"
                  onClick={exportToPDF}
                  className={styles.exportOptionButton}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={exportToJPG}
                  className={styles.exportOptionButton}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
                    <path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>JPG</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className={styles.modalCancelBtn}
              >
                Cancelar
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
