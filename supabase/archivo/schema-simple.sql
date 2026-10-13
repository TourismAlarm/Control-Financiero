-- SCHEMA SIMPLIFICADO SIN RLS
-- Este schema funciona sin autenticación compleja de Supabase

-- PASO 1: Eliminar tablas existentes si hay problemas
DROP TABLE IF EXISTS financial_data CASCADE;
DROP TABLE IF EXISTS monthly_history CASCADE;
DROP TABLE IF EXISTS loans CASCADE;

-- PASO 2: Crear tabla financial_data SIN foreign key a users
CREATE TABLE financial_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  mes_actual TEXT NOT NULL,
  ingresos JSONB DEFAULT '[]'::jsonb,
  gastos_fijos JSONB DEFAULT '[]'::jsonb,
  gastos_variables JSONB DEFAULT '[]'::jsonb,
  deudas JSONB DEFAULT '[]'::jsonb,
  objetivos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, mes_actual)
);

-- PASO 3: Crear tabla monthly_history SIN foreign key a users
CREATE TABLE monthly_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  historial JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- PASO 4: Crear tabla loans para préstamos
CREATE TABLE loans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  monto_total DECIMAL(12,2) NOT NULL,
  tasa_interes DECIMAL(5,2) NOT NULL,
  plazo_meses INTEGER NOT NULL,
  fecha_inicio DATE NOT NULL,
  tipo_prestamo TEXT,
  descripcion TEXT,
  pagos_realizados JSONB DEFAULT '[]'::jsonb,
  estado TEXT DEFAULT 'activo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_financial_data_user_id ON financial_data(user_id);
CREATE INDEX idx_financial_data_mes ON financial_data(mes_actual);
CREATE INDEX idx_monthly_history_user_id ON monthly_history(user_id);
CREATE INDEX idx_loans_user_id ON loans(user_id);
CREATE INDEX idx_loans_estado ON loans(estado);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_financial_data_updated_at
    BEFORE UPDATE ON financial_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_history_updated_at
    BEFORE UPDATE ON monthly_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at
    BEFORE UPDATE ON loans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- DESHABILITAR Row Level Security para simplificar
-- IMPORTANTE: Esto permite acceso sin restricciones
-- En producción deberías usar RLS con auth.uid() de Supabase Auth
ALTER TABLE financial_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE loans DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas RLS existentes
DROP POLICY IF EXISTS "Users can view their own financial data" ON financial_data;
DROP POLICY IF EXISTS "Users can insert their own financial data" ON financial_data;
DROP POLICY IF EXISTS "Users can update their own financial data" ON financial_data;
DROP POLICY IF EXISTS "Users can delete their own financial data" ON financial_data;

DROP POLICY IF EXISTS "Users can view their own monthly history" ON monthly_history;
DROP POLICY IF EXISTS "Users can insert their own monthly history" ON monthly_history;
DROP POLICY IF EXISTS "Users can update their own monthly history" ON monthly_history;
DROP POLICY IF EXISTS "Users can delete their own monthly history" ON monthly_history;

-- Comentario de verificación
COMMENT ON TABLE financial_data IS 'Datos financieros mensuales del usuario - RLS DESHABILITADO';
COMMENT ON TABLE monthly_history IS 'Historial mensual completo - RLS DESHABILITADO';
COMMENT ON TABLE loans IS 'Gestión de préstamos - RLS DESHABILITADO';
