import { create } from 'zustand';
import assetsData from '../mock-data/assets.json';

export const useAssetsStore = create((set) => ({
  assets: assetsData,
  
  setAssets: (assets) => set({ assets }),
  
  addAssetQuantity: (assetId, quantityToAdd, purchasePrice) => {
    if (quantityToAdd <= 0 || purchasePrice <= 0) return;
    
    set((state) => ({
      assets: state.assets.map((asset) => {
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
      }),
    }));
  },
  
  reduceAssetQuantity: (assetId, quantityToReduce) => {
    set((state) => ({
      assets: state.assets.map((asset) => {
        if (asset.id === assetId) {
          const newQuantity = Math.max(0, asset.quantity - quantityToReduce);
          return { ...asset, quantity: newQuantity };
        }
        return asset;
      }),
    }));
  },
  
  updateCurrentPrice: (assetId, newPrice) => {
    set((state) => ({
      assets: state.assets.map((asset) =>
        asset.id === assetId ? { ...asset, currentPrice: newPrice } : asset
      ),
    }));
  },
  
  resetAsset: (assetId) => {
    set((state) => ({
      assets: state.assets.map((asset) =>
        asset.id === assetId ? { ...asset, quantity: 0 } : asset
      ),
    }));
  },
  
  deleteAsset: (assetId) => {
    set((state) => ({
      assets: state.assets.filter((asset) => asset.id !== assetId),
    }));
  },
  
  addNewAsset: (type, symbol, quantity) => {
    set((state) => {
      const maxId = state.assets.length > 0 
        ? Math.max(...state.assets.map((a) => a.id)) 
        : 0;
      const newId = maxId + 1;
      
      const newAsset = {
        id: newId,
        name: symbol,
        symbol: symbol,
        type: type,
        quantity: parseFloat(quantity) || 0,
        purchasePrice: 0,
        currentPrice: 0,
      };
      
      return {
        assets: [...state.assets, newAsset],
      };
    });
  },
  
  calculateTotalValue: () => {
    const state = useAssetsStore.getState();
    return state.assets.reduce((total, asset) => {
      return total + asset.quantity * asset.currentPrice;
    }, 0);
  },
  
  calculateTotalInvestment: () => {
    const state = useAssetsStore.getState();
    return state.assets.reduce((total, asset) => {
      return total + asset.quantity * asset.purchasePrice;
    }, 0);
  },
  
  calculateTotalProfit: () => {
    const state = useAssetsStore.getState();
    const totalValue = state.calculateTotalValue();
    const totalInvestment = state.calculateTotalInvestment();
    return totalValue - totalInvestment;
  },
}));

