/**
 * SERVICIO DE ACTIVOS CON SUPABASE
 * 
 * Este archivo contiene todas las funciones para interactuar con la base de datos
 * de Supabase para guardar, cargar, actualizar y eliminar activos.
 * 
 * ¿Por qué un servicio separado?
 * - Separa la lógica de base de datos del store de Zustand
 * - Facilita el mantenimiento y las pruebas
 * - Permite cambiar la implementación sin afectar el store
 * 
 * ¿Qué operaciones hace?
 * - Cargar todos los activos de un usuario
 * - Guardar un nuevo activo
 * - Actualizar un activo existente
 * - Eliminar un activo
 * - Sincronizar todos los activos de una vez
 */

import { supabase } from './supabase';

/**
 * NOMBRE DE LA TABLA EN SUPABASE
 * 
 * Esta es la tabla donde se guardan los activos.
 * Cada usuario tiene sus propios activos (filtrados por user_id).
 */
const ASSETS_TABLE = 'assets';

/**
 * CARGAR ACTIVOS DE UN USUARIO
 * 
 * Obtiene todos los activos del usuario actual desde Supabase.
 * 
 * @param {string} userId - ID del usuario (obtenido de Supabase Auth)
 * @returns {Promise<{data: Array|null, error: string|null}>}
 *   - data: Array de activos si fue exitoso
 *   - error: Mensaje de error si falló
 */
export const loadAssetsFromSupabase = async (userId) => {
  if (!userId) {
    return { data: null, error: 'ID de usuario no proporcionado' };
  }

  try {
    // Consultar la tabla de activos filtrando por user_id
    // Ordenar por ID para mantener consistencia
    const { data, error } = await supabase
      .from(ASSETS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: true });

    if (error) {
      console.error('Error al cargar activos desde Supabase:', error);
      // Si el error es que la tabla no existe, dar un mensaje más claro
      if (error.message && error.message.includes('does not exist')) {
        return { 
          data: null, 
          error: 'La tabla de activos no existe en Supabase. Por favor, ejecuta el script SQL en supabase_migration.sql' 
        };
      }
      return { data: null, error: error.message };
    }

    // Convertir de formato de BD (snake_case) a formato de app (camelCase)
    const formattedData = (data || []).map((item) => ({
      id: item.id,
      name: item.name,
      symbol: item.symbol,
      type: item.type,
      quantity: parseFloat(item.quantity) || 0,
      purchasePrice: parseFloat(item.purchase_price) || 0,
      currentPrice: parseFloat(item.current_price) || 0,
      brokers: item.brokers || [],
    }));

    // Si no hay datos, devolver array vacío
    return { data: formattedData, error: null };
  } catch (error) {
    console.error('Error inesperado al cargar activos:', error);
    return { data: null, error: error.message || 'Error al cargar activos' };
  }
};

