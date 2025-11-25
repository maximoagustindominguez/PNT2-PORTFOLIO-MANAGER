/**
 * SERVICIO DE ALERTAS CON SUPABASE
 * 
 * Este archivo contiene todas las funciones para interactuar con la base de datos
 * de Supabase para guardar, cargar, actualizar y eliminar alertas de precios.
 */

import { supabase } from './supabase';

const ALERTS_TABLE = 'alerts';
const NOTIFICATIONS_TABLE = 'notifications';

/**
 * CARGAR ALERTAS DE UN USUARIO
 * 
 * @param {string} userId - ID del usuario
 * @returns {Promise<{data: Array|null, error: string|null}>}
 */
export const loadAlertsFromSupabase = async (userId) => {
  if (!userId) {
    return { data: null, error: 'ID de usuario no proporcionado' };
  }

  try {
    console.log('🔍 Cargando alertas desde Supabase para usuario:', userId);
    const { data, error } = await supabase
      .from(ALERTS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error al cargar alertas desde Supabase:', error);
      return { data: null, error: error.message };
    }

    console.log(`📊 Alertas encontradas en BD: ${data?.length || 0}`);
    
    const formattedData = (data || []).map((item) => {
      const formatted = {
        id: item.id,
        assetId: typeof item.asset_id === 'string' ? parseInt(item.asset_id, 10) : Number(item.asset_id), // Asegurar que sea número
        assetName: item.asset_name,
        assetSymbol: item.asset_symbol,
        initialPrice: parseFloat(item.initial_price) || 0,
        alertPrice: parseFloat(item.alert_price) || 0,
        createdAt: item.created_at,
        isActive: item.is_active,
      };
      console.log('  - Alerta:', formatted.assetId, formatted.assetSymbol, formatted.alertPrice);
      return formatted;
    });

    console.log(`✅ Alertas formateadas: ${formattedData.length}`);
    return { data: formattedData, error: null };
  } catch (error) {
    console.error('❌ Error inesperado al cargar alertas:', error);
    return { data: null, error: error.message || 'Error al cargar alertas' };
  }
};

