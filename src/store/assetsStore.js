/**
 * STORE DE ACTIVOS (ZUSTAND)
 * 
 * Este archivo crea un store para manejar todos los activos financieros del usuario.
 * Un "activo" es cualquier inversión: acciones, criptomonedas, fondos, bonos, etc.
 * 
 * IMPORTANTE: Los activos se guardan en Supabase (base de datos en la nube).
 * Cada usuario tiene sus propios activos asociados a su ID de usuario.
 * 
 * ¿Qué información tiene cada activo?
 * - id: Identificador único (generado por Supabase)
 * - name: Nombre del activo (ej: "Apple Inc.")
 * - symbol: Símbolo de cotización (ej: "AAPL")
 * - type: Tipo de activo ("stock", "crypto", "etf", "bond")
 * - quantity: Cantidad que posee el usuario
 * - purchasePrice: Precio promedio de compra (PPC)
 * - currentPrice: Precio actual del mercado (se actualiza automáticamente)
 * - brokers: Array de objetos {broker, quantity, purchasePrice}
 * 
 * ¿Qué operaciones podemos hacer?
 * - Cargar activos desde Supabase cuando el usuario inicia sesión
 * - Agregar cantidad a un activo (comprar más)
 * - Reducir cantidad de un activo (vender)
 * - Actualizar precio actual (automático desde Finnhub)
 * - Resetear un activo a cantidad 0
 * - Eliminar un activo completamente
 * - Agregar un nuevo activo
 * - Calcular totales (valor total, inversión total, ganancia/pérdida)
 */

import { create } from 'zustand';
// Importar servicio de Supabase para operaciones de base de datos
import {
  loadAssetsFromSupabase,
  saveAssetToSupabase,
  updateAssetInSupabase,
  deleteAssetFromSupabase,
  syncAllAssetsToSupabase,
} from '../lib/assetsService';
// Importar datos iniciales desde un archivo JSON (solo como fallback si no hay usuario)
import assetsData from '../mock-data/assets.json';

/**
 * Store de activos con todas las funciones para gestionarlos
 * 
 * IMPORTANTE: Los activos se guardan automáticamente en Supabase
 * cada vez que se modifica el array. Esto permite que los datos persistan
 * en la nube y estén disponibles desde cualquier dispositivo.
 */
