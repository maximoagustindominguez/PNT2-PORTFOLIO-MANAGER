/**
 * HOOK PARA VERIFICAR ALERTAS PERIÓDICAMENTE
 * 
 * Este hook verifica periódicamente si alguna alerta ha alcanzado su precio objetivo
 * y crea notificaciones cuando esto ocurre.
 */

import { useEffect, useRef } from 'react';
import { useAssetsStore } from '../store/assetsStore';
import { useNotificationsStore } from '../store/notificationsStore';
import { useSessionStore } from '../store/sessionStore';
import { checkAlertsAndCreateNotifications } from '../lib/alertsService';

/**
 * Hook que verifica alertas cada cierto intervalo
 * @param {number} intervalMinutes - Intervalo en minutos entre verificaciones (default: 5)
 */
export const useAlertChecker = (intervalMinutes = 5) => {
  const user = useSessionStore((state) => state.user);
  const assets = useAssetsStore((state) => state.assets);
  const { loadNotifications } = useNotificationsStore();
  const { addNotification } = useNotificationsStore();
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    // Función para verificar alertas
    const checkAlerts = async () => {
      try {
        // Obtener assets actualizados del store
        const currentAssets = useAssetsStore.getState().assets;
        
        if (currentAssets.length === 0) {
          return;
        }

        const result = await checkAlertsAndCreateNotifications(user.id, currentAssets);
        
        if (result.error) {
          console.error('Error al verificar alertas:', result.error);
          return;
        }

        if (result.notificationsCreated > 0) {
          console.log(`✅ Se crearon ${result.notificationsCreated} notificaciones`);
          // Recargar notificaciones para actualizar el estado
          await loadNotifications(user.id);
        }
      } catch (error) {
        console.error('Error inesperado al verificar alertas:', error);
      }
    };

    // Verificar inmediatamente al montar
    checkAlerts();

    // Configurar intervalo para verificar periódicamente
    const intervalMs = intervalMinutes * 60 * 1000;
    intervalRef.current = setInterval(checkAlerts, intervalMs);

    // Limpiar intervalo al desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user?.id, intervalMinutes, loadNotifications]);

  // Limpiar intervalo si el usuario cierra sesión
  useEffect(() => {
    if (!user?.id && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [user?.id]);
};

