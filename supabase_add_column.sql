-- ============================================
-- AGREGAR COLUMNA is_price_estimated A LA TABLA EXISTENTE
-- ============================================
-- Si ya tienes la tabla assets creada, ejecuta este script para agregar
-- la nueva columna is_price_estimated.
--
-- Pasos:
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

