/**
 * HOOK PERSONALIZADO: useAssets
 * 
 * Este hook es un "wrapper" (envoltorio) alrededor del store de activos.
 * Su propósito es:
 * 1. Exponer las funciones del store de forma más conveniente
 * 2. Calcular valores totales de forma reactiva (se actualizan automáticamente)
 * 3. Simplificar el uso en los componentes
 * 
 * ¿Qué es un hook personalizado?
 * Un hook es una función que empieza con "use" y puede usar otros hooks de React.
 * Los hooks personalizados nos permiten reutilizar lógica entre componentes.
 * 
 * ¿Por qué calcular totales aquí en lugar del store?
 * - useMemo asegura que los cálculos solo se hagan cuando cambian los assets
 * - Es más eficiente que calcular en cada render
 * - Los componentes se suscriben automáticamente a estos valores
 */

import { useMemo } from 'react';
import { useAssetsStore } from '../store/assetsStore';

/**
 * Hook que proporciona acceso a los activos y funciones para gestionarlos
 * @returns {Object} Objeto con assets, funciones de gestión y totales calculados
 */
export const useAssets = () => {
  // ============================================
  // OBTENER ESTADO Y FUNCIONES DEL STORE
  // ============================================
  // useAssetsStore es un hook de Zustand que nos permite acceder al store
  // Pasamos una función selector que extrae solo lo que necesitamos
  // Esto hace que el componente se "suscriba" a cambios en estos valores
  
  const assets = useAssetsStore((state) => state.assets);
  const addAssetQuantity = useAssetsStore((state) => state.addAssetQuantity);
  const reduceAssetQuantity = useAssetsStore((state) => state.reduceAssetQuantity);
  const updateCurrentPrice = useAssetsStore((state) => state.updateCurrentPrice);
  const resetAsset = useAssetsStore((state) => state.resetAsset);
  const deleteAsset = useAssetsStore((state) => state.deleteAsset);
  const addNewAsset = useAssetsStore((state) => state.addNewAsset);
  const updateAssetBrokers = useAssetsStore((state) => state.updateAssetBrokers);

  // ============================================
  // CALCULAR TOTALES DE FORMA REACTIVA
  // ============================================
  // useMemo memoriza el resultado del cálculo
  // Solo recalcula cuando cambian los assets (dependencia en el array)
  // Esto es más eficiente que calcular en cada render del componente
  
  /**
   * Valor total de la cartera (cantidad * precio actual de cada activo)
   * Se recalcula automáticamente cuando cambian los assets
   */
  const totalValue = useMemo(() => {
    return assets.reduce((total, asset) => {
      return total + asset.quantity * asset.currentPrice;
    }, 0);
  }, [assets]); // Solo recalcula si cambia el array de assets

  /**
   * Inversión total (cantidad * precio promedio de compra de cada activo)
   * Se recalcula automáticamente cuando cambian los assets
   */
  const totalInvestment = useMemo(() => {
    return assets.reduce((total, asset) => {
      return total + asset.quantity * asset.purchasePrice;
    }, 0);
  }, [assets]);

  /**
   * Ganancia/pérdida total (valor total - inversión total)
   * Se recalcula automáticamente cuando cambian totalValue o totalInvestment
   */
  const totalProfit = useMemo(() => {
    return totalValue - totalInvestment;
  }, [totalValue, totalInvestment]);

  // ============================================
  // RETORNAR TODO LO QUE LOS COMPONENTES NECESITAN
  // ============================================
  // Los componentes que usen este hook recibirán:
  // - El array de assets
  // - Todas las funciones para modificar assets
  // - Los totales calculados (que se actualizan automáticamente)
  
  return {
    assets,
    addAssetQuantity,
    reduceAssetQuantity,
    updateCurrentPrice,
    resetAsset,
    deleteAsset,
    addNewAsset,
    updateAssetBrokers,
    totalValue,
    totalInvestment,
    totalProfit,
  };
};



