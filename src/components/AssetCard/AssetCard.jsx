import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CURRENCY_SYMBOL } from '../../constants';
import { useModal } from '../../hooks/useModal';
import { getStockCandles, getTimeframeParams } from '../../lib/finnhub';
import styles from './AssetCard.module.css';

export const AssetCard = ({ asset, onAddQuantity, onReduceQuantity, onResetAsset, onDeleteAsset }) => {
  const { isOpen: showModal, openModal: openModal, closeModal: closeModal } = useModal(false);
  const { isOpen: showConfirmModal, openModal: openConfirmModal, closeModal: closeConfirmModal } = useModal(false);
  const { isOpen: showDetailModal, openModal: openDetailModal, closeModal: closeDetailModal } = useModal(false);
  const { isOpen: showChartModal, openModal: openChartModal, closeModal: closeChartModal } = useModal(false);
  const [modalQuantityChange, setModalQuantityChange] = useState('0');
  const [modalPrice, setModalPrice] = useState(asset.purchasePrice.toString());
  const [showMenu, setShowMenu] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'reset' o 'delete'
  
  // Estados para el gráfico
  const [chartTimeframe, setChartTimeframe] = useState('1M');
  const [chartData, setChartData] = useState([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [chartError, setChartError] = useState(null);
  const apiKey = import.meta.env.VITE_FINNHUB_API_KEY;

  const totalValue = asset.quantity * asset.currentPrice;
  const totalInvestment = asset.quantity * asset.purchasePrice;
  const profit = totalValue - totalInvestment;
  const profitPercentage = totalInvestment > 0 ? ((profit / totalInvestment) * 100).toFixed(2) : 0;
  const isProfit = profit >= 0;

  const getTypeLabel = (type) => {
    const types = {
      stock: 'Acción',
      accion: 'Acción', // Compatibilidad con datos antiguos
      crypto: 'Cripto',
      criptomoneda: 'Cripto', // Compatibilidad con datos antiguos
      etf: 'ETF',
      fondo: 'Fondo', // Compatibilidad con datos antiguos
      bond: 'Bono',
    };
    return types[type] || type;
  };

  // Obtener step según el tipo de asset (enteros para stocks/bonds/etf, decimales para crypto)
  const getQuantityStep = () => {
    return asset.type === 'crypto' || asset.type === 'criptomoneda' ? '0.00000001' : '1';
  };

  // Cargar datos del gráfico cuando cambia la temporalidad o se abre el modal
  useEffect(() => {
    if (!showChartModal || !apiKey || !asset.symbol) return;

    const loadChartData = async () => {
      setIsLoadingChart(true);
      setChartError(null);

      try {
        const { from, to, resolution } = getTimeframeParams(chartTimeframe);
        const result = await getStockCandles(
          asset.symbol,
          resolution,
          from,
          to,
          apiKey,
          asset.type
        );

        if (result.error) {
          setChartError(result.error);
          setChartData([]);
        } else if (result.data) {
          // Formatear datos para el gráfico
          const formattedData = result.data.map(item => ({
            date: new Date(item.timestamp).toLocaleDateString('es-AR', {
              month: 'short',
              day: 'numeric',
              ...(chartTimeframe === '1Y' || chartTimeframe === 'ALL' ? { year: 'numeric' } : {})
            }),
            value: item.close, // Usar precio de cierre para el gráfico de línea
            fullDate: new Date(item.timestamp),
          }));
          setChartData(formattedData);
        }
      } catch (error) {
        console.error('Error al cargar datos del gráfico:', error);
        setChartError('Error al cargar los datos del gráfico');
        setChartData([]);
      } finally {
        setIsLoadingChart(false);
      }
    };

    loadChartData();
  }, [showChartModal, chartTimeframe, asset.symbol, asset.type, apiKey]);

  const calculateNewAveragePrice = (quantityChange, purchasePrice) => {
    const currentQuantity = asset.quantity;
    const currentPurchasePrice = asset.purchasePrice;
    
    // Manejar valores vacíos o inválidos
    let quantityChangeNum = 0;
    if (quantityChange !== '' && quantityChange !== '-' && quantityChange !== null && quantityChange !== undefined) {
      const parsed = parseFloat(quantityChange);
      quantityChangeNum = isNaN(parsed) ? 0 : parsed;
    }
    
    let purchasePriceNum = 0;
    if (purchasePrice !== '' && purchasePrice !== '-' && purchasePrice !== null && purchasePrice !== undefined) {
      const parsed = parseFloat(purchasePrice);
      purchasePriceNum = isNaN(parsed) ? 0 : parsed;
    }

    // Si no hay cambio en la cantidad, devolver el precio actual
    if (quantityChangeNum === 0) {
      return currentPurchasePrice;
    }

    if (quantityChangeNum > 0) {
      // Agregar cantidad
      if (currentQuantity === 0) {
        // Si la cantidad actual es 0, el nuevo precio es el precio de compra ingresado
        return purchasePriceNum > 0 ? purchasePriceNum : currentPurchasePrice;
      }
      // Si no hay precio de compra válido, mantener el precio actual
      if (purchasePriceNum <= 0) {
        return currentPurchasePrice;
      }
      // Calcular el nuevo precio promedio ponderado
      const totalCurrentValue = currentQuantity * currentPurchasePrice;
      const newQuantityValue = quantityChangeNum * purchasePriceNum;
      const newTotalQuantity = currentQuantity + quantityChangeNum;
      const newAverage = (totalCurrentValue + newQuantityValue) / newTotalQuantity;
      return newAverage;
    } else {
      // Reducir cantidad - el precio promedio no cambia al reducir
      return currentPurchasePrice;
    }
  };

  const handleModalSubmit = (e) => {
    e.preventDefault();
    const quantityChange = parseFloat(modalQuantityChange) || 0;
    const purchasePrice = parseFloat(modalPrice);

    if (purchasePrice <= 0 && quantityChange > 0) return;

    if (quantityChange > 0) {
      // Agregar cantidad
      onAddQuantity(asset.id, quantityChange, purchasePrice);
    } else if (quantityChange < 0) {
      // Reducir cantidad
      onReduceQuantity(asset.id, Math.abs(quantityChange));
    }

    closeModal();
  };

  const handleModalCancel = () => {
    setModalQuantityChange('0');
    setModalPrice(asset.purchasePrice.toString());
    closeModal();
  };

  const handleOpenModal = () => {
    setModalQuantityChange('0');
    setModalPrice(asset.purchasePrice.toString());
    openModal();
  };

  const handleIncrementQuantity = () => {
    const current = parseFloat(modalQuantityChange) || 0;
    const step = parseFloat(getQuantityStep());
    const newValue = current + step;
    setModalQuantityChange(newValue.toString());
  };

  const handleDecrementQuantity = () => {
    const current = parseFloat(modalQuantityChange) || 0;
    const step = parseFloat(getQuantityStep());
    const newValue = Math.max(-asset.quantity, current - step);
    setModalQuantityChange(newValue.toString());
  };

  // Calcular el nuevo precio promedio en tiempo real
  const newAveragePrice = calculateNewAveragePrice(modalQuantityChange, modalPrice);
  
  const quantityChangeNum = (() => {
    if (modalQuantityChange === '' || modalQuantityChange === '-') return 0;
    const parsed = parseFloat(modalQuantityChange);
    return isNaN(parsed) ? 0 : parsed;
  })();
  
  const newQuantity = asset.quantity + quantityChangeNum;

  const handleResetAsset = () => {
    setConfirmAction('reset');
    openConfirmModal();
    setShowMenu(false);
  };

  const handleDeleteAsset = () => {
    setConfirmAction('delete');
    openConfirmModal();
    setShowMenu(false);
  };

  const handleConfirmAction = () => {
    if (confirmAction === 'reset') {
      onResetAsset(asset.id);
    } else if (confirmAction === 'delete') {
      onDeleteAsset(asset.id);
    }
    closeConfirmModal();
    setConfirmAction(null);
  };

  const handleCancelConfirm = () => {
    closeConfirmModal();
    setConfirmAction(null);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenu && !event.target.closest(`.${styles.menuContainer}`)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);



  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.nameSection}>
          <h3 className={styles.name} title={asset.name}>
            {asset.name}
          </h3>
          <span className={styles.symbol}>{asset.symbol}</span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.type}>{getTypeLabel(asset.type)}</span>
          <div className={styles.menuContainer}>
            <button
              type="button"
              className={styles.menuButton}
              onClick={() => setShowMenu(!showMenu)}
              aria-label="Menú de opciones"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 0L9.5 2.5L12.5 1.5L13.5 4.5L16 5.5V10.5L13.5 11.5L12.5 14.5L9.5 13.5L8 16L6.5 13.5L3.5 14.5L2.5 11.5L0 10.5V5.5L2.5 4.5L3.5 1.5L6.5 2.5L8 0Z"
                  fill="currentColor"
                  fillOpacity="0.8"
                />
                <circle cx="8" cy="8" r="3" fill="currentColor" />
              </svg>
            </button>
            {showMenu && (
              <div className={styles.dropdownMenu}>
                <button
                  type="button"
                  className={styles.menuItem}
                  onClick={handleResetAsset}
                >
                  Resetear a 0
                </button>
                <button
                  type="button"
                  className={`${styles.menuItem} ${styles.menuItemDanger}`}
                  onClick={handleDeleteAsset}
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.row}>
          <span className={styles.label}>Cantidad</span>
          <span className={styles.value}>{asset.quantity}</span>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>Precio Promedio</span>
          <span className={styles.value}>
            {CURRENCY_SYMBOL}
            {asset.purchasePrice.toLocaleString('es-AR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>Precio Actual</span>
          <span className={styles.value}>
            {CURRENCY_SYMBOL}
            {asset.currentPrice.toLocaleString('es-AR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            {asset.isPriceEstimated && (
              <span className={styles.estimatedBadge} title="Precio estimado - Se actualizará automáticamente">
                ⚠️ Estimado
              </span>
            )}
          </span>
        </div>
        {asset.isPriceEstimated && (
          <div className={styles.estimatedWarning}>
            <span className={styles.warningIcon}>⚠️</span>
            <span className={styles.warningText}>
              El valor está estimado. Debe aguardarse una actualización del sistema.
            </span>
          </div>
        )}

        <div className={styles.row}>
          <span className={styles.label}>Valor Total</span>
          <span className={`${styles.value} ${styles.totalValue}`}>
            {CURRENCY_SYMBOL}
            {totalValue.toLocaleString('es-AR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.fullWidthButton}`}
          onClick={openChartModal}
        >
          Ver gráfico
        </button>
        <div className={styles.actionsRow}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={openDetailModal}
          >
            Ver detalle
          </button>
          <button
            type="button"
            className={styles.actionButton}
            onClick={handleOpenModal}
          >
            Modificar cantidad del activo
          </button>
        </div>
      </div>

      <div className={styles.cardActions}>
        <button
          type="button"
          className={styles.cardActionButton}
          onClick={() => {}}
        >
          Analizar este activo
        </button>
        <button
          type="button"
          className={styles.cardActionButton}
          onClick={() => {}}
        >
          Noticias sobre este activo
        </button>
        <button
          type="button"
          className={styles.cardActionButton}
          onClick={() => {}}
        >
          Programar alerta
        </button>
      </div>

      {showModal &&
        createPortal(
          <div
            className={styles.modalOverlay}
            onClick={(e) => {
              // Solo cerrar si el clic es directamente en el overlay, no en el contenido
              if (e.target === e.currentTarget) {
                handleModalCancel();
              }
            }}
          >
            <div
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className={styles.modalTitle}>Modificar cantidad del activo</h3>
              <form onSubmit={handleModalSubmit} className={styles.modalForm}>
                <div className={styles.modalFormGroup}>
                  <label className={styles.modalLabel}>Cantidad actual</label>
                  <div className={styles.modalCurrentValue}>
                    {asset.quantity.toLocaleString('es-AR', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div className={styles.modalFormGroup}>
                  <label className={styles.modalLabel}>Variación de cantidad</label>
                  <div className={styles.quantityInputGroup}>
                    <button
                      type="button"
                      onClick={handleDecrementQuantity}
                      className={styles.quantityButton}
                      disabled={parseFloat(modalQuantityChange) <= -asset.quantity}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      step={getQuantityStep()}
                      value={modalQuantityChange}
                      readOnly
                      className={styles.modalInput}
                    />
                    <button
                      type="button"
                      onClick={handleIncrementQuantity}
                      className={styles.quantityButton}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className={styles.modalFormGroup}>
                  <label className={styles.modalLabel}>Precio de compra</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={modalPrice}
                    onChange={(e) => setModalPrice(e.target.value)}
                    className={styles.modalInput}
                    required={parseFloat(modalQuantityChange) > 0}
                  />
                </div>
                <div className={styles.modalFormGroup}>
                  <label className={styles.modalLabel}>Variación de PPC</label>
                  <div className={styles.modalCurrentValue}>
                    {CURRENCY_SYMBOL}
                    {Number.isFinite(newAveragePrice) 
                      ? newAveragePrice.toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : asset.purchasePrice.toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                    }
                  </div>
                </div>
                <div className={styles.modalButtons}>
                  <button
                    type="button"
                    onClick={handleModalCancel}
                    className={styles.modalCancelBtn}
                  >
                    Rechazar
                  </button>
                  <button
                    type="submit"
                    className={styles.modalAcceptBtn}
                    disabled={
                      parseFloat(modalQuantityChange) === 0 ||
                      (parseFloat(modalQuantityChange) > 0 && parseFloat(modalPrice) <= 0)
                    }
                  >
                    Aceptar
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {showConfirmModal &&
        createPortal(
          <div
            className={styles.modalOverlay}
            onClick={(e) => {
              // Solo cerrar si el clic es directamente en el overlay, no en el contenido
              if (e.target === e.currentTarget) {
                handleCancelConfirm();
              }
            }}
          >
            <div
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className={styles.modalTitle}>Confirmar acción</h3>
              <div className={styles.confirmMessage}>
                <p>
                  Atención: esta acción no puede deshacerse, si elimina el asset o resetea sus valores deberá cargarlos nuevamente.
                </p>
              </div>
              <div className={styles.modalButtons}>
                <button
                  type="button"
                  onClick={handleCancelConfirm}
                  className={confirmAction === 'delete' ? styles.modalCancelBtnSafe : styles.modalCancelBtn}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  className={`${styles.modalAcceptBtn} ${confirmAction === 'delete' ? styles.deleteBtn : ''}`}
                >
                  {confirmAction === 'reset' ? 'Resetear' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

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
              className={`${styles.modalContent} ${styles.detailModalContent}`}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Detalle del Activo</h3>
                <button
                  type="button"
                  onClick={closeDetailModal}
                  className={styles.closeButton}
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>

              <div className={styles.detailContent}>
                {/* Información general del activo */}
                <div className={styles.detailSection}>
                  <h4 className={styles.detailSectionTitle}>Información General</h4>
                  <div className={styles.detailGrid}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Nombre:</span>
                      <span className={styles.detailValue}>{asset.name}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Símbolo:</span>
                      <span className={styles.detailValue}>{asset.symbol}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Tipo:</span>
                      <span className={styles.detailValue}>{getTypeLabel(asset.type)}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Cantidad Total:</span>
                      <span className={styles.detailValue}>
                        {asset.quantity.toLocaleString('es-AR', {
                          minimumFractionDigits: asset.type === 'crypto' || asset.type === 'criptomoneda' ? 8 : 0,
                          maximumFractionDigits: asset.type === 'crypto' || asset.type === 'criptomoneda' ? 8 : 2
                        })}
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>PPC Promedio:</span>
                      <span className={styles.detailValue}>
                        {CURRENCY_SYMBOL}
                        {asset.purchasePrice.toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Precio Actual:</span>
                      <span className={styles.detailValue}>
                        {CURRENCY_SYMBOL}
                        {asset.currentPrice.toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Desglose por brokers */}
                {asset.brokers && asset.brokers.length > 0 ? (
                  <div className={styles.detailSection}>
                    <h4 className={styles.detailSectionTitle}>Desglose por Broker</h4>
                    <div className={styles.brokersTable}>
                      <div className={styles.brokersTableHeader}>
                        <div className={styles.brokerTableCell}>Broker</div>
                        <div className={styles.brokerTableCell}>Cantidad</div>
                        <div className={styles.brokerTableCell}>PPC</div>
                        <div className={styles.brokerTableCell}>Valor</div>
                      </div>
                      {asset.brokers.map((broker, index) => {
                        const brokerValue = broker.quantity * broker.purchasePrice;
                        return (
                          <div key={index} className={styles.brokersTableRow}>
                            <div className={styles.brokerTableCell}>{broker.broker}</div>
                            <div className={styles.brokerTableCell}>
                              {broker.quantity.toLocaleString('es-AR', {
                                minimumFractionDigits: asset.type === 'crypto' || asset.type === 'criptomoneda' ? 8 : 0,
                                maximumFractionDigits: asset.type === 'crypto' || asset.type === 'criptomoneda' ? 8 : 2
                              })}
                            </div>
                            <div className={styles.brokerTableCell}>
                              {CURRENCY_SYMBOL}
                              {broker.purchasePrice.toLocaleString('es-AR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </div>
                            <div className={styles.brokerTableCell}>
                              {CURRENCY_SYMBOL}
                              {brokerValue.toLocaleString('es-AR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className={styles.detailSection}>
                    <p className={styles.noBrokersMessage}>
                      No hay información de brokers disponible para este activo.
                    </p>
                  </div>
                )}

                {/* Resumen de valores */}
                <div className={styles.detailSection}>
                  <h4 className={styles.detailSectionTitle}>Resumen</h4>
                  <div className={styles.detailGrid}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Valor Total:</span>
                      <span className={`${styles.detailValue} ${styles.totalValueDetail}`}>
                        {CURRENCY_SYMBOL}
                        {totalValue.toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Inversión Total:</span>
                      <span className={styles.detailValue}>
                        {CURRENCY_SYMBOL}
                        {totalInvestment.toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>{isProfit ? 'Ganancia' : 'Pérdida'}:</span>
                      <span className={`${styles.detailValue} ${isProfit ? styles.profitDetail : styles.lossDetail}`}>
                        {isProfit ? '+' : ''}
                        {CURRENCY_SYMBOL}
                        {profit.toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                        {' '}({isProfit ? '+' : ''}{profitPercentage}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.modalButtons}>
                <button
                  type="button"
                  onClick={closeDetailModal}
                  className={styles.modalAcceptBtn}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal de gráfico */}
      {showChartModal &&
        createPortal(
          <div
            className={styles.modalOverlay}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeChartModal();
              }
            }}
          >
            <div
              className={`${styles.modalContent} ${styles.chartModalContent}`}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  Gráfico de {asset.name} ({asset.symbol})
                </h3>
                <button
                  type="button"
                  onClick={closeChartModal}
                  className={styles.closeButton}
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>

              {/* Selector de temporalidad */}
              <div className={styles.timeframeSelector}>
                {['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'].map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    className={`${styles.timeframeButton} ${chartTimeframe === tf ? styles.timeframeButtonActive : ''}`}
                    onClick={() => setChartTimeframe(tf)}
                  >
                    {tf === '1D' ? '1 Día' :
                     tf === '1W' ? '1 Semana' :
                     tf === '1M' ? '1 Mes' :
                     tf === '3M' ? '3 Meses' :
                     tf === '6M' ? '6 Meses' :
                     tf === '1Y' ? '1 Año' :
                     'Todo'}
                  </button>
                ))}
              </div>

              {/* Gráfico */}
              <div className={styles.chartContainer}>
                {isLoadingChart ? (
                  <div className={styles.chartLoading}>
                    Cargando datos del gráfico...
                  </div>
                ) : chartError ? (
                  <div className={styles.chartError}>
                    {chartError}
                  </div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="rgba(255, 255, 255, 0.6)"
                        style={{ fontSize: '0.75rem' }}
                      />
                      <YAxis 
                        stroke="rgba(255, 255, 255, 0.6)"
                        style={{ fontSize: '0.75rem' }}
                        tickFormatter={(value) => `${CURRENCY_SYMBOL}${value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#2a2a2a',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: 'rgba(255, 255, 255, 0.9)',
                        }}
                        formatter={(value) => [
                          `${CURRENCY_SYMBOL}${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                          'Precio'
                        ]}
                        labelFormatter={(label) => `Fecha: ${label}`}
                      />
                      <Legend 
                        wrapperStyle={{ color: 'rgba(255, 255, 255, 0.7)' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#646cff" 
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, fill: '#646cff' }}
                        name="Precio de Cierre"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={styles.chartError}>
                    No hay datos disponibles para mostrar
                  </div>
                )}
              </div>

              <div className={styles.modalButtons}>
                <button
                  type="button"
                  onClick={closeChartModal}
                  className={styles.modalAcceptBtn}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      <div className={`${styles.footer} ${isProfit ? styles.profit : styles.loss}`}>
        <div className={styles.profitLabel}>{isProfit ? 'Ganancia' : 'Pérdida'}</div>
        <div className={styles.profitValue}>
          {isProfit ? '+' : ''}
          {CURRENCY_SYMBOL}
          {profit.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className={styles.profitPercentage}>
          {isProfit ? '+' : ''}
          {profitPercentage}%
        </div>
      </div>
    </div>
  );
};
