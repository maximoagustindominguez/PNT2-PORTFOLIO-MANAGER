/**
 * HOOK PERSONALIZADO: useFinnhubPrices
 * 
 * Este hook actualiza automáticamente los precios de los activos cada 2 minutos
 * usando la API de Finnhub. Es el "motor" que mantiene los precios actualizados.
 * 
 * ¿Cómo funciona?
 * 1. Se ejecuta cuando el componente se monta (cuando se carga la página)
 * 2. Configura un intervalo que se ejecuta cada 2 minutos
 * 3. Cada vez que se ejecuta, obtiene los precios actuales de todos los activos
 * 4. Actualiza los precios en el store de Zustand
 * 5. Si detecta problemas de rate limiting, se pausa automáticamente
 * 
 * ¿Qué es un intervalo?
 * Un intervalo es una función que se ejecuta repetidamente cada cierto tiempo.
 * En JavaScript: setInterval(() => { hacer algo }, tiempo_en_milisegundos)
 * 
 * ¿Por qué usar useRef?
 * useRef nos permite guardar valores que persisten entre renders pero que
 * no causan re-renders cuando cambian. Útil para:
 * - Guardar referencias a intervalos
 * - Guardar flags de estado (como "¿está actualizando ahora?")
 * - Guardar valores que necesitamos en el cleanup pero que pueden cambiar
 */

import { useEffect, useRef } from 'react';
import { useAssetsStore } from '../store/assetsStore';
import { updateAssetPrices } from '../lib/finnhub';
import { updateAssetInSupabase } from '../lib/assetsService';

// ============================================
// CONSTANTES DE CONFIGURACIÓN
// ============================================
const UPDATE_INTERVAL = 2 * 60 * 1000; // 2 minutos en milisegundos (120,000 ms)
const RATE_LIMIT_BACKOFF = 5 * 60 * 1000; // 5 minutos de pausa si hay rate limit (300,000 ms)
const MAX_CONSECUTIVE_ERRORS = 3; // Si hay 3 errores seguidos, pausar actualizaciones

/**
 * Hook para actualizar automáticamente los precios de los activos
 * @param {boolean} enabled - Si está habilitado o no (por defecto: true)
 *   Útil para desactivar actualizaciones en ciertas situaciones
 */
