import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CURRENCY_SYMBOL } from '../../constants';
import styles from './AssetCard.module.css';

export const AssetCard = ({ asset, onAddQuantity, onReduceQuantity, onUpdateCurrentPrice, onResetAsset, onDeleteAsset }) => {
  const [showModal, setShowModal] = useState(false);
  const [modalQuantityChange, setModalQuantityChange] = useState('0');
  const [modalPrice, setModalPrice] = useState(asset.purchasePrice.toString());
  const [editCurrentPrice, setEditCurrentPrice] = useState(false);
  const [newCurrentPrice, setNewCurrentPrice] = useState(asset.currentPrice.toString());
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'reset' o 'delete'

  useEffect(() => {
    if (!editCurrentPrice) {
      setNewCurrentPrice(asset.currentPrice.toString());
    }
  }, [asset.currentPrice, editCurrentPrice]);

  const totalValue = asset.quantity * asset.currentPrice;
  const totalInvestment = asset.quantity * asset.purchasePrice;
  const profit = totalValue - totalInvestment;
  const profitPercentage = totalInvestment > 0 ? ((profit / totalInvestment) * 100).toFixed(2) : 0;
  const isProfit = profit >= 0;

  const getTypeLabel = (type) => {
    const types = {
      accion: 'Acción',
      criptomoneda: 'Cripto',
      fondo: 'Fondo',
      bond: 'Bond',
    };
    return types[type] || type;
  };

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

    setShowModal(false);
  };

  const handleModalCancel = () => {
    setModalQuantityChange('0');
    setModalPrice(asset.purchasePrice.toString());
    setShowModal(false);
  };

  const handleOpenModal = () => {
    setModalQuantityChange('0');
    setModalPrice(asset.purchasePrice.toString());
    setShowModal(true);
  };

  const handleIncrementQuantity = () => {
    const current = parseFloat(modalQuantityChange) || 0;
    setModalQuantityChange((current + 1).toString());
  };

  const handleDecrementQuantity = () => {
    const current = parseFloat(modalQuantityChange) || 0;
    const newValue = Math.max(-asset.quantity, current - 1);
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

  const handleUpdateCurrentPrice = (e) => {
    e.preventDefault();
    const price = parseFloat(newCurrentPrice);

    if (price > 0) {
      onUpdateCurrentPrice(asset.id, price);
      setEditCurrentPrice(false);
    }
  };

  const handleResetAsset = () => {
    setConfirmAction('reset');
    setShowConfirmModal(true);
    setShowMenu(false);
  };

  const handleDeleteAsset = () => {
    setConfirmAction('delete');
    setShowConfirmModal(true);
    setShowMenu(false);
  };

  const handleConfirmAction = () => {
    if (confirmAction === 'reset') {
      onResetAsset(asset.id);
    } else if (confirmAction === 'delete') {
      onDeleteAsset(asset.id);
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
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

  // Deshabilitar scroll y grisar el fondo cuando el modal está abierto
  useEffect(() => {
    if (showModal || showConfirmModal) {
      // Prevenir scroll del body
      document.body.style.overflow = 'hidden';
      // Agregar clase al body para grisar el contenido
      document.body.classList.add('modal-open');
    } else {
      // Restaurar scroll
      document.body.style.overflow = '';
      // Remover clase
      document.body.classList.remove('modal-open');
    }

    // Cleanup
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [showModal, showConfirmModal]);


  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.nameSection}>
          <h3 className={styles.name}>{asset.name}</h3>
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
          {editCurrentPrice ? (
            <form onSubmit={handleUpdateCurrentPrice} className={styles.priceForm}>
              <input
                type="number"
                step="0.01"
                value={newCurrentPrice}
                onChange={(e) => setNewCurrentPrice(e.target.value)}
                className={styles.priceInput}
              />
              <button type="submit" className={styles.saveBtn}>
                ✓
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditCurrentPrice(false);
                  setNewCurrentPrice(asset.currentPrice.toString());
                }}
                className={styles.cancelBtn}
              >
                ✕
              </button>
            </form>
          ) : (
            <div className={styles.priceControls}>
              <span className={styles.value}>
                {CURRENCY_SYMBOL}
                {asset.currentPrice.toLocaleString('es-AR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <button
                type="button"
                className={styles.editBtn}
                onClick={() => setEditCurrentPrice(true)}
              >
                Editar
              </button>
            </div>
          )}
        </div>

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
          className={styles.actionButton}
          onClick={handleOpenModal}
        >
          Modificar cantidad del activo
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
                      step="1"
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
