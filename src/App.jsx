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

  const resetAsset = (assetId) => {
    setAssets((prevAssets) =>
      prevAssets.map((asset) =>
        asset.id === assetId ? { ...asset, quantity: 0 } : asset
      )
    );
  };

  const deleteAsset = (assetId) => {
    setAssets((prevAssets) => prevAssets.filter((asset) => asset.id !== assetId));
  };

  const addNewAsset = (type, symbol, quantity) => {
    // Generar un nuevo ID (el máximo ID actual + 1)
    const maxId = assets.length > 0 ? Math.max(...assets.map((a) => a.id)) : 0;
    const newId = maxId + 1;

    // Por ahora, usar el symbol como name temporalmente
    // En el futuro se obtendrá del API basado en el ticker
    const newAsset = {
      id: newId,
      name: symbol, // Temporal: en el futuro se obtendrá del API
      symbol: symbol,
      type: type,
      quantity: parseFloat(quantity) || 0,
      purchasePrice: 0, // Se establecerá cuando se agregue cantidad
      currentPrice: 0, // Se obtendrá del API en el futuro
    };

    setAssets((prevAssets) => [...prevAssets, newAsset]);
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
        assets={assets}
      />
      <Dashboard
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

export default App;
