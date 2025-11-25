-- ============================================
-- RECREAR TABLA DE ALERTAS DESDE CERO
-- ============================================
-- Este script elimina la tabla de alertas y la recrea con la estructura correcta.
-- 
-- ⚠️ ADVERTENCIA: Esto eliminará TODAS las alertas existentes.
-- Si tienes alertas importantes, haz un backup primero.
--
-- Ejecuta este script en el SQL Editor de Supabase.

-- Eliminar la tabla de alertas (esto eliminará todos los datos)
DROP TABLE IF EXISTS alerts CASCADE;

-- Recrear la tabla con la estructura correcta
CREATE TABLE alerts (
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

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_asset_id ON alerts(asset_id);
CREATE INDEX idx_alerts_is_active ON alerts(is_active);

-- Políticas de seguridad (RLS - Row Level Security)
-- Habilitar RLS en la tabla
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Política para alerts: los usuarios solo pueden ver/editar sus propias alertas
CREATE POLICY "Users can view their own alerts"
  ON alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alerts"
  ON alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
  ON alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts"
  ON alerts FOR DELETE
  USING (auth.uid() = user_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en alerts
CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verificar que la tabla se creó correctamente
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'alerts' 
ORDER BY ordinal_position;

