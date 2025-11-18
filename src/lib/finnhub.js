/**
 * SERVICIO DE FINNHUB API
 * 
 * Este archivo contiene todas las funciones necesarias para interactuar con la API de Finnhub,
 * que nos proporciona precios en tiempo real de acciones, criptomonedas y otros activos financieros.
 * 
 * Documentación oficial: https://finnhub.io/docs/api
 * 
 * ¿Qué hace este servicio?
 * - Obtiene precios actuales de acciones (AAPL, MSFT, etc.)
 * - Obtiene precios actuales de criptomonedas (BTC, ETH, etc.)
 * - Maneja errores y límites de la API (rate limiting)
 * - Reintenta automáticamente si hay errores temporales
 */

// URL base de la API de Finnhub (versión 1)
const FINNHUB_API_URL = 'https://finnhub.io/api/v1';

// ============================================
// CONSTANTES PARA MANEJO DE RATE LIMITING
// ============================================
// Rate limiting: cuando hacemos demasiadas peticiones a la API, esta nos bloquea temporalmente
// Estas constantes controlan cómo manejamos esos límites

const MAX_RETRIES = 3; // Máximo número de veces que intentaremos obtener un precio si falla
const INITIAL_RETRY_DELAY = 1000; // 1 segundo de espera antes del primer reintento
const RATE_LIMIT_DELAY = 60000; // 60 segundos de espera si la API nos dice que estamos haciendo demasiadas peticiones
const BATCH_DELAY = 500; // 500 milisegundos de pausa entre grupos de activos para no sobrecargar la API

/**
 * OBTIENE EL PRECIO ACTUAL DE UNA ACCIÓN
 * 
 * Esta función hace una petición HTTP a la API de Finnhub para obtener el precio actual
 * de una acción (por ejemplo, Apple = AAPL, Microsoft = MSFT).
 * 
 * ¿Cómo funciona?
 * 1. Construye la URL de la API con el símbolo de la acción y la clave de API
 * 2. Hace una petición HTTP (fetch) a Finnhub
 * 3. Si hay errores, reintenta automáticamente hasta 3 veces
 * 4. Devuelve el precio o null si no se pudo obtener
 * 
 * @param {string} symbol - Símbolo de la acción (ej: "AAPL" para Apple, "MSFT" para Microsoft)
 * @param {string} apiKey - Clave de API de Finnhub (necesaria para autenticarse)
 * @param {number} retryCount - Número de veces que ya hemos intentado obtener este precio (para reintentos)
 * @returns {Promise<{price: number|null, rateLimited: boolean}>} 
 *   - price: El precio actual de la acción, o null si no se pudo obtener
 *   - rateLimited: true si la API nos bloqueó por hacer demasiadas peticiones
 */