/**
 * GUARDAR UNA NUEVA ALERTA
 * 
 * @param {Object} alert - Objeto con los datos de la alerta
 * @param {string} userId - ID del usuario propietario
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
export const saveAlertToSupabase = async (alert, userId) => {
  if (!userId) {
    return { data: null, error: 'ID de usuario no proporcionado' };
  }

  try {
    // Convertir assetId a número para asegurar que sea BIGINT
    const assetId = typeof alert.assetId === 'string' ? parseInt(alert.assetId, 10) : Number(alert.assetId);
    
    // Validar que assetId sea un número válido
    if (isNaN(assetId) || assetId <= 0) {
      console.error('Asset ID inválido:', alert.assetId, 'convertido a:', assetId);
      return { data: null, error: 'ID de asset inválido' };
    }

    console.log('Intentando crear alerta para asset ID:', assetId, 'Usuario ID:', userId);
    console.log('Tipo de assetId:', typeof assetId, 'Valor:', assetId);

    // Verificar que el asset existe antes de intentar crear la alerta
    // Usar retry con delay para manejar problemas de sincronización
    let assetCheck = null;
    let assetCheckError = null;
    const maxRetries = 3;
    const retryDelay = 500; // 500ms entre intentos
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const { data, error } = await supabase
        .from('assets')
        .select('id, user_id, name, symbol')
        .eq('id', assetId)
        .eq('user_id', userId);
      
      assetCheck = data;
      assetCheckError = error;
      
      if (assetCheckError) {
        console.error(`Error al verificar asset (intento ${attempt}/${maxRetries}):`, assetCheckError);
        if (attempt < maxRetries) {
          console.log(`Esperando ${retryDelay}ms antes de reintentar...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        // En el último intento, continuar de todas formas (la foreign key constraint lo validará)
        console.warn('Continuando con la creación de la alerta a pesar del error de verificación (la foreign key lo validará)');
        break;
      }
      
      if (assetCheck && assetCheck.length > 0) {
        console.log(`✅ Asset verificado correctamente en intento ${attempt}:`, assetCheck[0]);
        break;
      }
      
      // Si no se encontró el asset y no es el último intento, esperar y reintentar
      if (attempt < maxRetries) {
        console.log(`⚠️ Asset no encontrado en intento ${attempt}/${maxRetries}. Esperando ${retryDelay}ms antes de reintentar...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        // En el último intento, listar assets del usuario para debug
        console.error('❌ Asset no encontrado después de todos los intentos. Asset ID:', assetId, 'User ID:', userId);
        const { data: userAssets } = await supabase
          .from('assets')
          .select('id, name, symbol')
          .eq('user_id', userId)
          .order('id', { ascending: false })
          .limit(10);
        console.log('📋 Assets del usuario en BD:', userAssets);
        console.log('🔍 Asset ID buscado:', assetId, 'Tipo:', typeof assetId);
        
        // Verificar si el asset existe pero con un ID diferente
        const assetExists = userAssets?.some(a => {
          const dbId = typeof a.id === 'string' ? parseInt(a.id, 10) : Number(a.id);
          return dbId === assetId;
        });
        
        if (!assetExists) {
          return { 
            data: null, 
            error: `El asset con ID ${assetId} no existe en la base de datos o no pertenece a tu cuenta. Por favor, recarga la página para sincronizar los datos.` 
          };
        }
      }
    }

    const alertToInsert = {
      user_id: userId,
      asset_id: assetId,
      asset_name: alert.assetName,
      asset_symbol: alert.assetSymbol,
      initial_price: alert.initialPrice, // Precio cuando se crea la alerta
      alert_price: alert.alertPrice, // Precio objetivo
      is_active: true,
    };

    console.log('Datos a insertar:', alertToInsert);

    const { data, error } = await supabase
      .from(ALERTS_TABLE)
      .insert([alertToInsert])
      .select()
      .single();

    if (error) {
      console.error('Error al guardar alerta en Supabase:', error);
      console.error('Código de error:', error.code);
      console.error('Detalles:', error.details);
      console.error('Hint:', error.hint);
      console.error('Asset ID usado:', assetId, 'Tipo:', typeof assetId);
      console.error('Datos intentados:', alertToInsert);
      
      // Proporcionar un mensaje de error más descriptivo
      let errorMessage = error.message;
      if (error.code === '23503') {
        // Foreign key constraint violation - el asset_id no existe o no pertenece al usuario
        // Intentar verificar si el asset existe
        const { data: assetCheck } = await supabase
          .from('assets')
          .select('id, user_id')
          .eq('id', assetId)
          .maybeSingle();
        
        console.log('Verificación de asset:', assetCheck);
        
        if (!assetCheck) {
          errorMessage = `El asset con ID ${assetId} no existe en la base de datos. Por favor, recarga la página para sincronizar los datos.`;
        } else if (assetCheck.user_id !== userId) {
          errorMessage = `El asset con ID ${assetId} no pertenece a tu cuenta. Por favor, recarga la página.`;
        } else {
          errorMessage = `Error al crear la alerta. El asset existe pero hay un problema con la relación. Por favor, recarga la página e intenta nuevamente.`;
        }
      } else if (error.code === 'PGRST116') {
        errorMessage = 'No se encontró el asset en la base de datos. Por favor, recarga la página.';
      } else if (error.code === '23502') {
        // NOT NULL constraint violation
        errorMessage = `Error: Falta un campo requerido. Por favor, verifica que todos los datos estén completos.`;
      }
      return { data: null, error: errorMessage };
    }

    const formattedAlert = {
      id: data.id,
      assetId: typeof data.asset_id === 'string' ? parseInt(data.asset_id, 10) : Number(data.asset_id), // Asegurar que sea número
      assetName: data.asset_name,
      assetSymbol: data.asset_symbol,
      initialPrice: parseFloat(data.initial_price) || 0,
      alertPrice: parseFloat(data.alert_price) || 0,
      createdAt: data.created_at,
      isActive: data.is_active,
    };

    return { data: formattedAlert, error: null };
  } catch (error) {
    console.error('Error inesperado al guardar alerta:', error);
    return { data: null, error: error.message || 'Error al guardar alerta' };
  }
};

/**
 * DESACTIVAR UNA ALERTA
 * 
 * @param {string} alertId - ID de la alerta
 * @param {string} userId - ID del usuario
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const deactivateAlertInSupabase = async (alertId, userId) => {
  if (!userId) {
    return { success: false, error: 'ID de usuario no proporcionado' };
  }

  try {
    const { error } = await supabase
      .from(ALERTS_TABLE)
      .update({ is_active: false })
      .eq('id', alertId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error al desactivar alerta en Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error inesperado al desactivar alerta:', error);
    return { success: false, error: error.message || 'Error al desactivar alerta' };
  }
};

/**
 * CARGAR NOTIFICACIONES DE UN USUARIO
 * 
 * @param {string} userId - ID del usuario
 * @returns {Promise<{data: Array|null, error: string|null}>}
 */
