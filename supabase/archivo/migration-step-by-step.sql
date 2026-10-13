-- MIGRACIÓN PASO A PASO PARA CONVERTIR google_id DE UUID A TEXT
-- Ejecuta estos comandos UNO POR UNO en orden

-- PASO 1: Crear una columna temporal para almacenar google_id como texto
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id_text TEXT;

-- PASO 2: Copiar los valores de google_id (UUID) a google_id_text (TEXT)
UPDATE users SET google_id_text = google_id::TEXT WHERE google_id_text IS NULL;

-- PASO 3: Eliminar la columna original google_id
ALTER TABLE users DROP COLUMN google_id;

-- PASO 4: Renombrar google_id_text a google_id
ALTER TABLE users RENAME COLUMN google_id_text TO google_id;

-- PASO 5: Hacer google_id NOT NULL y UNIQUE
ALTER TABLE users ALTER COLUMN google_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_key ON users(google_id);

-- PASO 6: Crear tabla financial_data
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

-- PASO 7: Crear tabla monthly_history
CREATE TABLE IF NOT EXISTS monthly_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(google_id) ON DELETE CASCADE,
  historial JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- PASO 8: Crear índices
CREATE INDEX IF NOT EXISTS idx_financial_data_user_id ON financial_data(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_history_user_id ON monthly_history(user_id);

-- PASO 9: Crear función para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- PASO 10: Crear triggers
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

-- PASO 11: Habilitar RLS
ALTER TABLE financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_history ENABLE ROW LEVEL SECURITY;

-- PASO 12: Políticas RLS para financial_data
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

-- PASO 13: Políticas RLS para monthly_history
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