export const useFinnhubPrices = (enabled = true) => {
  // ============================================
  // OBTENER FUNCIONES DEL STORE
  // ============================================
  // Esta función actualiza el precio de un activo en el store
  const updateCurrentPrice = useAssetsStore((state) => state.updateCurrentPrice);
  // Esta función guarda los activos en localStorage
  const saveAssets = useAssetsStore((state) => state.saveAssets);
  
  // ============================================
  // REFS PARA GUARDAR ESTADO PERSISTENTE
  // ============================================
  // useRef crea un objeto mutable que persiste entre renders
  // No causa re-renders cuando cambia su valor
  
  const intervalRef = useRef(null); // Referencia al intervalo (para poder limpiarlo)
  const isUpdatingRef = useRef(false); // Flag: ¿estamos actualizando ahora?
  const updateCurrentPriceRef = useRef(updateCurrentPrice); // Referencia a la función (para usarla en el intervalo)
  const consecutiveErrorsRef = useRef(0); // Contador de errores consecutivos
  const isPausedRef = useRef(false); // Flag: ¿estamos en pausa por rate limiting?
  const pauseUntilRef = useRef(null); // Timestamp: ¿hasta cuándo estamos en pausa?

  // ============================================
  // MANTENER REFERENCIA ACTUALIZADA
  // ============================================
  // Cuando updateCurrentPrice cambia (raro, pero puede pasar), actualizamos la ref
  // Esto asegura que el intervalo siempre use la versión más reciente de la función
  useEffect(() => {
    updateCurrentPriceRef.current = updateCurrentPrice;
  }, [updateCurrentPrice]);

  // ============================================
  // EFECTO PRINCIPAL: CONFIGURAR ACTUALIZACIONES
  // ============================================
  // useEffect se ejecuta cuando el componente se monta o cuando 'enabled' cambia
  // El return al final es la función de "cleanup" que se ejecuta al desmontar
  
  useEffect(() => {
    // Si el hook está deshabilitado, limpiar cualquier intervalo existente
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return; // Salir temprano si está deshabilitado
    }

    // Obtener la clave de API desde las variables de entorno
    const apiKey = import.meta.env.VITE_FINNHUB_API_KEY;

    // Si no hay clave de API, mostrar advertencia y salir
    if (!apiKey) {
      console.warn('⚠️ VITE_FINNHUB_API_KEY no está configurada en .env');
      return;
    }

    /**
     * FUNCIÓN QUE ACTUALIZA LOS PRECIOS
     * 
     * Esta función se ejecuta cada 2 minutos (o cuando se llama manualmente)
     * Es async porque hace peticiones HTTP que toman tiempo
     */
    const updatePrices = async () => {
      // ============================================
      // VERIFICAR SI ESTAMOS EN PAUSA
      // ============================================
      // Si detectamos rate limiting anteriormente, pausamos las actualizaciones
      // para no seguir haciendo peticiones que van a fallar
      
      if (isPausedRef.current && pauseUntilRef.current) {
        // Si aún no ha pasado el tiempo de pausa, salir sin hacer nada
        if (Date.now() < pauseUntilRef.current) {
          const remainingMinutes = Math.ceil((pauseUntilRef.current - Date.now()) / 60000);
          console.log(`⏸️ Actualizaciones pausadas por rate limiting. Reanudando en ${remainingMinutes} minuto(s).`);
          return; // Salir de la función sin actualizar
        } else {
          // La pausa terminó, reanudar actualizaciones
          isPausedRef.current = false;
          pauseUntilRef.current = null;
          consecutiveErrorsRef.current = 0; // Resetear contador de errores
          console.log('▶️ Reanudando actualizaciones de precios.');
        }
      }

      // ============================================
      // EVITAR ACTUALIZACIONES SIMULTÁNEAS
      // ============================================
      // Si ya estamos actualizando, no iniciar otra actualización
      // Esto previene que se acumulen múltiples peticiones si la anterior tarda mucho
      if (isUpdatingRef.current) {
        return; // Ya hay una actualización en curso, salir
      }

      // Marcar que estamos actualizando
      isUpdatingRef.current = true;

      try {
        // ============================================
        // OBTENER ACTIVOS A ACTUALIZAR
        // ============================================
        // getState() obtiene el estado actual sin suscribirse
        // Filtramos solo los activos que tienen símbolo y cantidad > 0
        // (no tiene sentido actualizar precios de activos que no tenemos)
        
        const currentAssets = useAssetsStore.getState().assets;
        const assetsToUpdate = currentAssets.filter(
          (asset) => asset.symbol && asset.quantity > 0
        );

        // Si no hay activos para actualizar, salir
        if (assetsToUpdate.length === 0) {
          return;
        }

        // ============================================
        // ACTUALIZAR PRECIOS
        // ============================================
        // Llamar a la función del servicio de Finnhub
        // Esta función procesa los activos en lotes y actualiza los precios
        // También actualiza el flag isPriceEstimated cuando se obtiene un precio válido
        const result = await updateAssetPrices(
          assetsToUpdate, // Array de activos a actualizar
          (assetId, price) => {
            // Actualizar precio y quitar flag de precio estimado si el precio es válido
            updateCurrentPriceRef.current(assetId, price);
            if (price && price > 0) {
              // Actualizar el flag en Supabase también
              const state = useAssetsStore.getState();
              if (state.currentUserId) {
                updateAssetInSupabase(assetId, { isPriceEstimated: false }, state.currentUserId).catch(err => {
                  console.error('Error al actualizar flag de precio estimado:', err);
                });
              }
            }
          },
          apiKey // Clave de API
        );

        // ============================================
        // MANEJAR RESULTADOS
        // ============================================
        if (result.rateLimited) {
          // Si la API nos bloqueó por demasiadas peticiones
          consecutiveErrorsRef.current++;
          console.warn(`⚠️ Rate limit detectado (${consecutiveErrorsRef.current}/${MAX_CONSECUTIVE_ERRORS}).`);
          
          // Si tenemos demasiados errores consecutivos, pausar actualizaciones
          if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
            isPausedRef.current = true;
            pauseUntilRef.current = Date.now() + RATE_LIMIT_BACKOFF; // Pausar por 5 minutos
            console.warn(`⏸️ Demasiados errores de rate limiting. Pausando actualizaciones por ${RATE_LIMIT_BACKOFF / 60000} minutos.`);
          }
        } else if (result.success) {
          // Si la actualización fue exitosa, resetear contador de errores
          consecutiveErrorsRef.current = 0;
          // Guardar en localStorage después de actualizar precios
          saveAssets();
          // Si no se actualizaron todos, mostrar mensaje informativo
          if (result.updated < assetsToUpdate.length) {
            console.log(`✅ Actualizados ${result.updated}/${assetsToUpdate.length} precios.`);
          }
        } else {
          // Si falló pero no fue rate limiting, incrementar contador
          consecutiveErrorsRef.current++;
          if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
            console.warn(`⚠️ Muchos errores consecutivos. Considerando pausar actualizaciones.`);
          }
        }
      } catch (error) {
        // Si hay un error inesperado (red, etc.)
        consecutiveErrorsRef.current++;
        console.error('❌ Error al actualizar precios desde Finnhub:', error);
        
        // Si hay demasiados errores, pausar actualizaciones
        if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
          isPausedRef.current = true;
          pauseUntilRef.current = Date.now() + RATE_LIMIT_BACKOFF;
          console.warn(`⏸️ Demasiados errores consecutivos. Pausando actualizaciones por ${RATE_LIMIT_BACKOFF / 60000} minutos.`);
        }
      } finally {
        // Siempre marcar que terminamos de actualizar (incluso si hubo error)
        // Esto permite que la próxima actualización pueda ejecutarse
        isUpdatingRef.current = false;
      }
    };

    // ============================================
    // EJECUTAR ACTUALIZACIÓN INICIAL
    // ============================================
    // Actualizar precios inmediatamente cuando el componente se monta
    // (no esperar los primeros 2 minutos)
    updatePrices();

    // ============================================
    // CONFIGURAR INTERVALO PERIÓDICO
    // ============================================
    // setInterval ejecuta updatePrices cada UPDATE_INTERVAL (2 minutos)
    // Guardamos la referencia para poder limpiarlo después
    intervalRef.current = setInterval(updatePrices, UPDATE_INTERVAL);

    // ============================================
    // CLEANUP: LIMPIAR AL DESMONTAR
    // ============================================
    // Esta función se ejecuta cuando:
    // - El componente se desmonta (se cierra la página)
    // - El hook se deshabilita (enabled cambia a false)
    // - Las dependencias del useEffect cambian
    // 
    // Es importante limpiar el intervalo para evitar memory leaks
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current); // Detener el intervalo
        intervalRef.current = null; // Limpiar la referencia
      }
    };
  }, [enabled]); // Este efecto se ejecuta cuando 'enabled' cambia
};

