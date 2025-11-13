import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AssetCard } from '../AssetCard/AssetCard';
import { AssetTable } from '../AssetTable/AssetTable';
import { useModal } from '../../hooks/useModal';
import styles from './Dashboard.module.css';

export const Dashboard = ({ assets, onAddQuantity, onReduceQuantity, onUpdateCurrentPrice, onResetAsset, onDeleteAsset, onAddNewAsset }) => {
  const [viewMode, setViewMode] = useState('cards');
  const { isOpen: showAddModal, openModal: openAddModal, closeModal: closeAddModal } = useModal(false);
  const [newAssetType, setNewAssetType] = useState('accion');
  const [newAssetSymbol, setNewAssetSymbol] = useState('');
  const [newAssetQuantity, setNewAssetQuantity] = useState('');

  return (
    <div className={styles.dashboard}>
      <div className={styles.controls}>
        <button
          type="button"
          onClick={() => setViewMode('cards')}
          className={viewMode === 'cards' ? styles.active : ''}
        >
          Activos en Cartera
        </button>
        <button
          type="button"
          onClick={() => setViewMode('table')}
          className={viewMode === 'table' ? styles.active : ''}
        >
          Posición Consolidada
        </button>
      </div>

      {viewMode === 'cards' ? (
        <>
          <div className={styles.cardsContainer}>
            {assets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onAddQuantity={onAddQuantity}
                onReduceQuantity={onReduceQuantity}
                onUpdateCurrentPrice={onUpdateCurrentPrice}
                onResetAsset={onResetAsset}
                onDeleteAsset={onDeleteAsset}
              />
            ))}
            <button
              type="button"
              className={styles.addCardButton}
              onClick={openAddModal}
              aria-label="Agregar nuevo activo"
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 5V19M5 12H19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </>
      ) : (
        <AssetTable assets={assets} />
      )}

      {showAddModal &&
        createPortal(
          <div
            className={styles.modalOverlay}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeAddModal();
                setNewAssetType('accion');
                setNewAssetSymbol('');
                setNewAssetQuantity('');
              }
            }}
          >
            <div
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className={styles.modalTitle}>Agregar nuevo activo</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newAssetSymbol.trim() && newAssetQuantity) {
                    onAddNewAsset(newAssetType, newAssetSymbol.trim(), newAssetQuantity);
                    closeAddModal();
                    setNewAssetType('accion');
                    setNewAssetSymbol('');
                    setNewAssetQuantity('');
                  }
                }}
                className={styles.modalForm}
              >
                <div className={styles.modalFormGroup}>
                  <label className={styles.modalLabel}>Tipo</label>
                  <select
                    value={newAssetType}
                    onChange={(e) => setNewAssetType(e.target.value)}
                    className={styles.modalInput}
                    required
                  >
                    <option value="accion">Acción</option>
                    <option value="criptomoneda">Criptomoneda</option>
                    <option value="fondo">Fondo</option>
                    <option value="bond">Bond</option>
                  </select>
                </div>
                <div className={styles.modalFormGroup}>
                  <label className={styles.modalLabel}>Ticker</label>
                  <input
                    type="text"
                    value={newAssetSymbol}
                    onChange={(e) => setNewAssetSymbol(e.target.value.toUpperCase())}
                    className={styles.modalInput}
                    placeholder="Ej: AAPL, BTC, SPY"
                    required
                    maxLength={10}
                  />
                </div>
                <div className={styles.modalFormGroup}>
                  <label className={styles.modalLabel}>Cantidad</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newAssetQuantity}
                    onChange={(e) => setNewAssetQuantity(e.target.value)}
                    className={styles.modalInput}
                    placeholder="0"
                    required
                  />
                </div>
                <div className={styles.modalButtons}>
                  <button
                    type="button"
                    onClick={() => {
                      closeAddModal();
                      setNewAssetType('accion');
                      setNewAssetSymbol('');
                      setNewAssetQuantity('');
                    }}
                    className={styles.modalCancelBtn}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={styles.modalAcceptBtn}
                    disabled={!newAssetSymbol.trim() || !newAssetQuantity}
                  >
                    Agregar
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
