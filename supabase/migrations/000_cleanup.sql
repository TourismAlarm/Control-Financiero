-- =============================================
-- CLEANUP SCRIPT
-- Elimina todas las tablas existentes para aplicar el nuevo esquema
-- ⚠️ ADVERTENCIA: Esto eliminará TODOS los datos existentes
-- =============================================

-- Disable RLS to allow dropping tables
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recurring_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS loans DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS loan_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS savings_goals DISABLE ROW LEVEL SECURITY;

-- Drop old tables (if they exist from previous schema)
DROP TABLE IF EXISTS ingresos CASCADE;
DROP TABLE IF EXISTS gastos_fijos CASCADE;
DROP TABLE IF EXISTS gastos_variables CASCADE;
DROP TABLE IF EXISTS deudas CASCADE;
DROP TABLE IF EXISTS prestamos CASCADE;
DROP TABLE IF EXISTS ahorros CASCADE;
DROP TABLE IF EXISTS historial_mensual CASCADE;

-- Drop new tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS loan_payments CASCADE;
DROP TABLE IF EXISTS loans CASCADE;
DROP TABLE IF EXISTS savings_goals CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS recurring_rules CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Cleanup completed successfully. Now run 001_initial_schema.sql';
END $$;
