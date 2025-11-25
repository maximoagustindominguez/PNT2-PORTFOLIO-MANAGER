/**
 * STORE DE NOTIFICACIONES (ZUSTAND)
 * 
 * Este store maneja todas las notificaciones del usuario.
 */

import { create } from 'zustand';
import {
  loadNotificationsFromSupabase,
  markAllNotificationsAsReadInSupabase,
} from '../lib/alertsService';

export const useNotificationsStore = create((set, get) => ({
  notifications: [],
  isLoading: false,
  currentUserId: null,

  /**
   * CARGAR NOTIFICACIONES DESDE SUPABASE
   */
  loadNotifications: async (userId) => {
    if (!userId) {
      console.warn('⚠️ No se proporcionó userId para cargar notificaciones');
      set({ notifications: [], currentUserId: null });
      return { success: false, error: 'ID de usuario no proporcionado' };
    }

    set({ isLoading: true, currentUserId: userId });

    try {
      const result = await loadNotificationsFromSupabase(userId);

      if (result.error) {
        console.error('Error al cargar notificaciones:', result.error);
        set({ isLoading: false });
        return { success: false, error: result.error };
      }

      const notifications = result.data || [];
      set({ notifications, isLoading: false });

      console.log(`✅ Cargadas ${notifications.length} notificaciones desde Supabase`);
      return { success: true };
    } catch (error) {
      console.error('Error inesperado al cargar notificaciones:', error);
      set({ isLoading: false });
      return { success: false, error: error.message || 'Error al cargar notificaciones' };
    }
  },

  /**
   * AGREGAR UNA NOTIFICACIÓN (para uso interno cuando se crea desde el servicio)
   */
  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
    }));
  },

  /**
   * MARCAR TODAS LAS NOTIFICACIONES COMO LEÍDAS
   */
  markAllAsRead: async (userId) => {
    if (!userId) {
      return { success: false, error: 'ID de usuario no proporcionado' };
    }

    try {
      const result = await markAllNotificationsAsReadInSupabase(userId);

      if (result.error) {
        console.error('Error al marcar notificaciones como leídas:', result.error);
        return { success: false, error: result.error };
      }

      set((state) => ({
        notifications: state.notifications.map((notif) => ({
          ...notif,
          isRead: true,
        })),
      }));

      console.log('✅ Todas las notificaciones marcadas como leídas');
      return { success: true };
    } catch (error) {
      console.error('Error inesperado al marcar notificaciones:', error);
      return { success: false, error: error.message || 'Error al marcar notificaciones' };
    }
  },

  /**
   * OBTENER CONTADOR DE NOTIFICACIONES NO LEÍDAS
   */
  getUnreadCount: () => {
    const state = get();
    return state.notifications.filter((notif) => !notif.isRead).length;
  },

  /**
   * LIMPIAR NOTIFICACIONES
   */
  clearNotifications: () => {
    set({ notifications: [], currentUserId: null });
  },
}));