export const getStockQuote = async (symbol, apiKey, retryCount = 0) => {
  try {
    // Construir la URL completa de la API de Finnhub
    // Ejemplo: https://finnhub.io/api/v1/quote?symbol=AAPL&token=mi_clave_api
    const response = await fetch(
      `${FINNHUB_API_URL}/quote?symbol=${symbol}&token=${apiKey}`
    );
    
    // CÓDIGO 429 = "Too Many Requests" = La API nos está bloqueando por hacer demasiadas peticiones
    if (response.status === 429) {
      // Si aún no hemos intentado demasiadas veces, esperamos y reintentamos
      if (retryCount < MAX_RETRIES) {
        // Esperamos más tiempo cada vez que reintentamos (60s, 120s, 180s)
        const delay = RATE_LIMIT_DELAY * (retryCount + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        // Llamamos a la función de nuevo (recursión) con un contador aumentado
        return getStockQuote(symbol, apiKey, retryCount + 1);
      }
      // Si ya intentamos demasiadas veces, devolvemos null y marcamos que hubo rate limiting
      return { price: null, rateLimited: true };
    }
    
    // Si la respuesta no fue exitosa (código diferente de 200-299)
    if (!response.ok) {
      // Errores 500+ son errores del servidor (pueden ser temporales)
      if (response.status >= 500 && retryCount < MAX_RETRIES) {
        // Backoff exponencial: esperamos 1s, luego 2s, luego 4s antes de reintentar
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return getStockQuote(symbol, apiKey, retryCount + 1);
      }
      // Si no es un error del servidor o ya intentamos demasiado, lanzamos un error
      throw new Error(`Error al obtener cotización: ${response.status}`);
    }
    
    // Convertir la respuesta de JSON a un objeto JavaScript
    const data = await response.json();
    
    // La API de Finnhub devuelve el precio en dos campos posibles:
    // - 'c' = precio actual (current price)
    // - 'pc' = precio de cierre previo (previous close)
    // Usamos 'c' si está disponible, si no, usamos 'pc' como respaldo
    const price = data.c || data.pc || null;
    return { price, rateLimited: false };
  } catch (error) {
    // Si hay un error de red u otro tipo de error
    if (retryCount < MAX_RETRIES && !error.message.includes('429')) {
      // Reintentamos con backoff exponencial (1s, 2s, 4s)
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      return getStockQuote(symbol, apiKey, retryCount + 1);
    }
    // Si ya intentamos demasiado o es un error que no podemos recuperar, lo registramos
    console.error(`Error al obtener precio de ${symbol}:`, error);
    return { price: null, rateLimited: false };
  }
};

/**
 * OBTIENE EL PRECIO ACTUAL DE UNA CRIPTOMONEDA
 * 
 * Similar a getStockQuote, pero para criptomonedas. La diferencia es que Finnhub
 * requiere un formato especial para criptomonedas: "BINANCE:SYMBOLUSDT"
 * 
 * Ejemplos:
 * - BTC se convierte en "BINANCE:BTCUSDT"
 * - ETH se convierte en "BINANCE:ETHUSDT"
 * 
 * @param {string} symbol - Símbolo de la criptomoneda (ej: "BTC", "ETH", "DOGE")
 * @param {string} apiKey - Clave de API de Finnhub
 * @param {number} retryCount - Número de intentos realizados (para reintentos automáticos)
 * @returns {Promise<{price: number|null, rateLimited: boolean}>} 
 *   - price: Precio actual de la criptomoneda en USDT, o null si falló
 *   - rateLimited: true si la API nos bloqueó por demasiadas peticiones
 */
export const getCryptoQuote = async (symbol, apiKey, retryCount = 0) => {
  try {
    // Finnhub requiere que las criptomonedas se consulten con el formato:
    // "BINANCE:SYMBOLUSDT" donde SYMBOL es el símbolo de la cripto
    // Ejemplo: BTC -> "BINANCE:BTCUSDT", ETH -> "BINANCE:ETHUSDT"
    const finnhubSymbol = `BINANCE:${symbol}USDT`;
    
    // Hacer la petición a la API con el símbolo formateado
    const response = await fetch(
      `${FINNHUB_API_URL}/quote?symbol=${finnhubSymbol}&token=${apiKey}`
    );
    
    // Manejar rate limiting (código 429)
    if (response.status === 429) {
      if (retryCount < MAX_RETRIES) {
        // Esperar progresivamente más tiempo: 60s, 120s, 180s
        const delay = RATE_LIMIT_DELAY * (retryCount + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        // Reintentar llamando a la función de nuevo
        return getCryptoQuote(symbol, apiKey, retryCount + 1);
      }
      return { price: null, rateLimited: true };
    }
    
    // Manejar otros errores HTTP
    if (!response.ok) {
      // Errores 500+ son del servidor y pueden ser temporales
      if (response.status >= 500 && retryCount < MAX_RETRIES) {
        // Backoff exponencial: 1s, 2s, 4s
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return getCryptoQuote(symbol, apiKey, retryCount + 1);
      }
      throw new Error(`Error al obtener cotización: ${response.status}`);
    }
    
    // Convertir respuesta JSON a objeto JavaScript
    const data = await response.json();
    
    // Extraer el precio: 'c' (actual) o 'pc' (cierre previo) como respaldo
    const price = data.c || data.pc || null;
    return { price, rateLimited: false };
  } catch (error) {
    // Manejar errores de red u otros errores
    if (retryCount < MAX_RETRIES && !error.message.includes('429')) {
      // Reintentar con backoff exponencial
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      return getCryptoQuote(symbol, apiKey, retryCount + 1);
    }
    console.error(`Error al obtener precio de criptomoneda ${symbol}:`, error);
    return { price: null, rateLimited: false };
  }
};

/**
 * OBTIENE EL PRECIO DE UN ACTIVO SEGÚN SU TIPO
 * 
 * Esta es una función "router" que decide qué función usar según el tipo de activo.
 * Es más fácil llamar a esta función que recordar si usar getStockQuote o getCryptoQuote.
 * 
 * Tipos soportados:
 * - "accion": Acciones de empresas (AAPL, MSFT, etc.)
 * - "criptomoneda": Criptomonedas (BTC, ETH, etc.)
 * - "fondo": Fondos indexados (SPY, QQQ, etc.) - se tratan como acciones
 * - "bond": Bonos - se intentan obtener como acciones (puede no funcionar para todos)
 * 
 * @param {string} symbol - Símbolo del activo (ej: "AAPL", "BTC", "SPY")
 * @param {string} type - Tipo de activo: "accion", "criptomoneda", "fondo", o "bond"
 * @param {string} apiKey - Clave de API de Finnhub
 * @returns {Promise<{price: number|null, rateLimited: boolean}>} 
 *   - price: Precio del activo o null si no se pudo obtener
 *   - rateLimited: true si hubo problemas de rate limiting
 */
export const getAssetPrice = async (symbol, type, apiKey) => {
  // Validar que tengamos la clave de API
  if (!apiKey) {
    console.warn('API key de Finnhub no configurada');
    return { price: null, rateLimited: false };
  }

  // Decidir qué función usar según el tipo de activo
  // Tipos de Finnhub: stock, crypto, etf, bond
  if (type === 'crypto' || type === 'criptomoneda') {
    // Las criptomonedas necesitan un formato especial
    return await getCryptoQuote(symbol, apiKey);
  } else if (type === 'stock' || type === 'accion' || type === 'etf' || type === 'fondo') {
    // Acciones, ETFs y fondos se obtienen de la misma manera
    return await getStockQuote(symbol, apiKey);
  } else if (type === 'bond') {
    // Los bonos se intentan obtener como acciones
    // Nota: Finnhub puede no tener todos los bonos, esto es una aproximación
    return await getStockQuote(symbol, apiKey);
  }
  
  // Si el tipo no es reconocido, devolver null
  return { price: null, rateLimited: false };
};

/**
 * ACTUALIZA LOS PRECIOS DE MÚLTIPLES ACTIVOS
 * 
 * Esta función actualiza los precios de varios activos a la vez, procesándolos en grupos
 * (lotes) para no sobrecargar la API de Finnhub. Es más eficiente que actualizar uno por uno.
 * 
 * ¿Por qué procesar en lotes?
 * - La API de Finnhub tiene límites de cuántas peticiones podemos hacer por minuto
 * - Si hacemos todas las peticiones a la vez, podemos exceder el límite
 * - Procesando en grupos de 5 con pausas entre grupos, respetamos los límites
 * 
 * Flujo:
 * 1. Divide los activos en grupos de 5
 * 2. Para cada grupo, obtiene los precios en paralelo (más rápido)
 * 3. Espera 500ms antes del siguiente grupo (para no sobrecargar)
 * 4. Si detecta rate limiting, se detiene inmediatamente
 * 5. Actualiza cada precio en el store usando el callback
 * 
 * @param {Array} assets - Array de objetos con {id, symbol, type}
 *   - id: ID único del activo en nuestra base de datos
 *   - symbol: Símbolo del activo (ej: "AAPL", "BTC")
 *   - type: Tipo de activo ("accion", "criptomoneda", etc.)
 * @param {Function} updatePriceCallback - Función que se llama para cada precio obtenido
 *   - Recibe: (assetId, price) donde assetId es el ID y price es el nuevo precio
 *   - Esta función actualiza el precio en el store de Zustand
 * @param {string} apiKey - Clave de API de Finnhub
 * @returns {Promise<{success: boolean, rateLimited: boolean, updated: number, failed: number}>}
 *   - success: true si al menos un precio se actualizó correctamente
 *   - rateLimited: true si la API nos bloqueó por demasiadas peticiones
 *   - updated: Cantidad de precios que se actualizaron exitosamente
 *   - failed: Cantidad de precios que no se pudieron obtener
 */
export const updateAssetPrices = async (assets, updatePriceCallback, apiKey) => {
  // Validar que tengamos la clave de API
  if (!apiKey) {
    console.warn('API key de Finnhub no configurada');
    return { success: false, rateLimited: false, updated: 0, failed: 0 };
  }

  // ============================================
  // PROCESAMIENTO EN LOTES (BATCH PROCESSING)
  // ============================================
  // En lugar de procesar todos los activos a la vez, los dividimos en grupos
  // Esto nos ayuda a respetar los límites de la API
  
  const BATCH_SIZE = 5; // Procesar 5 activos a la vez
  let updatedCount = 0; // Contador de precios actualizados exitosamente
  let failedCount = 0;  // Contador de precios que fallaron
  let rateLimited = false; // Flag para saber si nos bloquearon
  
  // Recorrer los activos en grupos de BATCH_SIZE
  for (let i = 0; i < assets.length; i += BATCH_SIZE) {
    // Obtener el siguiente grupo de activos (slice corta el array)
    // Ejemplo: si i=0 y BATCH_SIZE=5, obtenemos assets[0] a assets[4]
    const batch = assets.slice(i, i + BATCH_SIZE);
    
    // Crear un array de "promesas" (peticiones asíncronas) para este grupo
    // Promise.all ejecuta todas las peticiones en paralelo (más rápido)
    const promises = batch.map(async (asset) => {
      // Obtener el precio de este activo específico
      const result = await getAssetPrice(asset.symbol, asset.type, apiKey);
      
      // Si la API nos bloqueó por rate limiting
      if (result.rateLimited) {
        rateLimited = true;
        failedCount++;
        return; // Salir de esta iteración
      }
      
      // Si obtuvimos un precio válido (no null y mayor que 0)
      if (result.price !== null && result.price > 0) {
        // Llamar al callback para actualizar el precio en el store
        // Esto actualiza el precio en el estado global de la aplicación
        updatePriceCallback(asset.id, result.price);
        updatedCount++;
      } else {
        // Si no se pudo obtener el precio, incrementar contador de fallos
        failedCount++;
      }
    });
    
    // Esperar a que todas las peticiones de este grupo terminen
    // Promise.all espera a que todas las promesas se resuelvan
    await Promise.all(promises);
    
    // Pausa entre grupos para no sobrecargar la API
    // Solo si no es el último grupo (no hay necesidad de esperar después del último)
    if (i + BATCH_SIZE < assets.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
    
    // Si detectamos rate limiting en este grupo, detener todo el proceso
    // No tiene sentido continuar si la API nos está bloqueando
    if (rateLimited) {
      console.warn('⚠️ Rate limit detectado. Deteniendo actualización de precios.');
      break; // Salir del bucle for
    }
  }
  
  // Devolver un resumen de lo que pasó
  return {
    success: updatedCount > 0, // true si al menos uno se actualizó
    rateLimited, // si hubo problemas de rate limiting
    updated: updatedCount, // cuántos se actualizaron
    failed: failedCount // cuántos fallaron
  };
};

/**
 * BUSCAR SÍMBOLOS EN FINNHUB
 * 
 * Esta función busca símbolos de activos en Finnhub basándose en una consulta de texto.
 * Útil para autocompletado cuando el usuario está escribiendo un ticker.
 * 
 * La API de Finnhub tiene un endpoint de búsqueda que devuelve resultados que coinciden
 * con la consulta, incluyendo acciones, criptomonedas, fondos, etc.
 * 
 * @param {string} query - Texto de búsqueda (ej: "AAPL", "Apple", "BTC")
 * @param {string} apiKey - Clave de API de Finnhub
 * @returns {Promise<Array>} Array de objetos con {symbol, description, type, displaySymbol}
 */
export const searchSymbols = async (query, apiKey) => {
  if (!apiKey || !query || query.trim().length < 1) {
    return [];
  }

  try {
    // Endpoint de búsqueda de Finnhub
    // Devuelve hasta 8 resultados que coinciden con la consulta
    const response = await fetch(
      `${FINNHUB_API_URL}/search?q=${encodeURIComponent(query.trim())}&token=${apiKey}`
    );

    if (!response.ok) {
      // Si hay error, devolver array vacío (no es crítico para la búsqueda)
      return [];
    }

    const data = await response.json();
    
    // La API devuelve un objeto con 'result' que contiene un array de resultados
    // Cada resultado tiene: symbol, description, displaySymbol, type
    return data.result || [];
  } catch (error) {
    console.error('Error al buscar símbolos:', error);
    return [];
  }
};

/**
 * DETECTAR TIPO DE ACTIVO BASADO EN SÍMBOLO
 * 
 * Intenta determinar el tipo de activo basándose en el símbolo o resultado de búsqueda.
 * Los tipos deben coincidir con los que maneja Finnhub: stock, crypto, etf, bond
 * 
 * Reglas:
 * - Si el símbolo tiene formato "BINANCE:XXXUSDT" → crypto
 * - Si la descripción contiene palabras clave de cripto → crypto
 * - Si el símbolo es conocido como cripto (BTC, ETH, etc.) → crypto
 * - Si el tipo del resultado es "ETF" o "Mutual Fund" → etf
 * - Si el tipo es "Bond" → bond
 * - Por defecto → stock
 * 
 * @param {string} symbol - Símbolo del activo
 * @param {Object} searchResult - Resultado de búsqueda de Finnhub (opcional)
 * @returns {string} Tipo de activo: "stock", "crypto", "etf", o "bond"
 */
export const detectAssetType = (symbol, searchResult = null) => {
  // Lista de símbolos conocidos de criptomonedas
  const cryptoSymbols = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'DOGE', 'DOT', 'MATIC', 'AVAX', 'LINK', 'UNI', 'ATOM', 'ETC', 'LTC', 'BCH', 'XLM', 'ALGO', 'VET', 'FIL', 'TRX', 'EOS', 'AAVE', 'MKR', 'COMP', 'YFI', 'SUSHI', 'SNX', 'CRV', '1INCH'];
  
  const upperSymbol = symbol.toUpperCase();
  
  // Si el símbolo tiene formato BINANCE:XXXUSDT, es criptomoneda
  if (upperSymbol.includes('BINANCE:') || upperSymbol.endsWith('USDT')) {
    return 'crypto';
  }
  
  // Si el símbolo está en la lista de criptos conocidas
  if (cryptoSymbols.includes(upperSymbol)) {
    return 'crypto';
  }
  
  // Si tenemos un resultado de búsqueda, usar su información
  if (searchResult) {
    const type = searchResult.type?.toUpperCase() || '';
    const description = (searchResult.description || '').toUpperCase();
    
    // Detectar ETFs
    if (type.includes('ETF') || type.includes('MUTUAL FUND') || type.includes('FUND') || 
        description.includes('ETF') || description.includes('FUND')) {
      return 'etf';
    }
    
    // Detectar bonos
    if (type.includes('BOND') || description.includes('BOND') || description.includes('TREASURY')) {
      return 'bond';
    }
    
    // Detectar criptomonedas por descripción
    if (description.includes('CRYPTO') || description.includes('BITCOIN') || 
        description.includes('ETHEREUM') || description.includes('DIGITAL CURRENCY')) {
      return 'crypto';
    }
  }
  
  // Por defecto, asumir que es una acción (stock)
  return 'stock';
};

/**
 * OBTENER DATOS HISTÓRICOS (CANDLESTICK) DE UN ACTIVO
 * 
 * Esta función obtiene datos históricos de precios de un activo desde Finnhub.
 * Los datos se devuelven en formato candlestick (velas) que incluye:
 * - Precio de apertura (open)
 * - Precio máximo (high)
 * - Precio mínimo (low)
 * - Precio de cierre (close)
 * - Volumen
 * - Timestamp
 * 
 * Temporalidades disponibles:
 * - '1', '5', '15', '30', '60' (minutos)
 * - 'D' (diario)
 * - 'W' (semanal)
 * - 'M' (mensual)
 * 
 * @param {string} symbol - Símbolo del activo (ej: "AAPL", "BTC")
 * @param {string} resolution - Temporalidad ('1', '5', '15', '30', '60', 'D', 'W', 'M')
 * @param {number} from - Timestamp de inicio (Unix timestamp en segundos)
 * @param {number} to - Timestamp de fin (Unix timestamp en segundos)
 * @param {string} apiKey - Clave de API de Finnhub
 * @param {string} type - Tipo de activo ('stock', 'crypto', 'etf', 'bond')
 * @returns {Promise<{data: Array|null, error: string|null}>} 
 *   - data: Array de objetos con {t, o, h, l, c, v} (timestamp, open, high, low, close, volume)
 *   - error: Mensaje de error si falló
 */
export const getStockCandles = async (symbol, resolution, from, to, apiKey, type = 'stock') => {
  if (!apiKey) {
    return { data: null, error: 'API key de Finnhub no configurada' };
  }

  try {
    // Para criptomonedas, usar el formato BINANCE:SYMBOLUSDT
    const finnhubSymbol = (type === 'crypto' || type === 'criptomoneda') 
      ? `BINANCE:${symbol}USDT` 
      : symbol;

    const response = await fetch(
      `${FINNHUB_API_URL}/stock/candle?symbol=${encodeURIComponent(finnhubSymbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`
    );

    if (!response.ok) {
      if (response.status === 429) {
        return { data: null, error: 'Rate limit excedido. Por favor intenta más tarde.' };
      }
      return { data: null, error: `Error al obtener datos: ${response.status}` };
    }

    const result = await response.json();

    // Finnhub devuelve {s: 'ok', t: [...], o: [...], h: [...], l: [...], c: [...], v: [...]}
    // donde 's' es el status ('ok' o 'no_data')
    if (result.s === 'no_data' || !result.t || result.t.length === 0) {
      return { data: null, error: 'No hay datos disponibles para este período' };
    }

    // Convertir los arrays en objetos más fáciles de usar
    const data = result.t.map((timestamp, index) => ({
      timestamp: timestamp * 1000, // Convertir a milisegundos para JavaScript Date
      open: result.o[index],
      high: result.h[index],
      low: result.l[index],
      close: result.c[index],
      volume: result.v[index],
    }));

    return { data, error: null };
  } catch (error) {
    console.error('Error al obtener datos históricos:', error);
    return { data: null, error: error.message || 'Error al obtener datos históricos' };
  }
};

/**
 * CALCULAR TIMESTAMPS PARA UNA TEMPORALIDAD
 * 
 * Calcula los timestamps 'from' y 'to' basándose en la temporalidad seleccionada.
 * 
 * @param {string} timeframe - Temporalidad ('1D', '1W', '1M', '3M', '6M', '1Y', 'ALL')
 * @returns {{from: number, to: number, resolution: string}}
 *   - from: Timestamp de inicio (Unix en segundos)
 *   - to: Timestamp de fin (Unix en segundos)
 *   - resolution: Resolución para Finnhub ('D', 'W', 'M')
 */
export const getTimeframeParams = (timeframe) => {
  const now = Math.floor(Date.now() / 1000); // Timestamp actual en segundos
  let from;
  let resolution = 'D'; // Por defecto, diario

  switch (timeframe) {
    case '1D':
      from = now - (1 * 24 * 60 * 60); // 1 día atrás
      resolution = '60'; // 1 hora para 1 día
      break;
    case '1W':
      from = now - (7 * 24 * 60 * 60); // 7 días atrás
      resolution = 'D'; // Diario para 1 semana
      break;
    case '1M':
      from = now - (30 * 24 * 60 * 60); // 30 días atrás
      resolution = 'D'; // Diario
      break;
    case '3M':
      from = now - (90 * 24 * 60 * 60); // 90 días atrás
      resolution = 'D'; // Diario
      break;
    case '6M':
      from = now - (180 * 24 * 60 * 60); // 180 días atrás
      resolution = 'D'; // Diario
      break;
    case '1Y':
      from = now - (365 * 24 * 60 * 60); // 365 días atrás
      resolution = 'W'; // Semanal para 1 año
      break;
    case 'ALL':
      from = now - (5 * 365 * 24 * 60 * 60); // 5 años atrás (máximo razonable)
      resolution = 'M'; // Mensual para todo
      break;
    default:
      from = now - (30 * 24 * 60 * 60); // Por defecto, 30 días
      resolution = 'D';
  }

  return { from, to: now, resolution };
};

