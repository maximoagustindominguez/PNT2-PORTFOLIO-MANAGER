# Portfolio Manager (PNT2)

Aplicación web construida con **React 19 + Vite** para gestionar carteras de inversiones. Combina un backend-as-a-service (Supabase) para autenticación y persistencia, una capa de estado global con **Zustand** y datos de mercado en tiempo casi real con la API de **Finnhub**. El objetivo del proyecto es que cualquier persona que abra el código de cero pueda entender rápidamente cómo está organizado y qué hace cada pieza.

---

## Requisitos previos

- Node.js ≥ 18
- Cuenta en [Supabase](https://supabase.com/) con un proyecto creado
- API Key gratuita de [Finnhub](https://finnhub.io/)

### Variables de entorno (`.env`)

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anon
VITE_FINNHUB_API_KEY=tu_api_key_de_finnhub
```

> Tené en cuenta que Supabase usa autenticación por email/contraseña. Si tu proyecto exige confirmación de email, el registro (`signUp`) quedará pendiente hasta que el usuario valide el correo.

### Scripts disponibles

| Comando          | Descripción                                |
| ---------------- | ------------------------------------------ |
| `npm install`    | Instala dependencias                       |
| `npm run dev`    | Levanta Vite en modo desarrollo            |
| `npm run build`  | Genera artefactos listos para producción   |
| `npm run preview`| Sirve el build localmente                  |
| `npm run lint`   | Ejecuta Biome (lint)                       |

---

## Arquitectura a alto nivel

```
src/
├── app/                # Definición de rutas (`AppRoutes.jsx`)
├── components/         # UI reutilizable (Header, Dashboard, Summary…)
├── hooks/              # Lógica compartida (auth, assets, Finnhub…)
├── lib/                # Integraciones externas (Supabase, Finnhub)
├── pages/              # Páginas de alto nivel (Home, Login, Dashboard)
├── store/              # Zustand stores (sesión + activos)
└── constants/         # Constantes globales (símbolo de moneda, título)
```

- **Estado global:** `src/store/sessionStore.js` (usuario autenticado) y `src/store/assetsStore.js` (activos, cálculos y sincronización).
- **Servicios externos:** `src/lib/supabase.js` expone el cliente y valida la configuración; `src/lib/assetsService.js` encapsula todos los CRUD contra la tabla `assets`; `src/lib/finnhub.js` centraliza las llamadas a la API financiera.
- **Hooks clave:** `useAuth`, `useAuthListener`, `useAssets`, `useFinnhubPrices`, `useModal`.

---

## Flujo de autenticación (login / register / logout)

### 1. Comportamiento de alto nivel

1. El usuario navega a `/login` y completa email + password en `src/pages/Login.jsx`.
2. `useAuth()` (definido en `src/hooks/useAuth.js`) decide si llama a `supabase.auth.signInWithPassword` o `supabase.auth.signUp`.
3. Supabase devuelve un objeto `user`; se guarda en `useSessionStore`.
4. `useNavigate` redirige al Dashboard y `AuthProvider` mantiene la sesión sincronizada.

### 2. Piezas involucradas

- `AuthProvider` (`src/components/AuthProvider.jsx`) monta `useAuthListener`. Este hook escucha `supabase.auth.onAuthStateChange`, carga los activos del usuario cuando entra y limpia todo cuando se desconecta.
- `ProtectedRoute` (`src/components/ProtectedRoute.jsx`) protege `/dashboard`; si no hay `user` en el store, fuerza un `Navigate` a `/login`.
- `useAuth` contiene:
  - `logIn`: valida variables VITE_, hace la llamada y persiste el usuario.
  - `signUp`: registra, guarda el usuario si la política de Supabase lo permite y redirige.
  - `logOut`: invoca `supabase.auth.signOut`, limpia el store y vuelve a `/login`.

> **Tip:** si ves errores sobre `Failed to fetch`, casi siempre es porque las variables de Supabase o Finnhub no están cargadas o hay problemas de red.

---

## Gestión de activos y sincronización con Supabase

### Tabla `assets`

Los scripts `supabase_migration.sql` y `supabase_add_column.sql` en la raíz crean/actualizan la tabla que persiste la cartera. Campos clave: `name`, `symbol`, `type`, `quantity`, `purchase_price`, `current_price`, `brokers` (JSON) e `is_price_estimated`.

### Capa de servicio (`src/lib/assetsService.js`)

- `loadAssetsFromSupabase(userId)` trae todos los registros del usuario y los transforma a camelCase.
- `saveAssetToSupabase(asset, userId)` inserta un nuevo activo y devuelve el registro con el `id` que generó Supabase.
- `updateAssetInSupabase`, `deleteAssetFromSupabase` y `syncAllAssetsToSupabase` manejan actualizaciones puntuales, eliminaciones y sincronizaciones masivas respectivamente.

### Store de activos (`src/store/assetsStore.js`)

Centraliza toda la lógica de negocio:

- **Ciclo de vida:** `loadAssets(userId)` se dispara justo después de que `useAuthListener` detecta una sesión. `clearAssets` se ejecuta al hacer logout.
- **Mutaciones:** `addAssetQuantity`, `reduceAssetQuantity`, `resetAsset`, `deleteAsset`, `updateAssetBrokers`, `addNewAsset`. Siempre hacen _optimistic updates_ y luego sincronizan con Supabase; si algo falla, revierten el cambio.
- **Cálculos:** `calculateTotalValue`, `calculateTotalInvestment`, `calculateTotalProfit` (usados vía `useAssets` para exponer `totalValue`, `totalInvestment`, `totalProfit`).
- **Precios en vivo:** `updateCurrentPrice` es el entry point que usa `useFinnhubPrices`.

### Hook `useAssets` (`src/hooks/useAssets.js`)

Envuelve al store para entregar:

- Array de activos + todas las funciones públicas de negocio.
- Totales memorizados con `useMemo`.
- Permite a `pages/Dashboard.jsx` concentrarse en componer la UI sin conocer los detalles de Zustand.

---

## Actualización automática de precios (Finnhub)

- `useFinnhubPrices` (`src/hooks/useFinnhubPrices.js`) se monta en el Dashboard.
- Cada 2 minutos:
  1. Obtiene los activos con `quantity > 0`.
  2. Llama a `updateAssetPrices` (`src/lib/finnhub.js`) que procesa en lotes de 5 símbolos, respeta límites y reintenta con _backoff_.
  3. Aplica `updateCurrentPrice(assetId, nuevoPrecio)`; si el precio vuelve a ser válido, quita el flag `isPriceEstimated` en Supabase.
- Si Finnhub devuelve `429` (rate limit) se pausa 5 minutos (`RATE_LIMIT_BACKOFF`) y muestra logs descriptivos en consola.

> Toda la interacción con Finnhub usa la variable `VITE_FINNHUB_API_KEY`; si no está presente, la app levanta, pero no se actualizarán los precios ni funcionará la búsqueda de tickers.

---

## Dashboard y vistas de activos

### `pages/Dashboard.jsx`

Conecta todas las piezas:

- Monta `Header`, `Summary` y `components/Dashboard/Dashboard`.
- Pasa handlers de `useAssets` (comprar, vender, resetear, borrar, agregar, actualizar brokers).
- Mantiene un estado `triggerAddModal` para que el botón _“Agregar Asset”_ del header abra el modal centralizado.

### `Header`

- Muestra el disclaimer del proyecto, el logo dinámico (`src/assets/images`) y las acciones del usuario.
- El botón “Agregar Asset” dispara el modal global sin importar en qué vista esté el usuario.

### `components/Dashboard/Dashboard.jsx`

- Ofrece dos vistas:
  - **Cards:** renderiza un `AssetCard` por activo, con menús de acciones, modales de detalle y gráfico individual (line chart vía Recharts).
  - **Table:** muestra `AssetTable` con ordenamiento, vista consolidada y exportaciones.
- El modal de alta de activos:
  - Autocompleta tickers vía `searchSymbols`.
  - Detecta tipo (`detectAssetType`) y permite cargar múltiples brokers, calculando PPC ponderado.
  - Consulta el precio en vivo (si hay API key); si no, marca `isPriceEstimated` y deja el activo listo para que lo actualice Finnhub más adelante.

### `AssetCard` y `AssetTable`

- **AssetCard:** ideal para gestión detallada. Incluye:
  - Alertas visuales si el precio es estimado.
  - Modales para editar brokers/cantidades, ver detalles, gráficos históricos (usa `getStockCandles` + `LineChart`).
  - Acciones rápidas para resetear/eliminar.
- **AssetTable:** vista consolidada con ordenamiento dinámico y exportación del portfolio completo (Excel, PDF, JPG) usando `xlsx`, `jspdf`/`jspdf-autotable` y `html2canvas`.

---

## Gráfico torta y exportaciones (Summary)

El componente `src/components/Summary/Summary.jsx` concentra todo lo relacionado al gráfico tipo torta y sus descargas.

### Datos y lógica

- `profitByType` agrupa cada activo según `getTypeLabel(type)` para normalizar etiquetas (Acciones, Cripto, ETF, Bonos, etc.)
- Calcula por tipo:
  - Valor de mercado (`value`: cantidad × precio actual).
  - Ganancia/pérdida absoluta y bandera `isProfit`.
  - Participación porcentual respecto al total del portfolio.

### Visualización

- Usa `recharts` (`PieChart`, `Pie`, `Cell`) dentro de un modal que se abre con “Ver detalle”.
- Incluye `Tooltip` y `Legend` customizados que muestran tanto el valor nominal como el porcentaje del portfolio.
- El `chartRef` guarda el contenedor para reutilizarlo cuando se exporta.

### Exportaciones disponibles

Desde el botón “Exportar gráfico” se abre un modal con tres opciones:

1. **Excel (`exportToExcel`)**  
   Construye un array con `Tipo`, `Ganancia/Pérdida`, `Valor Absoluto`, `%` y si está en ganancia o pérdida. Usa `XLSX.utils.json_to_sheet`.

2. **PDF (`exportToPDF`)**  
   - Genera un PDF con jsPDF.
   - Inserta una tabla usando `autoTable`.
   - Captura el gráfico renderizado con `html2canvas` y lo embebe como imagen debajo de la tabla.

3. **JPG (`exportToJPG`)**  
   - Captura solo el gráfico.
   - Exporta un `.jpg` listo para compartir.

> Importante: para que la captura del gráfico funcione correctamente, el modal debe estar visible (de lo contrario `html2canvas` no encuentra el nodo referenciado).

---

## Flujo completo (de extremo a extremo)

1. **Ingreso:** `/login` gestiona login y registro con Supabase.
2. **Sincronización inicial:** `AuthProvider` detecta la sesión, cargar `assets` desde Supabase y los deja listos en el store.
3. **Dashboard:**
   - `Summary` muestra métricas agregadas + acceso al gráfico torta y exportes.
   - `Dashboard` permite alternar entre Cards y Tabla.
   - `AssetCard` habilita editar brokers, ver gráficos históricos y acciones sobre cada activo.
   - `AssetTable` ofrece el consolidado ordenable/exportable.
4. **Actualizaciones en vivo:** `useFinnhubPrices` refresca precios cada 2 minutos, marcando o desmarcando el estado “estimado”.
5. **Persistencia:** toda mutación llama al servicio de Supabase correspondiente para mantener los datos en la nube.

---

## Troubleshooting rápido

- **“Supabase no está configurado” en console:** revisá `.env` y reiniciá `npm run dev`.
- **Precios con badge “Estimado”:** Finnhub no devolvió valor (API key faltante, rate limit o símbolo desconocido). El flag se quita automáticamente cuando llega un precio válido.
- **No funciona la búsqueda de tickers:** asegúrate de tener `VITE_FINNHUB_API_KEY` y que la consulta tenga al menos 2 caracteres.
- **Exports no descargan nada:** la mayoría de los navegadores bloquean pop-ups si la acción no se origina por un `click`. Todas las exportaciones se disparan con botones, así que no debería ocurrir salvo que el navegador bloquee descargas manualmente.

---

## Próximos pasos sugeridos

- Agregar tests de integración sobre los hooks (`useAuth`, `useAssets`) para validar flujos críticos.
- Internacionalización de textos (actualmente hardcodeados en español).
- Conectar `AssetCard` con endpoints reales para “Analizar activo / Noticias / Alertas”.
- Mejorar la gestión de errores cuando la tabla `assets` no está creada (hoy solo muestra mensajes en consola).

---

Con esto deberías poder navegar el código sin perderte: identifica qué parte toca cada archivo, cómo fluyen los datos desde Supabase hasta la UI y dónde se generan/exportan las visualizaciones clave del dashboard. ¡Buen hacking! 💻📈


