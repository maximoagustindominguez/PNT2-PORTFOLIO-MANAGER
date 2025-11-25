import { useState, useEffect } from 'react';
import { useAssets } from '../hooks/useAssets';
import { Header } from '../components/Header/Header';
import { Summary } from '../components/Summary/Summary';
import { Dashboard as DashboardComponent } from '../components/Dashboard/Dashboard';
import { useAuth } from '../hooks/useAuth';
import { useFinnhubPrices } from '../hooks/useFinnhubPrices';
import { useAlertChecker } from '../hooks/useAlertChecker';
import { useAssetsStore } from '../store/assetsStore';
import { useAlertsStore } from '../store/alertsStore';
import { useSessionStore } from '../store/sessionStore';
import styles from './Dashboard.module.css';

export function Dashboard() {
  const {
    assets,
    addAssetQuantity,
    reduceAssetQuantity,
    resetAsset,
    deleteAsset,
    addNewAsset,
    updateAssetBrokers,
    totalValue,
    totalInvestment,
    totalProfit,
  } = useAssets();

  // Obtener estado de carga desde el store
  const isLoading = useAssetsStore((state) => state.isLoading);

  const { logOut } = useAuth();
  const user = useSessionStore((state) => state.user);
  const { loadAlerts } = useAlertsStore();

  // Actualizar precios automáticamente cada 2 minutos usando Finnhub
  useFinnhubPrices(true);

  // Verificar alertas periódicamente (cada 5 minutos)
  useAlertChecker(5);

  // Cargar alertas cuando el usuario inicia sesión
  useEffect(() => {
    if (user?.id) {
      loadAlerts(user.id);
    } else {
      useAlertsStore.getState().clearAlerts();
    }
  }, [user?.id, loadAlerts]);

  // Estado para controlar la apertura del modal desde el header
  const [triggerAddModal, setTriggerAddModal] = useState(0);

  // Asegurar que la página inicie en la parte superior al cargar
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Header 
        onLogout={logOut} 
        onAddAsset={() => setTriggerAddModal(prev => prev + 1)}
      />
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
        onUpdateBrokers={updateAssetBrokers}
        onOpenAddModal={triggerAddModal > 0 ? triggerAddModal : null}
        onModalClosed={() => setTriggerAddModal(0)}
      />
        </>
      )}
    </>
  );
}