export const loadNotificationsFromSupabase = async (userId) => {
  if (!userId) {
    return { data: null, error: 'ID de usuario no proporcionado' };
  }

  try {
    const { data, error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error al cargar notificaciones desde Supabase:', error);
      return { data: null, error: error.message };
    }

    const formattedData = (data || []).map((item) => ({
      id: item.id,
      assetId: item.asset_id,
      assetName: item.asset_name,
      assetSymbol: item.asset_symbol,
      alertPrice: parseFloat(item.alert_price) || 0,
      currentPrice: parseFloat(item.current_price) || 0,
      message: item.message,
      isRead: item.is_read,
      createdAt: item.created_at,
    }));

    return { data: formattedData, error: null };
  } catch (error) {
    console.error('Error inesperado al cargar notificaciones:', error);
    return { data: null, error: error.message || 'Error al cargar notificaciones' };
  }
};

/**
 * CREAR UNA NUEVA NOTIFICACIÓN
 * 
 * @param {Object} notification - Objeto con los datos de la notificación
 * @param {string} userId - ID del usuario
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
export const createNotificationInSupabase = async (notification, userId) => {
  if (!userId) {
    return { data: null, error: 'ID de usuario no proporcionado' };
  }

  try {
    const notificationToInsert = {
      user_id: userId,
      asset_id: notification.assetId || null, // Permitir null para notificaciones sin asset
      asset_name: notification.assetName || 'Sistema',
      asset_symbol: notification.assetSymbol || 'SYS',
      alert_price: notification.alertPrice || 0,
      current_price: notification.currentPrice || 0,
      message: notification.message,
      is_read: false,
    };

    const { data, error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .insert([notificationToInsert])
      .select()
      .single();

    if (error) {
      console.error('Error al crear notificación en Supabase:', error);
      return { data: null, error: error.message };
    }

    const formattedNotification = {
      id: data.id,
      assetId: data.asset_id,
      assetName: data.asset_name,
      assetSymbol: data.asset_symbol,
      alertPrice: parseFloat(data.alert_price) || 0,
      currentPrice: parseFloat(data.current_price) || 0,
      message: data.message,
      isRead: data.is_read,
      createdAt: data.created_at,
    };

    return { data: formattedNotification, error: null };
  } catch (error) {
    console.error('Error inesperado al crear notificación:', error);
    return { data: null, error: error.message || 'Error al crear notificación' };
  }
};

/**
 * MARCAR NOTIFICACIONES COMO LEÍDAS
 * 
 * @param {string} userId - ID del usuario
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const markAllNotificationsAsReadInSupabase = async (userId) => {
  if (!userId) {
    return { success: false, error: 'ID de usuario no proporcionado' };
  }

  try {
    const { error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error al marcar notificaciones como leídas:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error inesperado al marcar notificaciones:', error);
    return { success: false, error: error.message || 'Error al marcar notificaciones' };
  }
};

/**
 * VERIFICAR ALERTAS Y CREAR NOTIFICACIONES
 * 
 * @param {string} userId - ID del usuario
 * @param {Array} assets - Array de activos con precios actualizados
 * @returns {Promise<{notificationsCreated: number, error: string|null}>}
 */
