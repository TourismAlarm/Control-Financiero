-- Tabla para datos financieros del usuario
CREATE TABLE IF NOT EXISTS financial_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(google_id) ON DELETE CASCADE,
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

-- Tabla para historial mensual
CREATE TABLE IF NOT EXISTS monthly_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(google_id) ON DELETE CASCADE,
  historial JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_financial_data_user_id ON financial_data(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_history_user_id ON monthly_history(user_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
DROP TRIGGER IF EXISTS update_financial_data_updated_at ON financial_data;
CREATE TRIGGER update_financial_data_updated_at
    BEFORE UPDATE ON financial_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_monthly_history_updated_at ON monthly_history;
CREATE TRIGGER update_monthly_history_updated_at
    BEFORE UPDATE ON monthly_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security (RLS)
ALTER TABLE financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para financial_data
DROP POLICY IF EXISTS "Users can view their own financial data" ON financial_data;
CREATE POLICY "Users can view their own financial data"
    ON financial_data FOR SELECT
    USING (user_id = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Users can insert their own financial data" ON financial_data;
CREATE POLICY "Users can insert their own financial data"
    ON financial_data FOR INSERT
    WITH CHECK (user_id = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Users can update their own financial data" ON financial_data;
CREATE POLICY "Users can update their own financial data"
    ON financial_data FOR UPDATE
    USING (user_id = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Users can delete their own financial data" ON financial_data;
CREATE POLICY "Users can delete their own financial data"
    ON financial_data FOR DELETE
    USING (user_id = current_setting('app.current_user_id', true));

-- Políticas RLS para monthly_history
DROP POLICY IF EXISTS "Users can view their own monthly history" ON monthly_history;
CREATE POLICY "Users can view their own monthly history"
    ON monthly_history FOR SELECT
    USING (user_id = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Users can insert their own monthly history" ON monthly_history;
CREATE POLICY "Users can insert their own monthly history"
    ON monthly_history FOR INSERT
    WITH CHECK (user_id = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Users can update their own monthly history" ON monthly_history;
CREATE POLICY "Users can update their own monthly history"
    ON monthly_history FOR UPDATE
    USING (user_id = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Users can delete their own monthly history" ON monthly_history;
CREATE POLICY "Users can delete their own monthly history"
    ON monthly_history FOR DELETE
    USING (user_id = current_setting('app.current_user_id', true));
