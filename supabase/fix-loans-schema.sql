-- =============================================
-- FIX LOANS TABLE SCHEMA
-- Agregar TODAS las columnas faltantes en español para el sistema de préstamos
-- =============================================

-- 1. Agregar nombre (nombre del préstamo)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS nombre TEXT;

-- 2. Agregar monto_total (monto inicial del préstamo)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS monto_total DECIMAL(12,2);

-- 3. Agregar tasa_interes (tasa de interés anual)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS tasa_interes DECIMAL(5,2);

-- 4. Agregar plazo_meses (duración del préstamo en meses)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS plazo_meses INTEGER;

-- 5. Agregar fecha_inicio (fecha de inicio del préstamo)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS fecha_inicio DATE;

-- 6. Agregar tipo_prestamo (tipo: personal, hipoteca, auto, etc.)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS tipo_prestamo TEXT;

-- 7. Agregar descripcion (descripción/notas del préstamo)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS descripcion TEXT;

-- 8. Agregar pagos_realizados (array JSON de pagos realizados)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS pagos_realizados JSONB DEFAULT '[]'::jsonb;

-- 9. Agregar estado (estado: activo, completado, etc.)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'activo';

-- 10. Agregar cuota_mensual (cuota mensual del préstamo)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS cuota_mensual DECIMAL(12,2);

-- 11. Agregar amortizaciones_extras (array JSON de amortizaciones anticipadas)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS amortizaciones_extras JSONB DEFAULT '[]'::jsonb;

-- 12. Agregar comentarios para documentación
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

-- 13. Verificar que las columnas se agregaron correctamente
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'loans'
ORDER BY ordinal_position;
