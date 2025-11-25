-- ============================================
-- SCRIPT DE CORRECCIÓN: MIGRAR current_price A initial_price
-- ============================================
-- Este script corrige el problema donde la tabla alerts tiene current_price
-- pero el código espera initial_price.
--
-- Ejecuta este script en el SQL Editor de Supabase.

-- Paso 1: Verificar si existe current_price y migrar a initial_price
DO $$
BEGIN
  -- Si existe current_price pero no initial_price, migrar
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'alerts' 
    AND column_name = 'current_price'
  ) AND NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'alerts' 
    AND column_name = 'initial_price'
  ) THEN
    -- Agregar columna initial_price
    ALTER TABLE alerts ADD COLUMN initial_price DECIMAL(18, 8);
    
    -- Copiar valores de current_price a initial_price
    UPDATE alerts SET initial_price = current_price WHERE initial_price IS NULL;
    
    -- Hacer initial_price NOT NULL
    ALTER TABLE alerts ALTER COLUMN initial_price SET NOT NULL;
    
    -- Eliminar columna current_price
    ALTER TABLE alerts DROP COLUMN current_price;
    
    RAISE NOTICE 'Migración completada: current_price -> initial_price';
  END IF;
  
  -- Si existe current_price Y initial_price, eliminar current_price
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'alerts' 
    AND column_name = 'current_price'
  ) AND EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'alerts' 
    AND column_name = 'initial_price'
  ) THEN
    ALTER TABLE alerts DROP COLUMN current_price;
    RAISE NOTICE 'Columna current_price eliminada (ya existe initial_price)';
  END IF;
  
  -- Si no existe initial_price, agregarlo
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'alerts' 
    AND column_name = 'initial_price'
  ) THEN
    ALTER TABLE alerts ADD COLUMN initial_price DECIMAL(18, 8) NOT NULL DEFAULT 0;
    RAISE NOTICE 'Columna initial_price agregada';
  END IF;
END $$;

-- Verificar el resultado
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'alerts' 
AND column_name IN ('current_price', 'initial_price')
ORDER BY column_name;

