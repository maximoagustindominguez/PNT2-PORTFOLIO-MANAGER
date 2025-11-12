import { useEffect, useState } from 'react';
import { CURRENCY_SYMBOL } from '../../constants';
import styles from './AssetCard.module.css';

export const AssetCard = ({ asset, onAddQuantity, onReduceQuantity, onUpdateCurrentPrice }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [addQuantity, setAddQuantity] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [reduceQuantity, setReduceQuantity] = useState('');
  const [editCurrentPrice, setEditCurrentPrice] = useState(false);
  const [newCurrentPrice, setNewCurrentPrice] = useState(asset.currentPrice.toString());

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
    };
    return types[type] || type;
  };

  const handleAddQuantity = (e) => {
    e.preventDefault();
    const quantity = parseFloat(addQuantity);
    const price = parseFloat(addPrice);

    if (quantity > 0 && price > 0) {
      onAddQuantity(asset.id, quantity, price);
      setAddQuantity('');
      setAddPrice('');
      setShowAddForm(false);
    }
  };

  const handleReduceQuantity = (e) => {
    e.preventDefault();
    const quantity = parseFloat(reduceQuantity);

    if (quantity > 0) {
      onReduceQuantity(asset.id, quantity);
      setReduceQuantity('');
    }
  };

  const handleUpdateCurrentPrice = (e) => {
    e.preventDefault();
    const price = parseFloat(newCurrentPrice);

    if (price > 0) {
      onUpdateCurrentPrice(asset.id, price);
      setEditCurrentPrice(false);
    }
  };

  const handleQuickReduce = (amount) => {
    onReduceQuantity(asset.id, amount);
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.nameSection}>
          <h3 className={styles.name}>{asset.name}</h3>
          <span className={styles.symbol}>{asset.symbol}</span>
        </div>
        <span className={styles.type}>{getTypeLabel(asset.type)}</span>
      </div>

      <div className={styles.content}>
        <div className={styles.row}>
          <span className={styles.label}>Cantidad</span>
          <div className={styles.quantityControls}>
            <span className={styles.value}>{asset.quantity}</span>
            <div className={styles.quickButtons}>
              <button
                type="button"
                className={styles.quickBtn}
                onClick={() => handleQuickReduce(1)}
                disabled={asset.quantity === 0}
              >
                -1
              </button>
              <button
                type="button"
                className={styles.quickBtn}
                onClick={() => handleQuickReduce(asset.quantity)}
                disabled={asset.quantity === 0}
              >
                Reset
              </button>
            </div>
          </div>
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
        {!showAddForm ? (
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => setShowAddForm(true)}
          >
            Agregar Cantidad
          </button>
        ) : (
          <form onSubmit={handleAddQuantity} className={styles.addForm}>
            <div className={styles.formRow}>
              <input
                type="number"
                step="0.01"
                placeholder="Cantidad"
                value={addQuantity}
                onChange={(e) => setAddQuantity(e.target.value)}
                className={styles.formInput}
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Precio compra"
                value={addPrice}
                onChange={(e) => setAddPrice(e.target.value)}
                className={styles.formInput}
                required
              />
            </div>
            <div className={styles.formButtons}>
              <button type="submit" className={styles.submitBtn}>
                Agregar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setAddQuantity('');
                  setAddPrice('');
                }}
                className={styles.cancelBtn}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        <form onSubmit={handleReduceQuantity} className={styles.reduceForm}>
          <div className={styles.formRow}>
            <input
              type="number"
              step="0.01"
              placeholder="Cantidad a reducir"
              value={reduceQuantity}
              onChange={(e) => setReduceQuantity(e.target.value)}
              className={styles.formInput}
              max={asset.quantity}
            />
            <button
              type="submit"
              className={styles.reduceBtn}
              disabled={
                !reduceQuantity ||
                parseFloat(reduceQuantity) <= 0 ||
                parseFloat(reduceQuantity) > asset.quantity
              }
            >
              Reducir
            </button>
          </div>
        </form>
      </div>

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