export const checkAlertsAndCreateNotifications = async (userId, assets) => {
  if (!userId) {
    return { notificationsCreated: 0, error: 'ID de usuario no proporcionado' };
  }

  try {
    // Cargar todas las alertas activas del usuario
    const { data: alerts, error: alertsError } = await loadAlertsFromSupabase(userId);
    
    if (alertsError) {
      return { notificationsCreated: 0, error: alertsError };
    }

    if (!alerts || alerts.length === 0) {
      return { notificationsCreated: 0, error: null };
    }

    let notificationsCreated = 0;

    // Para cada alerta, verificar si el precio actual cruzó el precio de alerta
    for (const alert of alerts) {
      const asset = assets.find(a => a.id === alert.assetId);
      
      if (!asset) continue;

      const currentPrice = asset.currentPrice;
      const alertPrice = alert.alertPrice;
      const initialPrice = alert.initialPrice;

      if (currentPrice <= 0) continue;

      // Determinar si la alerta debe dispararse
      // La alerta se dispara cuando el precio cruza el umbral desde el precio inicial
      let shouldTrigger = false;

      if (alertPrice > initialPrice) {
        // Alerta hacia arriba: precio debe subir y cruzar el umbral
        // Solo disparar si el precio actual es >= alertPrice (cruzó hacia arriba)
        shouldTrigger = currentPrice >= alertPrice;
      } else if (alertPrice < initialPrice) {
        // Alerta hacia abajo: precio debe bajar y cruzar el umbral
        // Solo disparar si el precio actual es <= alertPrice (cruzó hacia abajo)
        shouldTrigger = currentPrice <= alertPrice;
      } else {
        // Si alertPrice == initialPrice, no tiene sentido (ya está en el umbral)
        continue;
      }

      if (shouldTrigger) {
        // Verificar si ya existe una notificación para esta alerta recientemente (últimas 24 horas)
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const { data: existingNotifications } = await supabase
          .from(NOTIFICATIONS_TABLE)
          .select('id')
          .eq('user_id', userId)
          .eq('asset_id', alert.assetId)
          .gte('created_at', oneDayAgo.toISOString())
          .limit(1);

        // Si ya hay una notificación reciente, no crear otra
        if (existingNotifications && existingNotifications.length > 0) {
          continue;
        }

        // Crear notificación con mensaje descriptivo
        const direction = alertPrice > initialPrice ? 'subió' : 'bajó';
        const message = `${alert.assetName} (${alert.assetSymbol}) ${direction} y alcanzó el precio de alerta de ${alertPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Precio actual: ${currentPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (precio inicial: ${initialPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;

        const { error: notificationError } = await createNotificationInSupabase({
          assetId: alert.assetId,
          assetName: alert.assetName,
          assetSymbol: alert.assetSymbol,
          alertPrice: alertPrice,
          currentPrice: currentPrice,
          message: message,
        }, userId);

        if (!notificationError) {
          notificationsCreated++;
        }
      }
    }

    return { notificationsCreated, error: null };
  } catch (error) {
    console.error('Error inesperado al verificar alertas:', error);
    return { notificationsCreated: 0, error: error.message || 'Error al verificar alertas' };
  }
};

