-- MIGRACIÓN SEGURA - MANEJA DEPENDENCIAS EXISTENTES

-- 1. Primero eliminar cualquier tabla que dependa de users.google_id
DROP TABLE IF EXISTS financial_data CASCADE;
DROP TABLE IF EXISTS monthly_history CASCADE;

-- 2. Eliminar cualquier índice en google_id
DROP INDEX IF EXISTS users_google_id_key;

-- 3. Crear columna temporal
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id_text TEXT;

-- 4. Copiar datos
UPDATE users SET google_id_text = google_id::TEXT WHERE google_id_text IS NULL;

-- 5. Eliminar columna UUID original (ahora sin dependencias)
ALTER TABLE users DROP COLUMN IF EXISTS google_id CASCADE;

-- 6. Renombrar columna nueva
ALTER TABLE users RENAME COLUMN google_id_text TO google_id;

-- 7. Agregar restricciones
ALTER TABLE users ALTER COLUMN google_id SET NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_google_id_unique UNIQUE (google_id);

-- 8. Ahora crear las tablas nuevas con la estructura correcta
CREATE TABLE financial_data (
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

CREATE TABLE monthly_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(google_id) ON DELETE CASCADE,
    historial JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 9. Crear índices
CREATE INDEX idx_financial_data_user_id ON financial_data(user_id);
CREATE INDEX idx_monthly_history_user_id ON monthly_history(user_id);

-- 10. Crear función para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 11. Crear triggers
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

-- 12. Habilitar RLS
ALTER TABLE financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_history ENABLE ROW LEVEL SECURITY;

-- 13. Políticas RLS para financial_data
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

-- 14. Políticas RLS para monthly_history
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
