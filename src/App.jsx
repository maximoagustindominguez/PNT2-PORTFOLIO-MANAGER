import { useEffect, useState } from 'react';
import './App.css';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Header } from './components/Header/Header';
import { Summary } from './components/Summary/Summary';
import assetsData from './mock-data/assets.json';

function App() {
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    setAssets(assetsData);
  }, []);

  const addAssetQuantity = (assetId, quantityToAdd, purchasePrice) => {
    if (quantityToAdd <= 0 || purchasePrice <= 0) return;

    setAssets((prevAssets) =>
      prevAssets.map((asset) => {
        if (asset.id === assetId) {
          const currentQuantity = asset.quantity;
          const currentPurchasePrice = asset.purchasePrice;

          if (currentQuantity === 0) {
            return {
              ...asset,
              quantity: quantityToAdd,
              purchasePrice: purchasePrice,
            };
          }

          const totalCurrentValue = currentQuantity * currentPurchasePrice;
          const newQuantityValue = quantityToAdd * purchasePrice;
          const newTotalQuantity = currentQuantity + quantityToAdd;
          const newAveragePrice = (totalCurrentValue + newQuantityValue) / newTotalQuantity;

          return {
            ...asset,
            quantity: newTotalQuantity,
            purchasePrice: newAveragePrice,
          };
        }
        return asset;
      })
    );
  };

  const reduceAssetQuantity = (assetId, quantityToReduce) => {
    setAssets((prevAssets) =>
      prevAssets.map((asset) => {
        if (asset.id === assetId) {
          const newQuantity = Math.max(0, asset.quantity - quantityToReduce);
          return { ...asset, quantity: newQuantity };
        }
        return asset;
      })
    );
  };

  const updateCurrentPrice = (assetId, newPrice) => {
    setAssets((prevAssets) =>
      prevAssets.map((asset) =>
        asset.id === assetId ? { ...asset, currentPrice: newPrice } : asset
      )
    );
  };

  const calculateTotalValue = () => {
    return assets.reduce((total, asset) => {
      return total + asset.quantity * asset.currentPrice;
    }, 0);
  };

  const calculateTotalInvestment = () => {
    return assets.reduce((total, asset) => {
      return total + asset.quantity * asset.purchasePrice;
    }, 0);
  };

  const calculateTotalProfit = () => {
    return calculateTotalValue() - calculateTotalInvestment();
  };

  const totalValue = calculateTotalValue();
  const totalInvestment = calculateTotalInvestment();
  const totalProfit = calculateTotalProfit();

  return (
    <>
      <Header />
      <Summary
        totalValue={totalValue}
        totalInvestment={totalInvestment}
        totalProfit={totalProfit}
      />
      <Dashboard
        assets={assets}
        onAddQuantity={addAssetQuantity}
        onReduceQuantity={reduceAssetQuantity}
        onUpdateCurrentPrice={updateCurrentPrice}
      />
    </>
  );
}

export default App;
