-- ACTUALIZACIÓN DEL SCHEMA PARA NUEVOS CAMPOS
-- Este script agrega el campo cuentas_ahorro y mantiene compatibilidad con datos existentes

-- 1. Agregar columna cuentas_ahorro si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_data' AND column_name = 'cuentas_ahorro'
  ) THEN
    ALTER TABLE financial_data
    ADD COLUMN cuentas_ahorro JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 2. Migrar datos de objetivos a cuentas_ahorro (si existen)
-- Solo para registros que tienen objetivos pero no cuentas_ahorro
UPDATE financial_data
SET cuentas_ahorro = objetivos
WHERE objetivos IS NOT NULL
  AND objetivos != '[]'::jsonb
  AND (cuentas_ahorro IS NULL OR cuentas_ahorro = '[]'::jsonb);

-- 3. Verificar la estructura actual
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'financial_data'
  AND column_name IN ('ingresos', 'gastos_fijos', 'gastos_variables', 'deudas', 'objetivos', 'cuentas_ahorro')
ORDER BY ordinal_position;

-- 4. Crear índice para mejorar búsquedas en cuentas_ahorro
CREATE INDEX IF NOT EXISTS idx_financial_data_cuentas_ahorro
ON financial_data USING GIN (cuentas_ahorro);

-- 5. Comentarios para documentar los cambios
COMMENT ON COLUMN financial_data.cuentas_ahorro IS 'Cuentas de ahorro del usuario (reemplazo de objetivos)';

-- VERIFICACIÓN: Mostrar algunos registros con los nuevos campos
SELECT
  user_id,
  mes_actual,
  CASE
    WHEN cuentas_ahorro IS NOT NULL THEN jsonb_array_length(cuentas_ahorro)
    ELSE 0
  END as num_cuentas_ahorro,
  CASE
    WHEN objetivos IS NOT NULL THEN jsonb_array_length(objetivos)
    ELSE 0
  END as num_objetivos_legacy,
  created_at,
  updated_at
FROM financial_data
ORDER BY updated_at DESC
LIMIT 5;
