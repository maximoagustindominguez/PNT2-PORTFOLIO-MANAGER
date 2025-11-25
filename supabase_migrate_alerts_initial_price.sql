-- ============================================
-- MIGRACIÓN: AGREGAR CAMPO initial_price A ALERTAS
-- ============================================
-- Este script actualiza la tabla de alertas para agregar el campo initial_price
-- y migrar los datos existentes de current_price a initial_price.
-- 
-- IMPORTANTE: Si ya ejecutaste el script anterior con initial_price, no necesitas ejecutar este.
-- Solo ejecuta este script si tu tabla de alertas tiene el campo current_price.

-- Verificar si existe la columna current_price (versión antigua)
DO $$
BEGIN
  -- Si existe current_price, migrar a initial_price
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'alerts' 
    AND column_name = 'current_price'
  ) THEN
    -- Agregar columna initial_price si no existe
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'alerts' 
      AND column_name = 'initial_price'
    ) THEN
      ALTER TABLE alerts ADD COLUMN initial_price DECIMAL(18, 8);
      
      -- Migrar datos de current_price a initial_price
      UPDATE alerts SET initial_price = current_price WHERE initial_price IS NULL;
      
      -- Hacer initial_price NOT NULL después de migrar
      ALTER TABLE alerts ALTER COLUMN initial_price SET NOT NULL;
      
      -- Eliminar columna current_price (opcional, comentado por seguridad)
      -- ALTER TABLE alerts DROP COLUMN current_price;
    END IF;
  END IF;
END $$;

-- Si la tabla no existe o no tiene current_price, crear/actualizar con initial_price
-- Esto es para nuevas instalaciones
CREATE TABLE IF NOT EXISTS alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  asset_name TEXT NOT NULL,
  asset_symbol TEXT NOT NULL,
  initial_price DECIMAL(18, 8) NOT NULL, -- Precio del asset cuando se creó la alerta
  alert_price DECIMAL(18, 8) NOT NULL, -- Precio objetivo para disparar la alerta
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Si la tabla ya existe pero no tiene initial_price, agregarlo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'alerts' 
    AND column_name = 'initial_price'
  ) THEN
    ALTER TABLE alerts ADD COLUMN initial_price DECIMAL(18, 8);
    
    -- Si existe current_price, copiar los valores
    IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'alerts' 
      AND column_name = 'current_price'
    ) THEN
      UPDATE alerts SET initial_price = current_price WHERE initial_price IS NULL;
    END IF;
    
    -- Hacer NOT NULL después de migrar
    ALTER TABLE alerts ALTER COLUMN initial_price SET NOT NULL;
  END IF;
END $$;

