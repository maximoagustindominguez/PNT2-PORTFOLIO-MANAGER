import { useState } from 'react';
import { AssetCard } from '../AssetCard/AssetCard';
import { AssetTable } from '../AssetTable/AssetTable';
import styles from './Dashboard.module.css';

export const Dashboard = ({ assets, onAddQuantity, onReduceQuantity, onUpdateCurrentPrice, onResetAsset, onDeleteAsset }) => {
  const [viewMode, setViewMode] = useState('cards');

  return (
    <div className={styles.dashboard}>
      <div className={styles.controls}>
        <button
          type="button"
          onClick={() => setViewMode('cards')}
          className={viewMode === 'cards' ? styles.active : ''}
        >
          Cards
        </button>
        <button
          type="button"
          onClick={() => setViewMode('table')}
          className={viewMode === 'table' ? styles.active : ''}
        >
          Tabla
        </button>
      </div>

      {viewMode === 'cards' ? (
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
        </div>
      ) : (
        <AssetTable assets={assets} />
      )}
    </div>
  );
};
