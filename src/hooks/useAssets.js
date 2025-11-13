import { useAssetsStore } from '../store/assetsStore';

export const useAssets = () => {
  const assets = useAssetsStore((state) => state.assets);
  const addAssetQuantity = useAssetsStore((state) => state.addAssetQuantity);
  const reduceAssetQuantity = useAssetsStore((state) => state.reduceAssetQuantity);
  const updateCurrentPrice = useAssetsStore((state) => state.updateCurrentPrice);
  const resetAsset = useAssetsStore((state) => state.resetAsset);
  const deleteAsset = useAssetsStore((state) => state.deleteAsset);
  const addNewAsset = useAssetsStore((state) => state.addNewAsset);
  const calculateTotalValue = useAssetsStore((state) => state.calculateTotalValue);
  const calculateTotalInvestment = useAssetsStore((state) => state.calculateTotalInvestment);
  const calculateTotalProfit = useAssetsStore((state) => state.calculateTotalProfit);

  const totalValue = calculateTotalValue();
  const totalInvestment = calculateTotalInvestment();
  const totalProfit = calculateTotalProfit();

  return {
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
  };
};

