-- =============================================
-- FIX LOANS TABLE SCHEMA - SCRIPT FINAL COMPLETO
-- Este script elimina CHECK constraints y arregla TODO
-- =============================================

-- PASO 1: Eliminar CHECK constraints que causan problemas
-- Primero listamos los constraints para ver sus nombres
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Iterar sobre todos los CHECK constraints de la tabla loans
    FOR constraint_record IN
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'loans'
        AND constraint_type = 'CHECK'
    LOOP
        -- Eliminar cada constraint
        EXECUTE format('ALTER TABLE loans DROP CONSTRAINT IF EXISTS %I', constraint_record.constraint_name);
        RAISE NOTICE 'Eliminado constraint: %', constraint_record.constraint_name;
    END LOOP;
END $$;

-- PASO 2: Eliminar restricciones NOT NULL de columnas inglesas antiguas
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

-- PASO 3: Agregar valores por defecto a columnas inglesas
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

-- PASO 4: Agregar TODAS las columnas en español que necesita el código

ALTER TABLE loans
ADD COLUMN IF NOT EXISTS nombre TEXT;

ALTER TABLE loans
ADD COLUMN IF NOT EXISTS monto_total DECIMAL(12,2);

ALTER TABLE loans
ADD COLUMN IF NOT EXISTS tasa_interes DECIMAL(5,2);

ALTER TABLE loans
ADD COLUMN IF NOT EXISTS plazo_meses INTEGER;

ALTER TABLE loans
ADD COLUMN IF NOT EXISTS fecha_inicio DATE;

ALTER TABLE loans
ADD COLUMN IF NOT EXISTS tipo_prestamo TEXT;

ALTER TABLE loans
ADD COLUMN IF NOT EXISTS descripcion TEXT;

ALTER TABLE loans
ADD COLUMN IF NOT EXISTS pagos_realizados JSONB DEFAULT '[]'::jsonb;

ALTER TABLE loans
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'activo';

ALTER TABLE loans
ADD COLUMN IF NOT EXISTS cuota_mensual DECIMAL(12,2);

ALTER TABLE loans
ADD COLUMN IF NOT EXISTS amortizaciones_extras JSONB DEFAULT '[]'::jsonb;

-- PASO 5: Agregar comentarios para documentación
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

-- PASO 6: Verificar el esquema final
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'loans'
ORDER BY ordinal_position;

-- PASO 7: Verificar que no hay CHECK constraints
SELECT
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'loans'
ORDER BY constraint_type, constraint_name;
