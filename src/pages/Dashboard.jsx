import { useAssets } from '../hooks/useAssets';
import { Header } from '../components/Header/Header';
import { Summary } from '../components/Summary/Summary';
import { Dashboard as DashboardComponent } from '../components/Dashboard/Dashboard';
import { useAuth } from '../hooks/useAuth';
import styles from './Dashboard.module.css';

export function Dashboard() {
  const {
    assets,
    addAssetQuantity,
    reduceAssetQuantity,
    updateCurrentPrice,
    resetAsset,
    deleteAsset,
    addNewAsset,
    totalValue,
    totalInvestment,
    totalProfit,
  } = useAssets();

  const { logOut } = useAuth();

  return (
    <>
      <Header onLogout={logOut} />
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
        onUpdateCurrentPrice={updateCurrentPrice}
        onResetAsset={resetAsset}
        onDeleteAsset={deleteAsset}
        onAddNewAsset={addNewAsset}
      />
    </>
  );
}

