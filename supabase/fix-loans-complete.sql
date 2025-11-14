-- =============================================
-- FIX LOANS TABLE SCHEMA - SCRIPT COMPLETO
-- Este script arregla TODAS las columnas y restricciones de una vez
-- =============================================

-- PASO 1: Eliminar restricciones NOT NULL de columnas inglesas antiguas
-- Esto permite que el código español funcione sin llenar las columnas inglesas

ALTER TABLE loans
ALTER COLUMN type DROP NOT NULL;

ALTER TABLE loans
ALTER COLUMN contact_name DROP NOT NULL;

ALTER TABLE loans
ALTER COLUMN principal_amount DROP NOT NULL;

ALTER TABLE loans
ALTER COLUMN outstanding_amount DROP NOT NULL;

ALTER TABLE loans
ALTER COLUMN start_date DROP NOT NULL;

-- PASO 2: Agregar valores por defecto a columnas inglesas para evitar errores
ALTER TABLE loans
ALTER COLUMN type SET DEFAULT 'borrowed';

ALTER TABLE loans
ALTER COLUMN contact_name SET DEFAULT '';

ALTER TABLE loans
ALTER COLUMN principal_amount SET DEFAULT 0;

ALTER TABLE loans
ALTER COLUMN outstanding_amount SET DEFAULT 0;

ALTER TABLE loans
ALTER COLUMN start_date SET DEFAULT CURRENT_DATE;

-- PASO 3: Agregar TODAS las columnas en español que necesita el código

-- 3.1. Agregar nombre (nombre del préstamo)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS nombre TEXT;

-- 3.2. Agregar monto_total (monto inicial del préstamo)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS monto_total DECIMAL(12,2);

-- 3.3. Agregar tasa_interes (tasa de interés anual)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS tasa_interes DECIMAL(5,2);

-- 3.4. Agregar plazo_meses (duración del préstamo en meses)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS plazo_meses INTEGER;

-- 3.5. Agregar fecha_inicio (fecha de inicio del préstamo)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS fecha_inicio DATE;

-- 3.6. Agregar tipo_prestamo (tipo: personal, hipoteca, auto, etc.)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS tipo_prestamo TEXT;

-- 3.7. Agregar descripcion (descripción/notas del préstamo)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS descripcion TEXT;

-- 3.8. Agregar pagos_realizados (array JSON de pagos realizados)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS pagos_realizados JSONB DEFAULT '[]'::jsonb;

-- 3.9. Agregar estado (estado: activo, completado, etc.)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'activo';

-- 3.10. Agregar cuota_mensual (cuota mensual del préstamo)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS cuota_mensual DECIMAL(12,2);

-- 3.11. Agregar amortizaciones_extras (array JSON de amortizaciones anticipadas)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS amortizaciones_extras JSONB DEFAULT '[]'::jsonb;

-- PASO 4: Agregar comentarios para documentación
COMMENT ON COLUMN loans.nombre IS 'Nombre descriptivo del préstamo';
COMMENT ON COLUMN loans.monto_total IS 'Monto inicial total del préstamo';
COMMENT ON COLUMN loans.tasa_interes IS 'Tasa de interés anual (%)';
COMMENT ON COLUMN loans.plazo_meses IS 'Duración del préstamo en meses';
COMMENT ON COLUMN loans.fecha_inicio IS 'Fecha de inicio del préstamo';
COMMENT ON COLUMN loans.tipo_prestamo IS 'Tipo de préstamo (personal, hipoteca, auto, etc.)';
COMMENT ON COLUMN loans.descripcion IS 'Descripción o notas adicionales del préstamo';
COMMENT ON COLUMN loans.pagos_realizados IS 'Array JSON de pagos realizados [{fecha, monto, numero_pago}]';
COMMENT ON COLUMN loans.estado IS 'Estado del préstamo (activo, completado, cancelado)';
COMMENT ON COLUMN loans.cuota_mensual IS 'Cuota mensual que se paga por el préstamo';
COMMENT ON COLUMN loans.amortizaciones_extras IS 'Array JSON de amortizaciones anticipadas [{fecha, monto}]';

-- PASO 5: Verificar el esquema final
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'loans'
ORDER BY ordinal_position;

-- RESULTADO ESPERADO:
-- Deberías ver TODAS estas columnas:
-- - Columnas inglesas antiguas (type, contact_name, principal_amount, etc.) - ahora NULLABLE
-- - Columnas españolas nuevas (nombre, monto_total, tasa_interes, plazo_meses, fecha_inicio,
--   tipo_prestamo, descripcion, pagos_realizados, estado, cuota_mensual, amortizaciones_extras)