export const useAssetsStore = create((set, get) => ({
  // Estado inicial: array vacío (se cargará desde Supabase cuando el usuario inicie sesión)
  assets: [],
  
  // Estado de carga: indica si se están cargando los activos desde Supabase
  isLoading: false,
  
  // ID del usuario actual (necesario para filtrar activos en Supabase)
  currentUserId: null,
  
  /**
   * CARGAR ACTIVOS DESDE SUPABASE
   * 
   * Esta función carga todos los activos del usuario desde Supabase.
   * Se debe llamar cuando el usuario inicia sesión.
   * 
   * @param {string} userId - ID del usuario (obtenido de Supabase Auth)
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  loadAssets: async (userId) => {
    if (!userId) {
      console.warn('⚠️ No se proporcionó userId para cargar activos');
      set({ assets: [], currentUserId: null });
      return { success: false, error: 'ID de usuario no proporcionado' };
    }

    set({ isLoading: true, currentUserId: userId });

    try {
      const result = await loadAssetsFromSupabase(userId);
      
      if (result.error) {
        console.error('Error al cargar activos:', result.error);
        set({ assets: [], isLoading: false });
        return { success: false, error: result.error };
      }

      // Si hay datos, usarlos. Si no, usar array vacío
      const assets = result.data || [];
      set({ assets, isLoading: false });
      
      console.log(`✅ Cargados ${assets.length} activos desde Supabase`);
      return { success: true };
    } catch (error) {
      console.error('Error inesperado al cargar activos:', error);
      set({ assets: [], isLoading: false });
      return { success: false, error: error.message || 'Error al cargar activos' };
    }
  },
  
  /**
   * ESTABLECER ACTIVOS MANUALMENTE
   * 
   * Función para establecer todos los activos de una vez.
   * Útil para sincronización o migración de datos.
   * 
   * @param {Array} assets - Array de activos a establecer
   * @param {boolean} syncToSupabase - Si true, sincroniza con Supabase
   */
  setAssets: async (assets, syncToSupabase = false) => {
    set({ assets });
    
    // Si se solicita sincronización y hay un usuario logueado, guardar en Supabase
    if (syncToSupabase) {
      const state = get();
      if (state.currentUserId) {
        try {
          const result = await syncAllAssetsToSupabase(assets, state.currentUserId);
          if (!result.success) {
            console.error('Error al sincronizar activos:', result.error);
          }
        } catch (error) {
          console.error('Error inesperado al sincronizar activos:', error);
        }
      }
    }
  },
  
  /**
   * LIMPIAR ACTIVOS
   * 
   * Limpia todos los activos del store. Se usa cuando el usuario cierra sesión.
   */
  clearAssets: () => {
    set({ assets: [], currentUserId: null, isLoading: false });
  },
  
  /**
   * GUARDAR ACTIVOS EN SUPABASE
   * 
   * Función pública para guardar manualmente los activos en Supabase.
   * Útil para guardar después de actualizaciones automáticas de precios.
   * 
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  saveAssets: async () => {
    const state = get();
    if (!state.currentUserId) {
      console.warn('⚠️ No hay usuario logueado, no se pueden guardar activos');
      return { success: false, error: 'No hay usuario logueado' };
    }

    try {
      const result = await syncAllAssetsToSupabase(state.assets, state.currentUserId);
      if (!result.success) {
        console.error('Error al guardar activos:', result.error);
        return { success: false, error: result.error };
      }
      return { success: true };
    } catch (error) {
      console.error('Error inesperado al guardar activos:', error);
      return { success: false, error: error.message || 'Error al guardar activos' };
    }
  },
  
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
  addAssetQuantity: async (assetId, quantityToAdd, purchasePrice) => {
    // Validación: no permitir cantidades o precios negativos o cero
    if (quantityToAdd <= 0 || purchasePrice <= 0) return;
    
    const state = get();
    if (!state.currentUserId) {
      console.warn('⚠️ No hay usuario logueado, no se puede actualizar activo');
      return;
    }
    
    // Calcular los nuevos valores
    const asset = state.assets.find((a) => a.id === assetId);
    if (!asset) {
      console.error('Activo no encontrado:', assetId);
      return;
    }

    const currentQuantity = asset.quantity;
    const currentPurchasePrice = asset.purchasePrice;
    
    let newQuantity, newPurchasePrice;
    
    // Si la cantidad actual es 0, simplemente establecemos los nuevos valores
    if (currentQuantity === 0) {
      newQuantity = quantityToAdd;
      newPurchasePrice = purchasePrice;
    } else {
      // Calcular el nuevo precio promedio de compra (PPC)
      const totalCurrentValue = currentQuantity * currentPurchasePrice;
      const newQuantityValue = quantityToAdd * purchasePrice;
      const newTotalQuantity = currentQuantity + quantityToAdd;
      newPurchasePrice = (totalCurrentValue + newQuantityValue) / newTotalQuantity;
      newQuantity = newTotalQuantity;
    }
    
    // Actualizar en el estado local primero (optimistic update)
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId
          ? { ...a, quantity: newQuantity, purchasePrice: newPurchasePrice }
          : a
      ),
    }));
    
    // Guardar en Supabase
    try {
      const result = await updateAssetInSupabase(
        assetId,
        { quantity: newQuantity, purchasePrice: newPurchasePrice },
        state.currentUserId
      );
      
      if (result.error) {
        console.error('Error al actualizar activo en Supabase:', result.error);
        // Revertir el cambio si falló
        set((state) => ({
          assets: state.assets.map((a) =>
            a.id === assetId ? asset : a
          ),
        }));
      }
    } catch (error) {
      console.error('Error inesperado al actualizar activo:', error);
      // Revertir el cambio si falló
      set((state) => ({
        assets: state.assets.map((a) =>
          a.id === assetId ? asset : a
        ),
      }));
    }
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
  reduceAssetQuantity: async (assetId, quantityToReduce) => {
    const state = get();
    if (!state.currentUserId) {
      console.warn('⚠️ No hay usuario logueado, no se puede actualizar activo');
      return;
    }
    
    const asset = state.assets.find((a) => a.id === assetId);
    if (!asset) {
      console.error('Activo no encontrado:', assetId);
      return;
    }
    
    // Calcular nueva cantidad
    const newQuantity = Math.max(0, asset.quantity - quantityToReduce);
    
    // Actualizar en el estado local primero (optimistic update)
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId ? { ...a, quantity: newQuantity } : a
      ),
    }));
    
    // Guardar en Supabase
    try {
      const result = await updateAssetInSupabase(
        assetId,
        { quantity: newQuantity },
        state.currentUserId
      );
      
      if (result.error) {
        console.error('Error al actualizar activo en Supabase:', result.error);
        // Revertir el cambio si falló
        set((state) => ({
          assets: state.assets.map((a) =>
            a.id === assetId ? asset : a
          ),
        }));
      }
    } catch (error) {
      console.error('Error inesperado al actualizar activo:', error);
      // Revertir el cambio si falló
      set((state) => ({
        assets: state.assets.map((a) =>
          a.id === assetId ? asset : a
        ),
      }));
    }
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
    set((state) => {
      const updatedAssets = state.assets.map((asset) => {
        if (asset.id === assetId) {
          // Si se actualiza el precio y es mayor a 0, quitar el flag de precio estimado
          const isPriceValid = newPrice && newPrice > 0;
          return { 
            ...asset, 
            currentPrice: newPrice,
            isPriceEstimated: isPriceValid ? false : asset.isPriceEstimated, // Quitar flag si el precio es válido
          };
        }
        return asset;
      });
      
      // Guardar en localStorage después de actualizar
      // Nota: No guardamos cada actualización de precio para evitar sobrecargar localStorage
      // Solo guardamos cuando el usuario hace cambios manuales
      // saveAssetsToStorage(updatedAssets);
      
      return { assets: updatedAssets };
    });
  },
  
  /**
   * RESETEAR UN ACTIVO
   * 
   * Establece la cantidad de un activo a 0, pero no lo elimina.
   * Útil para "limpiar" un activo sin perder su configuración.
   * 
   * @param {string} assetId - ID del activo a resetear
   */
  resetAsset: async (assetId) => {
    const state = get();
    if (!state.currentUserId) {
      console.warn('⚠️ No hay usuario logueado, no se puede resetear activo');
      return;
    }
    
    const asset = state.assets.find((a) => a.id === assetId);
    if (!asset) {
      console.error('Activo no encontrado:', assetId);
      return;
    }
    
    // Actualizar en el estado local primero (optimistic update)
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId ? { ...a, quantity: 0 } : a
      ),
    }));
    
    // Guardar en Supabase
    try {
      const result = await updateAssetInSupabase(
        assetId,
        { quantity: 0 },
        state.currentUserId
      );
      
      if (result.error) {
        console.error('Error al resetear activo en Supabase:', result.error);
        // Revertir el cambio si falló
        set((state) => ({
          assets: state.assets.map((a) =>
            a.id === assetId ? asset : a
          ),
        }));
      }
    } catch (error) {
      console.error('Error inesperado al resetear activo:', error);
      // Revertir el cambio si falló
      set((state) => ({
        assets: state.assets.map((a) =>
          a.id === assetId ? asset : a
        ),
      }));
    }
  },
  
  /**
   * ELIMINAR UN ACTIVO
   * 
   * Elimina completamente un activo del array.
   * Usa filter() para crear un nuevo array sin el activo eliminado.
   * 
   * @param {string} assetId - ID del activo a eliminar
   */
  deleteAsset: async (assetId) => {
    const state = get();
    if (!state.currentUserId) {
      console.warn('⚠️ No hay usuario logueado, no se puede eliminar activo');
      return;
    }
    
    const asset = state.assets.find((a) => a.id === assetId);
    if (!asset) {
      console.error('Activo no encontrado:', assetId);
      return;
    }
    
    // Eliminar del estado local primero (optimistic update)
    set((state) => ({
      assets: state.assets.filter((a) => a.id !== assetId),
    }));
    
    // Eliminar de Supabase
    try {
      const result = await deleteAssetFromSupabase(assetId, state.currentUserId);
      
      if (!result.success) {
        console.error('Error al eliminar activo en Supabase:', result.error);
        // Revertir el cambio si falló (agregar el activo de vuelta)
        set((state) => ({
          assets: [...state.assets, asset].sort((a, b) => a.id - b.id),
        }));
      }
    } catch (error) {
      console.error('Error inesperado al eliminar activo:', error);
      // Revertir el cambio si falló
      set((state) => ({
        assets: [...state.assets, asset].sort((a, b) => a.id - b.id),
      }));
    }
  },
  
  /**
   * AGREGAR UN NUEVO ACTIVO
   * 
   * Crea un nuevo activo y lo agrega al array.
   * Genera automáticamente un nuevo ID único (el máximo ID + 1).
   * 
   * @param {string} type - Tipo de activo ("stock", "crypto", "etf", "bond")
   * @param {string} symbol - Símbolo de cotización (ej: "AAPL", "BTC")
   * @param {number} quantity - Cantidad total inicial
   * @param {number} purchasePrice - Precio promedio de compra (opcional, por defecto 0)
   * @param {number} currentPrice - Precio actual del mercado (opcional, por defecto 0)
   * @param {string} name - Nombre del activo (opcional, por defecto el símbolo)
   * @param {Array} brokers - Array de objetos {broker, quantity} (opcional)
   */
  addNewAsset: async (type, symbol, quantity, purchasePrice = 0, currentPrice = 0, name = null, brokers = null, isPriceEstimated = false) => {
    const state = get();
    if (!state.currentUserId) {
      console.warn('⚠️ No hay usuario logueado, no se puede agregar activo');
      return;
    }
    
    // Crear el objeto de activo (sin ID, lo generará Supabase)
    const newAsset = {
      name: name || symbol,
      symbol: symbol,
      type: type,
      quantity: parseFloat(quantity) || 0,
      purchasePrice: parseFloat(purchasePrice) || 0,
      currentPrice: parseFloat(currentPrice) || 0,
      brokers: brokers || [],
      isPriceEstimated: isPriceEstimated || (currentPrice === 0), // Marcar como estimado si no hay precio
    };
    
    // Guardar en Supabase primero
    try {
      const result = await saveAssetToSupabase(newAsset, state.currentUserId);
      
      if (result.error) {
        console.error('Error al guardar activo en Supabase:', result.error);
        return;
      }
      
      // Si se guardó correctamente, agregar al estado local
      set((state) => ({
        assets: [...state.assets, result.data],
      }));
      
      console.log('✅ Activo agregado correctamente:', result.data);
    } catch (error) {
      console.error('Error inesperado al agregar activo:', error);
    }
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

