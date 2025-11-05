-- ============================================
-- FIX: Cambiar user_id de UUID a TEXT
-- Razón: NextAuth devuelve Google IDs como string, no UUIDs
-- ============================================

-- 1. PROFILES
ALTER TABLE profiles
  ALTER COLUMN id TYPE TEXT,
  ALTER COLUMN user_id TYPE TEXT;

-- 2. ACCOUNTS
ALTER TABLE accounts
  ALTER COLUMN user_id TYPE TEXT;

-- 3. TRANSACTIONS
ALTER TABLE transactions
  ALTER COLUMN user_id TYPE TEXT;

-- 4. CATEGORIES
ALTER TABLE categories
  ALTER COLUMN user_id TYPE TEXT;

-- 5. BUDGETS
ALTER TABLE budgets
  ALTER COLUMN user_id TYPE TEXT;

-- 6. RECURRING_RULES
ALTER TABLE recurring_rules
  ALTER COLUMN user_id TYPE TEXT;

-- 7. SAVINGS_GOALS
ALTER TABLE savings_goals
  ALTER COLUMN user_id TYPE TEXT;

-- 8. TRANSFERS
ALTER TABLE transfers
  ALTER COLUMN user_id TYPE TEXT;

-- 9. LOANS
ALTER TABLE loans
  ALTER COLUMN user_id TYPE TEXT;

-- 10. LOAN_PAYMENTS
ALTER TABLE loan_payments
  ALTER COLUMN user_id TYPE TEXT;

-- Verificación
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE column_name = 'user_id'
  AND table_schema = 'public'
ORDER BY table_name;

-- Mensaje
SELECT '✅ user_id cambiado de UUID a TEXT en todas las tablas' as resultado;
