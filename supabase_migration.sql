-- ============================================
-- MIGRACIÓN DE BASE DE DATOS PARA SUPABASE
-- ============================================
-- Este archivo contiene el SQL necesario para crear la tabla de activos
-- en Supabase. Ejecuta este script en el SQL Editor de Supabase.
--
-- Pasos para ejecutar:
-- 1. Ve a tu proyecto en Supabase Dashboard
-- 2. Abre "SQL Editor" en el menú lateral
-- 3. Crea una nueva query
-- 4. Copia y pega todo el contenido de este archivo
-- 5. Ejecuta la query (botón "Run" o F5)
--
-- ============================================

-- Crear la tabla de activos
CREATE TABLE IF NOT EXISTS assets (
  -- ID único generado automáticamente por Supabase
  id BIGSERIAL PRIMARY KEY,
  
  -- ID del usuario propietario (relacionado con auth.users)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Información básica del activo
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('stock', 'crypto', 'etf', 'bond', 'accion', 'criptomoneda', 'fondo')),
  
  -- Cantidad y precios
  quantity DECIMAL(20, 8) NOT NULL DEFAULT 0,
  purchase_price DECIMAL(20, 8) NOT NULL DEFAULT 0,
  current_price DECIMAL(20, 8) NOT NULL DEFAULT 0,
  
  -- Información de brokers (se guarda como JSON)
  -- Formato: [{"broker": "nombre", "quantity": 10, "purchasePrice": 100}]
  brokers JSONB DEFAULT '[]'::jsonb,
  
  -- Flag para indicar si el precio actual es estimado (por falta de datos en tiempo real)
  -- true = precio estimado, false = precio real obtenido de la API
  is_price_estimated BOOLEAN DEFAULT false,
  
  -- Timestamps automáticos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_symbol ON assets(symbol);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);

-- Crear función para actualizar automáticamente updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY)
-- ============================================
-- Estas políticas aseguran que cada usuario solo pueda ver y modificar
-- sus propios activos. Sin estas políticas, cualquier usuario podría
-- ver los activos de otros usuarios.

-- Habilitar Row Level Security
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver sus propios activos
CREATE POLICY "Users can view their own assets"
  ON assets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Los usuarios solo pueden insertar sus propios activos
CREATE POLICY "Users can insert their own assets"
  ON assets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios solo pueden actualizar sus propios activos
CREATE POLICY "Users can update their own assets"
  ON assets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios solo pueden eliminar sus propios activos
CREATE POLICY "Users can delete their own assets"
  ON assets
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecuta esta query para verificar que la tabla se creó correctamente:
-- SELECT * FROM assets LIMIT 1;
--
-- Si todo está bien, deberías ver una tabla vacía (o con datos si ya los hay).

