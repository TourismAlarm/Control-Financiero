-- Agregar columna cuota_mensual a la tabla loans
-- Ejecuta este comando en tu panel de Supabase SQL Editor

ALTER TABLE loans
ADD COLUMN IF NOT EXISTS cuota_mensual DECIMAL(12,2);

-- Comentario para documentar
COMMENT ON COLUMN loans.cuota_mensual IS 'Cuota mensual que se paga por el préstamo';
