/**
 * STORE DE ALERTAS (ZUSTAND)
 * 
 * Este store maneja todas las alertas de precios del usuario.
 */

import { create } from 'zustand';
import {
  loadAlertsFromSupabase,
  saveAlertToSupabase,
  deactivateAlertInSupabase,
} from '../lib/alertsService';

export const useAlertsStore = create((set, get) => ({
  alerts: [],
  isLoading: false,
  currentUserId: null,

  /**
   * CARGAR ALERTAS DESDE SUPABASE
   */
  loadAlerts: async (userId) => {
    if (!userId) {
      console.warn('⚠️ No se proporcionó userId para cargar alertas');
      set({ alerts: [], currentUserId: null });
      return { success: false, error: 'ID de usuario no proporcionado' };
    }

    set({ isLoading: true, currentUserId: userId });
    
    // IMPORTANTE: Limpiar alertas existentes antes de cargar nuevas
    // Esto previene que se muestren alertas antiguas o desincronizadas
    set({ alerts: [] });

    try {
      const result = await loadAlertsFromSupabase(userId);

      if (result.error) {
        console.error('Error al cargar alertas:', result.error);
        // Mantener array vacío si hay error
        set({ alerts: [], isLoading: false });
        return { success: false, error: result.error };
      }

      const alerts = result.data || [];
      set({ alerts, isLoading: false });

      console.log(`✅ Cargadas ${alerts.length} alertas desde Supabase (limpiadas antes de cargar)`);
      return { success: true };
    } catch (error) {
      console.error('Error inesperado al cargar alertas:', error);
      // Mantener array vacío si hay error
      set({ alerts: [], isLoading: false });
      return { success: false, error: error.message || 'Error al cargar alertas' };
    }
  },

  /**
   * AGREGAR UNA NUEVA ALERTA
   */
  addAlert: async (alert, userId) => {
    if (!userId) {
      return { success: false, error: 'ID de usuario no proporcionado' };
    }

    try {
      const result = await saveAlertToSupabase(alert, userId);

      if (result.error) {
        console.error('Error al agregar alerta:', result.error);
        return { success: false, error: result.error };
      }

      const newAlert = result.data;
      set((state) => ({
        alerts: [...state.alerts, newAlert],
      }));

      console.log('✅ Alerta agregada:', newAlert);
      return { success: true, data: newAlert };
    } catch (error) {
      console.error('Error inesperado al agregar alerta:', error);
      return { success: false, error: error.message || 'Error al agregar alerta' };
    }
  },

  /**
   * DESACTIVAR UNA ALERTA
   */
  deactivateAlert: async (alertId, userId) => {
    if (!userId) {
      return { success: false, error: 'ID de usuario no proporcionado' };
    }

    try {
      const result = await deactivateAlertInSupabase(alertId, userId);

      if (result.error) {
        console.error('Error al desactivar alerta:', result.error);
        return { success: false, error: result.error };
      }

      set((state) => ({
        alerts: state.alerts.filter((alert) => alert.id !== alertId),
      }));

      console.log('✅ Alerta desactivada:', alertId);
      return { success: true };
    } catch (error) {
      console.error('Error inesperado al desactivar alerta:', error);
      return { success: false, error: error.message || 'Error al desactivar alerta' };
    }
  },

  /**
   * LIMPIAR ALERTAS
   */
  clearAlerts: () => {
    set({ alerts: [], currentUserId: null });
  },
}));

