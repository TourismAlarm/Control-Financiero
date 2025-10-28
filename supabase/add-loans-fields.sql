-- Agregar columnas faltantes a la tabla loans
-- Ejecuta este comando en tu panel de Supabase SQL Editor

-- Agregar cuota_mensual si no existe
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS cuota_mensual DECIMAL(12,2);

-- Agregar amortizaciones_extras para guardar amortizaciones anticipadas
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS amortizaciones_extras JSONB DEFAULT '[]'::jsonb;

-- Comentarios para documentar
COMMENT ON COLUMN loans.cuota_mensual IS 'Cuota mensual que se paga por el préstamo';
COMMENT ON COLUMN loans.amortizaciones_extras IS 'Array de amortizaciones anticipadas realizadas';

-- Verificar las columnas
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'loans'
ORDER BY ordinal_position;
