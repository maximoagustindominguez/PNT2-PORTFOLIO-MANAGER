import { useState } from 'react'
import styles from './Dashboard.module.css'
import { AssetCard } from '../AssetCard/AssetCard'
import { AssetTable } from '../AssetTable/AssetTable'

export const Dashboard = ({ 
  assets, 
  onUpdateQuantity, 
  onAddQuantity, 
  onReduceQuantity, 
  onUpdateCurrentPrice 
}) => {
  const [viewMode, setViewMode] = useState('cards')

  return (
    <div className={styles.dashboard}>
      <div className={styles.controls}>
        <button
          onClick={() => setViewMode('cards')}
          className={viewMode === 'cards' ? styles.active : ''}
        >
          Cards
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={viewMode === 'table' ? styles.active : ''}
        >
          Tabla
        </button>
      </div>
      
      {viewMode === 'cards' ? (
        <div className={styles.cardsContainer}>
          {assets.map(asset => (
            <AssetCard 
              key={asset.id} 
              asset={asset}
              onUpdateQuantity={onUpdateQuantity}
              onAddQuantity={onAddQuantity}
              onReduceQuantity={onReduceQuantity}
              onUpdateCurrentPrice={onUpdateCurrentPrice}
            />
          ))}
        </div>
      ) : (
        <AssetTable 
          assets={assets}
          onUpdateQuantity={onUpdateQuantity}
          onAddQuantity={onAddQuantity}
          onReduceQuantity={onReduceQuantity}
          onUpdateCurrentPrice={onUpdateCurrentPrice}
        />
      )}
    </div>
  )
}

