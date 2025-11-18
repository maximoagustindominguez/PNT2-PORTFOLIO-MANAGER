import { useAssets } from '../hooks/useAssets';
import { Header } from '../components/Header/Header';
import { Summary } from '../components/Summary/Summary';
import { Dashboard as DashboardComponent } from '../components/Dashboard/Dashboard';
import { useAuth } from '../hooks/useAuth';
import { useFinnhubPrices } from '../hooks/useFinnhubPrices';
import { useAssetsStore } from '../store/assetsStore';
import styles from './Dashboard.module.css';

export function Dashboard() {
  const {
    assets,
    addAssetQuantity,
    reduceAssetQuantity,
    resetAsset,
    deleteAsset,
    addNewAsset,
    totalValue,
    totalInvestment,
    totalProfit,
  } = useAssets();

  // Obtener estado de carga desde el store
  const isLoading = useAssetsStore((state) => state.isLoading);

  const { logOut } = useAuth();

  // Actualizar precios automáticamente cada 2 minutos usando Finnhub
  useFinnhubPrices(true);

  return (
    <>
      <Header onLogout={logOut} />
      {isLoading ? (
        <div className={styles.loadingContainer}>
          <p>Cargando activos...</p>
        </div>
      ) : (
        <>
          <Summary
            totalValue={totalValue}
            totalInvestment={totalInvestment}
            totalProfit={totalProfit}
            assets={assets}
          />
          <DashboardComponent
            assets={assets}
            onAddQuantity={addAssetQuantity}
            onReduceQuantity={reduceAssetQuantity}
            onResetAsset={resetAsset}
            onDeleteAsset={deleteAsset}
            onAddNewAsset={addNewAsset}
          />
        </>
      )}
    </>
  );
}

