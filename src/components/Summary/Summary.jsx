import { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { CURRENCY_SYMBOL } from '../../constants';
import { useModal } from '../../hooks/useModal';
import styles from './Summary.module.css';

export const Summary = ({ totalValue, totalInvestment, totalProfit, assets }) => {
  const { isOpen: showDetailModal, openModal: openDetailModal, closeModal: closeDetailModal } = useModal(false);
  const { isOpen: showExportModal, openModal: openExportModal, closeModal: closeExportModal } = useModal(false);
  const [timeframe, setTimeframe] = useState('todo'); // diario, 3dias, semanal, mensual, trimestral, semestral, anual, todo
  const chartRef = useRef(null);

  const profitPercentage =
    totalInvestment > 0 ? ((totalProfit / totalInvestment) * 100).toFixed(2) : 0;

  const isProfit = totalProfit >= 0;

  const getTypeLabel = (type) => {
    if (!type) return 'Desconocido';
    
    const normalizedType = type.toLowerCase().trim();
    
    const types = {
      // Tipos actuales de Finnhub
      stock: 'Acciones',
      stocks: 'Acciones',
      equity: 'Acciones',
      equities: 'Acciones',
      share: 'Acciones',
      shares: 'Acciones',
      action: 'Acciones',
      acciones: 'Acciones',
      accion: 'Acciones', // Compatibilidad con datos antiguos
      
      crypto: 'Cripto',
      cryptocurrency: 'Cripto',
      cryptocurrencies: 'Cripto',
      cripto: 'Cripto',
      criptomoneda: 'Cripto', // Compatibilidad con datos antiguos
      criptomonedas: 'Cripto',
      bitcoin: 'Cripto',
      ethereum: 'Cripto',
      
      etf: 'ETF',
      etfs: 'ETF',
      exchange: 'ETF',
      traded: 'ETF',
      'exchange-traded': 'ETF',
      'exchange traded': 'ETF',
      fondo: 'Fondos', // Compatibilidad con datos antiguos
      fondos: 'Fondos',
      mutual: 'Fondos',
      'mutual fund': 'Fondos',
      'mutualfund': 'Fondos',
      fund: 'Fondos', // Por defecto, fund se mapea a Fondos
      funds: 'Fondos',
      
      bond: 'Bonos',
      bonds: 'Bonos',
      bono: 'Bonos',
      treasury: 'Bonos',
      treasuries: 'Bonos',
      fixed: 'Bonos',
      income: 'Bonos',
      
      // Otros tipos posibles
      option: 'Opciones',
      options: 'Opciones',
      opcion: 'Opciones',
      opciones: 'Opciones',
      
      future: 'Futuros',
      futures: 'Futuros',
      futuro: 'Futuros',
      futuros: 'Futuros',
      
      commodity: 'Commodities',
      commodities: 'Commodities',
      materias: 'Commodities',
      materia: 'Commodities',
      
      forex: 'Forex',
      currency: 'Forex',
      currencies: 'Forex',
      divisas: 'Forex',
      
      real: 'Real Estate',
      estate: 'Real Estate',
      realestate: 'Real Estate',
      inmuebles: 'Real Estate',
      property: 'Real Estate',
      
      unknown: 'Desconocido',
      desconocido: 'Desconocido',
      other: 'Otros',
      otros: 'Otros',
    };
    
    return types[normalizedType] || type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };

  // Agrupar ganancias/pérdidas por tipo de activo
  const profitByType = useMemo(() => {
    // Usar un Map para agrupar por etiqueta normalizada (como se muestra en AssetCard)
    const grouped = new Map();

    assets.forEach((asset) => {
      const totalValue = asset.quantity * asset.currentPrice;
      const totalInvestment = asset.quantity * asset.purchasePrice;
      const profit = totalValue - totalInvestment;

      // Obtener el tipo del asset tal como viene de la base de datos
      const assetType = asset.type || 'stock';
      
      // Obtener la etiqueta normalizada usando getTypeLabel (igual que en AssetCard)
      const typeLabel = getTypeLabel(assetType);
      
      // Agrupar por la etiqueta normalizada (no por el tipo crudo)
      // Esto asegura que todos los activos del mismo tipo se agrupen correctamente
      if (!grouped.has(typeLabel)) {
        grouped.set(typeLabel, { profit: 0, label: typeLabel });
      }
      
      // Sumar la ganancia/pérdida
      const group = grouped.get(typeLabel);
      group.profit += profit;
    });

    // Convertir a array para el gráfico
    return Array.from(grouped.values())
      .map((data) => ({
        name: data.label,
        value: Math.abs(data.profit),
        profit: data.profit,
        isProfit: data.profit >= 0,
      }))
      .filter((item) => item.value > 0); // Solo mostrar tipos con valor
  }, [assets]);

  // Colores únicos para cada tipo de asset
  const TYPE_COLORS = {
    'Acciones': '#646cff',
    'Cripto': '#f59e0b',
    'ETF': '#10b981',
    'Fondos': '#10b981',
    'Bonos': '#8b5cf6',
    'Opciones': '#ec4899',
    'Futuros': '#06b6d4',
    'Commodities': '#f97316',
    'Forex': '#84cc16',
    'Real Estate': '#a855f7',
    'Desconocido': '#6b7280',
    'Otros': '#6b7280',
  };

  // Función para obtener el color según el tipo
  const getColorForType = (typeName) => {
    // Buscar el color exacto primero
    if (TYPE_COLORS[typeName]) {
      return TYPE_COLORS[typeName];
    }
    
    // Si no se encuentra, buscar por coincidencia parcial (case-insensitive)
    const normalizedName = typeName.toLowerCase();
    for (const [key, color] of Object.entries(TYPE_COLORS)) {
      if (key.toLowerCase() === normalizedName) {
        return color;
      }
    }
    
    // Color por defecto para tipos no reconocidos
    return '#6b7280';
  };


  const exportToExcel = () => {
    const data = profitByType.map((item) => ({
      Tipo: item.name,
      'Ganancia/Pérdida': item.profit >= 0 
        ? `+${CURRENCY_SYMBOL}${Math.abs(item.profit).toFixed(2)}` 
        : `-${CURRENCY_SYMBOL}${Math.abs(item.profit).toFixed(2)}`,
      'Valor Absoluto': Math.abs(item.profit),
      'Porcentaje': `${((item.profit / totalProfit) * 100).toFixed(2)}%`,
      Estado: item.isProfit ? 'Ganancia' : 'Pérdida',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ganancia_Perdida');
    XLSX.writeFile(wb, `ganancia_perdida_${timeframe}.xlsx`);
    closeExportModal();
  };

  const exportToPDF = async () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(16);
    doc.text('Detalle de Ganancia/Pérdida', 14, 15);
    doc.setFontSize(12);
    doc.text(`Temporalidad: ${timeframe === 'todo' ? 'Todo el tiempo' : timeframe}`, 14, 25);

    // Preparar datos para la tabla
    const tableData = profitByType.map((item) => [
      item.name,
      item.profit >= 0 
        ? `+${CURRENCY_SYMBOL}${Math.abs(item.profit).toFixed(2)}` 
        : `-${CURRENCY_SYMBOL}${Math.abs(item.profit).toFixed(2)}`,
      `${((item.profit / totalProfit) * 100).toFixed(2)}%`,
      item.isProfit ? 'Ganancia' : 'Pérdida',
    ]);

    const tableResult = autoTable(doc, {
      head: [['Tipo', 'Ganancia/Pérdida', 'Porcentaje', 'Estado']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [26, 26, 26] },
      alternateRowStyles: { fillColor: [42, 42, 42] },
    });

    // Intentar capturar el gráfico si está disponible
    if (chartRef.current) {
      try {
        const canvas = await html2canvas(chartRef.current, {
          backgroundColor: '#2a2a2a',
          scale: 2,
          logging: false,
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 180;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 14;
        
        // Calcular posición inicial después de la tabla
        let yPosition = (tableResult && tableResult.finalY) ? tableResult.finalY + 10 : 100;
        
        // Si la imagen no cabe en la página actual, agregar nueva página
        if (yPosition + imgHeight > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        
        // Agregar la imagen
        doc.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
      } catch (error) {
        console.error('Error al agregar gráfico al PDF:', error);
      }
    }

    doc.save(`ganancia_perdida_${timeframe}.pdf`);
    closeExportModal();
  };

  const exportToJPG = async () => {
    const chartElement = chartRef.current;
    if (!chartElement) return;

    try {
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#2a2a2a',
        scale: 2,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = `ganancia_perdida_${timeframe}.jpg`;
      link.href = imgData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      closeExportModal();
    } catch (error) {
      console.error('Error al exportar a JPG:', error);
    }
  };

  return (
    <div className={styles.summary}>
      <div className={styles.card}>
        <div className={styles.label}>Valor Total</div>
        <div className={styles.value}>
          {CURRENCY_SYMBOL}
          {totalValue.toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>Inversión Total</div>
        <div className={styles.value}>
          {CURRENCY_SYMBOL}
          {totalInvestment.toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>
      <div className={`${styles.card} ${isProfit ? styles.profit : styles.loss}`}>
        <div className={styles.label}>Ganancia/Pérdida</div>
        <div className={styles.value}>
          {isProfit ? '+' : ''}
          {CURRENCY_SYMBOL}
          {totalProfit.toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
        <div className={styles.percentage}>
          {isProfit ? '+' : ''}
          {profitPercentage}%
        </div>
        <button
          type="button"
          onClick={openDetailModal}
          className={styles.detailButton}
        >
          Ver detalle
        </button>
      </div>

      {showDetailModal &&
        createPortal(
          <div
            className={styles.modalOverlay}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeDetailModal();
              }
            }}
          >
            <div
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className={styles.modalTitle}>Detalle de Ganancia/Pérdida</h3>
              
              <div className={styles.chartContainer} ref={chartRef}>
                {profitByType.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={profitByType}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ profit, percent }) => {
                          const profitValue = profit >= 0 
                            ? `+${CURRENCY_SYMBOL}${Math.abs(profit).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                            : `-${CURRENCY_SYMBOL}${Math.abs(profit).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                          return `${profitValue}\n(${(percent * 100).toFixed(1)}%)`;
                        }}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {profitByType.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={getColorForType(entry.name)}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name, props) => {
                          const profit = props.payload.profit;
                          const profitValue = profit >= 0 
                            ? `+${CURRENCY_SYMBOL}${Math.abs(profit).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                            : `-${CURRENCY_SYMBOL}${Math.abs(profit).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                          return [profitValue, props.payload.name];
                        }}
                        contentStyle={{
                          backgroundColor: '#2a2a2a',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: 'rgba(255, 255, 255, 0.9)',
                        }}
                      />
                      <Legend 
                        verticalAlign="bottom"
                        formatter={(value, entry) => {
                          const profit = entry.payload.profit;
                          const profitValue = profit >= 0 
                            ? `+${CURRENCY_SYMBOL}${Math.abs(profit).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                            : `-${CURRENCY_SYMBOL}${Math.abs(profit).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                          return `${value}: ${profitValue}`;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={styles.noData}>No hay datos para mostrar</div>
                )}
              </div>

              <div className={styles.timeframeBar}>
                <button
                  type="button"
                  onClick={() => setTimeframe('diario')}
                  className={`${styles.timeframeButton} ${timeframe === 'diario' ? styles.timeframeButtonActive : ''}`}
                >
                  1d
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe('3dias')}
                  className={`${styles.timeframeButton} ${timeframe === '3dias' ? styles.timeframeButtonActive : ''}`}
                >
                  3d
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe('semanal')}
                  className={`${styles.timeframeButton} ${timeframe === 'semanal' ? styles.timeframeButtonActive : ''}`}
                >
                  1sem
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe('mensual')}
                  className={`${styles.timeframeButton} ${timeframe === 'mensual' ? styles.timeframeButtonActive : ''}`}
                >
                  1mes
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe('trimestral')}
                  className={`${styles.timeframeButton} ${timeframe === 'trimestral' ? styles.timeframeButtonActive : ''}`}
                >
                  3meses
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe('semestral')}
                  className={`${styles.timeframeButton} ${timeframe === 'semestral' ? styles.timeframeButtonActive : ''}`}
                >
                  6meses
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe('anual')}
                  className={`${styles.timeframeButton} ${timeframe === 'anual' ? styles.timeframeButtonActive : ''}`}
                >
                  1año
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe('todo')}
                  className={`${styles.timeframeButton} ${timeframe === 'todo' ? styles.timeframeButtonActive : ''}`}
                >
                  Todo el tiempo
                </button>
              </div>

              <button
                type="button"
                onClick={openExportModal}
                className={styles.exportGraphButton}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Exportar gráfico
              </button>

              <button
                type="button"
                onClick={closeDetailModal}
                className={styles.modalCloseButton}
              >
                Cerrar
              </button>
            </div>
          </div>,
          document.body
        )}

      {showExportModal &&
        createPortal(
          <div
            className={styles.modalOverlay}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeExportModal();
              }
            }}
          >
            <div
              className={styles.exportModalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className={styles.modalTitle}>Exportar gráfico</h3>
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
                onClick={closeExportModal}
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
