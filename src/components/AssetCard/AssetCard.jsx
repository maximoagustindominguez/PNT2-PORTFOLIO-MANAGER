import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CURRENCY_SYMBOL } from '../../constants';
import { useModal } from '../../hooks/useModal';
import { getStockCandles, getTimeframeParams, getCompanyNews } from '../../lib/finnhub';
import styles from './AssetCard.module.css';

export const AssetCard = ({ asset, onAddQuantity, onReduceQuantity, onResetAsset, onDeleteAsset, onUpdateBrokers }) => {
  const { isOpen: showModal, openModal: openModal, closeModal: closeModal } = useModal(false);
  const { isOpen: showConfirmModal, openModal: openConfirmModal, closeModal: closeConfirmModal } = useModal(false);
  const { isOpen: showDetailModal, openModal: openDetailModal, closeModal: closeDetailModal } = useModal(false);
  const { isOpen: showChartModal, openModal: openChartModal, closeModal: closeChartModal } = useModal(false);
  const { isOpen: showNewsModal, openModal: openNewsModal, closeModal: closeNewsModal } = useModal(false);
  const [modalBrokers, setModalBrokers] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'reset' o 'delete'
  
  // Estados para el gráfico
  const [chartTimeframe, setChartTimeframe] = useState('1M');
  const [chartData, setChartData] = useState([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [chartError, setChartError] = useState(null);
  
  // Estados para las noticias
  const [news, setNews] = useState([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [newsError, setNewsError] = useState(null);
  
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

  // Cargar noticias cuando se abre el modal de noticias
  useEffect(() => {
    if (!showNewsModal || !apiKey || !asset.symbol) return;

    // Verificar si el tipo de activo soporta noticias
    // Las noticias de Finnhub funcionan principalmente para acciones y ETFs
    const supportsNews = asset.type === 'stock' || asset.type === 'accion' || asset.type === 'etf' || asset.type === 'fondo';

    const loadNews = async () => {
      setIsLoadingNews(true);
      setNewsError(null);
      setNews([]);

      if (!supportsNews) {
        setNewsError('Por el momento solo hay noticias para los activos de tipo ETF y Acciones.');
        setIsLoadingNews(false);
        return;
      }

      try {
        // Obtener noticias de los últimos 30 días
        const result = await getCompanyNews(asset.symbol, apiKey);

        if (result.error) {
          setNewsError(result.error);
          setNews([]);
        } else if (result.data) {
          setNews(result.data);
        }
      } catch (error) {
        console.error('Error al cargar noticias:', error);
        setNewsError('Error al cargar las noticias');
        setNews([]);
      } finally {
        setIsLoadingNews(false);
      }
    };

    loadNews();
  }, [showNewsModal, asset.symbol, asset.type, apiKey]);

  // Calcular cantidad total y PPC promedio ponderado desde los brokers
  const calculateTotalsFromBrokers = () => {
    let totalQuantity = 0;
    let totalValue = 0;
    
    modalBrokers.forEach(broker => {
      const qty = parseFloat(broker.quantity) || 0;
      const ppc = parseFloat(broker.purchasePrice) || 0;
      if (qty > 0 && ppc > 0) {
        totalQuantity += qty;
        totalValue += qty * ppc;
      }
    });
    
    const averagePPC = totalQuantity > 0 ? totalValue / totalQuantity : 0;
    
    return { totalQuantity, averagePPC };
  };

  const { totalQuantity: calculatedTotalQuantity, averagePPC: calculatedAveragePPC } = calculateTotalsFromBrokers();

  const handleBrokerChange = (index, field, value) => {
    const updatedBrokers = [...modalBrokers];
    updatedBrokers[index] = {
      ...updatedBrokers[index],
      [field]: value,
    };
    setModalBrokers(updatedBrokers);
  };

  const handleAddBroker = () => {
    setModalBrokers([...modalBrokers, { broker: '', quantity: '0', purchasePrice: '0' }]);
  };

  const handleRemoveBroker = (index) => {
    if (modalBrokers.length > 1) {
      const updatedBrokers = modalBrokers.filter((_, i) => i !== index);
      setModalBrokers(updatedBrokers);
    }
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    
    // Validar que haya al menos un broker con datos válidos
    const validBrokers = modalBrokers.filter(b => 
      b.broker && b.broker.trim() && 
      parseFloat(b.quantity) > 0 && 
      parseFloat(b.purchasePrice) > 0
    );
    
    if (validBrokers.length === 0) {
      alert('Debe haber al menos un broker con cantidad y PPC válidos');
      return;
    }
    
    if (onUpdateBrokers) {
      const result = await onUpdateBrokers(asset.id, validBrokers);
      if (result.success) {
        closeModal();
      } else {
        alert(result.error || 'Error al actualizar los brokers');
      }
    }
  };

  const handleModalCancel = () => {
    setModalBrokers([]);
    closeModal();
  };

  const handleOpenModal = () => {
    // Inicializar los brokers desde el asset, o crear uno vacío si no hay
    if (asset.brokers && asset.brokers.length > 0) {
      setModalBrokers(asset.brokers.map(b => ({
        broker: b.broker || '',
        quantity: b.quantity?.toString() || '0',
        purchasePrice: b.purchasePrice?.toString() || '0',
      })));
    } else {
      // Si no hay brokers, crear uno vacío
      setModalBrokers([{ broker: '', quantity: '0', purchasePrice: '0' }]);
    }
    openModal();
  };

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
          Modificar
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
          onClick={openNewsModal}
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
                {/* Lista de brokers */}
                <div className={styles.modalFormGroup}>
                  <label className={styles.modalLabel}>Brokers y cantidades</label>
                  <div className={styles.brokersList}>
                    {modalBrokers.map((broker, index) => (
                      <div key={index} className={styles.brokerRow}>
                        <input
                          type="text"
                          placeholder="Nombre del broker"
                          value={broker.broker}
                          onChange={(e) => handleBrokerChange(index, 'broker', e.target.value)}
                          className={styles.brokerInput}
                          onBlur={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        />
                        <input
                          type="number"
                          step={getQuantityStep()}
                          min="0"
                          placeholder="Cantidad"
                          value={broker.quantity}
                          onChange={(e) => handleBrokerChange(index, 'quantity', e.target.value)}
                          className={styles.quantityInput}
                          onBlur={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="PPC"
                          value={broker.purchasePrice}
                          onChange={(e) => handleBrokerChange(index, 'purchasePrice', e.target.value)}
                          className={styles.ppcInput}
                          onBlur={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        />
                        {modalBrokers.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRemoveBroker(index);
                            }}
                            className={styles.removeBrokerBtn}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddBroker();
                      }}
                      className={styles.addBrokerBtn}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      + Agregar broker
                    </button>
                  </div>
                </div>

                {/* Totales calculados */}
                <div className={styles.totalsRow}>
                  <div className={styles.modalFormGroup}>
                    <label className={styles.modalLabel}>Cantidad total</label>
                    <div className={styles.modalCurrentValue}>
                      {calculatedTotalQuantity.toLocaleString('es-AR', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 8,
                      })}
                    </div>
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label className={styles.modalLabel}>PPC</label>
                    <div className={styles.modalCurrentValue}>
                      {CURRENCY_SYMBOL}
                      {calculatedAveragePPC.toLocaleString('es-AR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </div>

                <div className={styles.modalButtons}>
                  <button
                    type="button"
                    onClick={handleModalCancel}
                    className={styles.modalCancelBtn}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={styles.modalAcceptBtn}
                    disabled={calculatedTotalQuantity <= 0 || calculatedAveragePPC <= 0}
                  >
                    Guardar
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

      {/* Modal de noticias */}
      {showNewsModal &&
        createPortal(
          <div
            className={styles.modalOverlay}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeNewsModal();
              }
            }}
          >
            <div
              className={`${styles.modalContent} ${styles.newsModalContent}`}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  Noticias sobre {asset.name} ({asset.symbol})
                </h3>
                <button
                  type="button"
                  onClick={closeNewsModal}
                  className={styles.closeButton}
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>

              <div className={styles.newsContainer}>
                {isLoadingNews ? (
                  <div className={styles.newsLoading}>
                    Cargando noticias...
                  </div>
                ) : newsError ? (
                  <div className={styles.newsError}>
                    {newsError}
                  </div>
                ) : news.length > 0 ? (
                  <div className={styles.newsList}>
                    {news.map((article) => (
                      <div key={article.id} className={styles.newsItem}>
                        {article.image && (
                          <div className={styles.newsImage}>
                            <img src={article.image} alt={article.headline} onError={(e) => { e.target.style.display = 'none'; }} />
                          </div>
                        )}
                        <div className={styles.newsContent}>
                          <div className={styles.newsHeader}>
                            <span className={styles.newsSource}>{article.source}</span>
                            <span className={styles.newsDate}>
                              {article.datetime.toLocaleDateString('es-AR', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <h4 className={styles.newsHeadline}>{article.headline}</h4>
                          {article.summary && (
                            <p className={styles.newsSummary}>{article.summary}</p>
                          )}
                          {article.url && (
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.newsLink}
                            >
                              Leer más →
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.newsError}>
                    No se encontraron noticias para este activo.
                  </div>
                )}
              </div>

              <div className={styles.modalButtons}>
                <button
                  type="button"
                  onClick={closeNewsModal}
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
