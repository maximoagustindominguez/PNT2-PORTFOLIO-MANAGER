-- ============================================
-- AGREGAR COLUMNA is_price_estimated A LA TABLA EXISTENTE
-- ============================================
-- IMPORTANTE: Este script solo es necesario si ya creaste la tabla assets
-- ANTES de que se agregara la columna is_price_estimated al script principal.
-- 
-- Si estás creando la tabla por primera vez, usa supabase_migration.sql en su lugar,
-- que ya incluye esta columna.
--
-- Si ya tienes la tabla assets creada sin esta columna, ejecuta este script:
-- 1. Ve a Supabase Dashboard > SQL Editor
-- 2. Copia y pega este script
-- 3. Ejecuta la query

-- Agregar la columna is_price_estimated si no existe
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS is_price_estimated BOOLEAN DEFAULT false;

-- Actualizar los activos existentes que tienen precio 0 para marcarlos como estimados
UPDATE assets 
SET is_price_estimated = true 
WHERE current_price = 0 OR current_price IS NULL;

