-- ============================================
-- DESHABILITAR ROW LEVEL SECURITY (RLS)
-- Para desarrollo con NextAuth
-- ============================================
--
-- ⚠️ IMPORTANTE: Solo para desarrollo
-- NO uses esto en producción
--
-- NextAuth no puede usar auth.uid() porque no usa
-- Supabase Auth. Para desarrollo, deshabilitamos RLS.
-- Para producción, necesitarás implementar seguridad
-- a nivel de código o usar custom claims.
-- ============================================

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE loans DISABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS está deshabilitado
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'accounts', 'categories', 'transactions',
    'recurring_rules', 'budgets', 'transfers', 'loans',
    'loan_payments', 'savings_goals'
  )
ORDER BY tablename;

-- Mensaje
SELECT '✅ RLS deshabilitado en todas las tablas (SOLO DESARROLLO)' as resultado;