/**
 * GUARDAR UN NUEVO ACTIVO
 * 
 * Inserta un nuevo activo en la base de datos.
 * 
 * @param {Object} asset - Objeto con los datos del activo
 * @param {string} userId - ID del usuario propietario
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
export const saveAssetToSupabase = async (asset, userId) => {
  if (!userId) {
    return { data: null, error: 'ID de usuario no proporcionado' };
  }

  try {
    // Preparar el objeto para insertar en Supabase
    // Incluimos el user_id para asociar el activo al usuario
    const assetToInsert = {
      user_id: userId,
      name: asset.name,
      symbol: asset.symbol,
      type: asset.type,
      quantity: asset.quantity,
      purchase_price: asset.purchasePrice, // En la BD usamos snake_case
      current_price: asset.currentPrice,
      brokers: asset.brokers || [], // Array de brokers (se guarda como JSON)
    };

    const { data, error } = await supabase
      .from(ASSETS_TABLE)
      .insert([assetToInsert])
      .select()
      .single();

    if (error) {
      console.error('Error al guardar activo en Supabase:', error);
      return { data: null, error: error.message };
    }

    // Convertir de formato de BD (snake_case) a formato de app (camelCase)
    const formattedAsset = {
      id: data.id,
      name: data.name,
      symbol: data.symbol,
      type: data.type,
      quantity: data.quantity,
      purchasePrice: data.purchase_price,
      currentPrice: data.current_price,
      brokers: data.brokers || [],
    };

    return { data: formattedAsset, error: null };
  } catch (error) {
    console.error('Error inesperado al guardar activo:', error);
    return { data: null, error: error.message || 'Error al guardar activo' };
  }
};

/**
 * ACTUALIZAR UN ACTIVO EXISTENTE
 * 
 * Actualiza los datos de un activo en la base de datos.
 * 
 * @param {string} assetId - ID del activo a actualizar
 * @param {Object} updates - Objeto con los campos a actualizar
 * @param {string} userId - ID del usuario (para verificar propiedad)
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
export const updateAssetInSupabase = async (assetId, updates, userId) => {
  if (!userId) {
    return { data: null, error: 'ID de usuario no proporcionado' };
  }

  try {
    // Preparar los datos para actualizar (convertir camelCase a snake_case)
    const updatesToDB = {};
    if (updates.name !== undefined) updatesToDB.name = updates.name;
    if (updates.symbol !== undefined) updatesToDB.symbol = updates.symbol;
    if (updates.type !== undefined) updatesToDB.type = updates.type;
    if (updates.quantity !== undefined) updatesToDB.quantity = updates.quantity;
    if (updates.purchasePrice !== undefined) updatesToDB.purchase_price = updates.purchasePrice;
    if (updates.currentPrice !== undefined) updatesToDB.current_price = updates.currentPrice;
    if (updates.brokers !== undefined) updatesToDB.brokers = updates.brokers;

    // Actualizar solo si el activo pertenece al usuario
    const { data, error } = await supabase
      .from(ASSETS_TABLE)
      .update(updatesToDB)
      .eq('id', assetId)
      .eq('user_id', userId) // Verificar que el activo pertenece al usuario
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar activo en Supabase:', error);
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: 'Activo no encontrado o no pertenece al usuario' };
    }

    // Convertir de formato de BD a formato de app
    const formattedAsset = {
      id: data.id,
      name: data.name,
      symbol: data.symbol,
      type: data.type,
      quantity: data.quantity,
      purchasePrice: data.purchase_price,
      currentPrice: data.current_price,
      brokers: data.brokers || [],
    };

    return { data: formattedAsset, error: null };
  } catch (error) {
    console.error('Error inesperado al actualizar activo:', error);
    return { data: null, error: error.message || 'Error al actualizar activo' };
  }
};

/**
 * ELIMINAR UN ACTIVO
 * 
 * Elimina un activo de la base de datos.
 * 
 * @param {string} assetId - ID del activo a eliminar
 * @param {string} userId - ID del usuario (para verificar propiedad)
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const deleteAssetFromSupabase = async (assetId, userId) => {
  if (!userId) {
    return { success: false, error: 'ID de usuario no proporcionado' };
  }

  try {
    // Eliminar solo si el activo pertenece al usuario
    const { error } = await supabase
      .from(ASSETS_TABLE)
      .delete()
      .eq('id', assetId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error al eliminar activo en Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error inesperado al eliminar activo:', error);
    return { success: false, error: error.message || 'Error al eliminar activo' };
  }
};

/**
 * SINCRONIZAR TODOS LOS ACTIVOS
 * 
 * Reemplaza todos los activos del usuario en la base de datos.
 * Útil para sincronización masiva o migración de datos.
 * 
 * @param {Array} assets - Array de activos a guardar
 * @param {string} userId - ID del usuario
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const syncAllAssetsToSupabase = async (assets, userId) => {
  if (!userId) {
    return { success: false, error: 'ID de usuario no proporcionado' };
  }

  try {
    // Primero, eliminar todos los activos existentes del usuario
    const { error: deleteError } = await supabase
      .from(ASSETS_TABLE)
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error al eliminar activos existentes:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // Si no hay activos para insertar, terminar aquí
    if (!assets || assets.length === 0) {
      return { success: true, error: null };
    }

    // Convertir activos al formato de la base de datos
    const assetsToInsert = assets.map((asset) => ({
      user_id: userId,
      name: asset.name,
      symbol: asset.symbol,
      type: asset.type,
      quantity: asset.quantity,
      purchase_price: asset.purchasePrice,
      current_price: asset.currentPrice,
      brokers: asset.brokers || [],
    }));

    // Insertar todos los activos
    const { error: insertError } = await supabase
      .from(ASSETS_TABLE)
      .insert(assetsToInsert);

    if (insertError) {
      console.error('Error al insertar activos:', insertError);
      return { success: false, error: insertError.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error inesperado al sincronizar activos:', error);
    return { success: false, error: error.message || 'Error al sincronizar activos' };
  }
};

