/**
 * STORE DE ACTIVOS (ZUSTAND)
 * 
 * Este archivo crea un store para manejar todos los activos financieros del usuario.
 * Un "activo" es cualquier inversión: acciones, criptomonedas, fondos, bonos, etc.
 * 
 * ¿Qué información tiene cada activo?
 * - id: Identificador único
 * - name: Nombre del activo (ej: "Apple Inc.")
 * - symbol: Símbolo de cotización (ej: "AAPL")
 * - type: Tipo de activo ("accion", "criptomoneda", "fondo", "bond")
 * - quantity: Cantidad que posee el usuario
 * - purchasePrice: Precio promedio de compra (PPC)
 * - currentPrice: Precio actual del mercado (se actualiza automáticamente)
 * 
 * ¿Qué operaciones podemos hacer?
 * - Agregar cantidad a un activo (comprar más)
 * - Reducir cantidad de un activo (vender)
 * - Actualizar precio actual (automático desde Finnhub)
 * - Resetear un activo a cantidad 0
 * - Eliminar un activo completamente
 * - Agregar un nuevo activo
 * - Calcular totales (valor total, inversión total, ganancia/pérdida)
 */

import { create } from 'zustand';
// Importar datos iniciales desde un archivo JSON (datos de prueba)
import assetsData from '../mock-data/assets.json';

/**
 * Store de activos con todas las funciones para gestionarlos
 */
export const useAssetsStore = create((set) => ({
  // Estado inicial: array de activos cargado desde el archivo JSON
  assets: assetsData,
  
  // Función para establecer todos los activos de una vez (útil para cargar desde servidor)
  setAssets: (assets) => set({ assets }),
  
  /**
   * AGREGAR CANTIDAD A UN ACTIVO
   * 
   * Esta función se usa cuando el usuario compra más de un activo que ya tiene.
   * Calcula automáticamente el nuevo precio promedio de compra (PPC).
   * 
   * Ejemplo:
   * - Tienes 10 acciones de AAPL compradas a $150 cada una (PPC = $150)
   * - Compras 5 más a $160 cada una
   * - La función calcula: nuevo PPC = (10*150 + 5*160) / 15 = $153.33
   * 
   * @param {string} assetId - ID del activo a modificar
   * @param {number} quantityToAdd - Cantidad a agregar (debe ser > 0)
   * @param {number} purchasePrice - Precio al que se compró esta nueva cantidad
   */
  addAssetQuantity: (assetId, quantityToAdd, purchasePrice) => {
    // Validación: no permitir cantidades o precios negativos o cero
    if (quantityToAdd <= 0 || purchasePrice <= 0) return;
    
    // set() es la función de Zustand para actualizar el estado
    // Recibe una función que recibe el estado actual y devuelve el nuevo estado
    set((state) => ({
      // map() recorre todos los activos y devuelve un nuevo array
      assets: state.assets.map((asset) => {
        // Si encontramos el activo que queremos modificar
        if (asset.id === assetId) {
          const currentQuantity = asset.quantity;
          const currentPurchasePrice = asset.purchasePrice;
          
          // Si la cantidad actual es 0, simplemente establecemos los nuevos valores
          // (no hay que calcular promedio porque no hay compras previas)
          if (currentQuantity === 0) {
            return {
              ...asset, // Mantener todas las propiedades del activo
              quantity: quantityToAdd,
              purchasePrice: purchasePrice,
            };
          }
          
          // Calcular el nuevo precio promedio de compra (PPC)
          // Fórmula: (cantidad_actual * PPC_actual + cantidad_nueva * precio_nuevo) / cantidad_total
          const totalCurrentValue = currentQuantity * currentPurchasePrice;
          const newQuantityValue = quantityToAdd * purchasePrice;
          const newTotalQuantity = currentQuantity + quantityToAdd;
          const newAveragePrice = (totalCurrentValue + newQuantityValue) / newTotalQuantity;
          
          // Devolver el activo actualizado con la nueva cantidad y PPC
          return {
            ...asset,
            quantity: newTotalQuantity,
            purchasePrice: newAveragePrice,
          };
        }
        // Si no es el activo que buscamos, devolverlo sin cambios
        return asset;
      }),
    }));
  },
  
  /**
   * REDUCIR CANTIDAD DE UN ACTIVO
   * 
   * Se usa cuando el usuario vende parte de un activo.
   * No modifica el precio promedio de compra (PPC) porque la venta
   * no afecta el precio al que compró originalmente.
   * 
   * @param {string} assetId - ID del activo a modificar
   * @param {number} quantityToReduce - Cantidad a reducir (debe ser > 0)
   */
  reduceAssetQuantity: (assetId, quantityToReduce) => {
    set((state) => ({
      assets: state.assets.map((asset) => {
        if (asset.id === assetId) {
          // Math.max(0, ...) asegura que la cantidad nunca sea negativa
          const newQuantity = Math.max(0, asset.quantity - quantityToReduce);
          return { ...asset, quantity: newQuantity };
        }
        return asset;
      }),
    }));
  },
  
  /**
   * ACTUALIZAR PRECIO ACTUAL DE UN ACTIVO
   * 
   * Esta función se llama automáticamente desde el hook useFinnhubPrices
   * cada 2 minutos para actualizar los precios desde la API de Finnhub.
   * 
   * @param {string} assetId - ID del activo a actualizar
   * @param {number} newPrice - Nuevo precio actual del mercado
   */
  updateCurrentPrice: (assetId, newPrice) => {
    set((state) => ({
      // Buscar el activo por ID y actualizar solo su currentPrice
      assets: state.assets.map((asset) =>
        asset.id === assetId ? { ...asset, currentPrice: newPrice } : asset
      ),
    }));
  },
  
  /**
   * RESETEAR UN ACTIVO
   * 
   * Establece la cantidad de un activo a 0, pero no lo elimina.
   * Útil para "limpiar" un activo sin perder su configuración.
   * 
   * @param {string} assetId - ID del activo a resetear
   */
  resetAsset: (assetId) => {
    set((state) => ({
      assets: state.assets.map((asset) =>
        asset.id === assetId ? { ...asset, quantity: 0 } : asset
      ),
    }));
  },
  
  /**
   * ELIMINAR UN ACTIVO
   * 
   * Elimina completamente un activo del array.
   * Usa filter() para crear un nuevo array sin el activo eliminado.
   * 
   * @param {string} assetId - ID del activo a eliminar
   */
  deleteAsset: (assetId) => {
    set((state) => ({
      // filter() devuelve solo los activos cuyo ID NO coincide con assetId
      assets: state.assets.filter((asset) => asset.id !== assetId),
    }));
  },
  
  /**
   * AGREGAR UN NUEVO ACTIVO
   * 
   * Crea un nuevo activo y lo agrega al array.
   * Genera automáticamente un nuevo ID único (el máximo ID + 1).
   * 
   * @param {string} type - Tipo de activo ("accion", "criptomoneda", "fondo", "bond")
   * @param {string} symbol - Símbolo de cotización (ej: "AAPL", "BTC")
   * @param {number} quantity - Cantidad inicial (puede ser 0)
   */
  addNewAsset: (type, symbol, quantity) => {
    set((state) => {
      // Calcular el siguiente ID disponible
      // Si hay activos, encontrar el máximo ID y sumar 1
      // Si no hay activos, empezar con ID 1
      const maxId = state.assets.length > 0 
        ? Math.max(...state.assets.map((a) => a.id)) 
        : 0;
      const newId = maxId + 1;
      
      // Crear el nuevo objeto de activo
      const newAsset = {
        id: newId,
        name: symbol, // Por ahora, el nombre es igual al símbolo
        symbol: symbol,
        type: type,
        quantity: parseFloat(quantity) || 0, // Convertir a número, o 0 si falla
        purchasePrice: 0, // Se establecerá cuando el usuario agregue cantidad
        currentPrice: 0, // Se actualizará automáticamente desde Finnhub
      };
      
      // Agregar el nuevo activo al final del array usando spread operator
      return {
        assets: [...state.assets, newAsset],
      };
    });
  },
  
  /**
   * CALCULAR VALOR TOTAL DE LA CARTERA
   * 
   * Suma el valor actual de todos los activos.
   * Fórmula: cantidad * precio_actual para cada activo
   * 
   * @returns {number} Valor total de la cartera en el mercado actual
   */
  calculateTotalValue: () => {
    // getState() obtiene el estado actual del store sin suscribirse
    const state = useAssetsStore.getState();
    // reduce() suma todos los valores
    return state.assets.reduce((total, asset) => {
      return total + asset.quantity * asset.currentPrice;
    }, 0); // 0 es el valor inicial del acumulador
  },
  
  /**
   * CALCULAR INVERSIÓN TOTAL
   * 
   * Suma cuánto dinero invirtió el usuario en total.
   * Fórmula: cantidad * precio_promedio_compra para cada activo
   * 
   * @returns {number} Total de dinero invertido
   */
  calculateTotalInvestment: () => {
    const state = useAssetsStore.getState();
    return state.assets.reduce((total, asset) => {
      return total + asset.quantity * asset.purchasePrice;
    }, 0);
  },
  
  /**
   * CALCULAR GANANCIA/PÉRDIDA TOTAL
   * 
   * Calcula la diferencia entre el valor actual y la inversión total.
   * Si es positivo = ganancia, si es negativo = pérdida
   * 
   * @returns {number} Ganancia (positivo) o pérdida (negativo)
   */
  calculateTotalProfit: () => {
    const state = useAssetsStore.getState();
    const totalValue = state.calculateTotalValue();
    const totalInvestment = state.calculateTotalInvestment();
    return totalValue - totalInvestment;
  },
}));

