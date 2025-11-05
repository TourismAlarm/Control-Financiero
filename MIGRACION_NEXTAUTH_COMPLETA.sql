-- ============================================
-- MIGRACIÓN COMPLETA: Configurar BD para NextAuth con Google OAuth
-- ============================================
--
-- Este script:
-- 1. Crea tabla 'users' para NextAuth si no existe
-- 2. Elimina referencias a auth.users (Supabase Auth)
-- 3. Cambia todos los user_id de UUID a TEXT
-- 4. Actualiza las foreign keys para apuntar a users.google_id
--
-- ============================================

-- PASO 1: Crear tabla users si no existe
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  google_id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASO 2: Eliminar foreign keys existentes que apuntan a auth.users
-- ============================================

-- Primero, necesitamos drop todas las foreign key constraints
-- que referencian auth.users(id)

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE accounts
  DROP CONSTRAINT IF EXISTS accounts_user_id_fkey;

ALTER TABLE categories
  DROP CONSTRAINT IF EXISTS categories_user_id_fkey;

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;

ALTER TABLE recurring_rules
  DROP CONSTRAINT IF EXISTS recurring_rules_user_id_fkey;

ALTER TABLE budgets
  DROP CONSTRAINT IF EXISTS budgets_user_id_fkey;

ALTER TABLE transfers
  DROP CONSTRAINT IF EXISTS transfers_user_id_fkey;

ALTER TABLE loans
  DROP CONSTRAINT IF EXISTS loans_user_id_fkey;

ALTER TABLE loan_payments
  DROP CONSTRAINT IF EXISTS loan_payments_user_id_fkey;

ALTER TABLE savings_goals
  DROP CONSTRAINT IF EXISTS savings_goals_user_id_fkey;

-- PASO 3: Cambiar tipos de datos de UUID a TEXT
-- ============================================

-- PROFILES
ALTER TABLE profiles
  ALTER COLUMN id TYPE TEXT;

-- ACCOUNTS
ALTER TABLE accounts
  ALTER COLUMN user_id TYPE TEXT;

-- CATEGORIES
ALTER TABLE categories
  ALTER COLUMN user_id TYPE TEXT;

-- TRANSACTIONS
ALTER TABLE transactions
  ALTER COLUMN user_id TYPE TEXT;

-- RECURRING_RULES
ALTER TABLE recurring_rules
  ALTER COLUMN user_id TYPE TEXT;

-- BUDGETS
ALTER TABLE budgets
  ALTER COLUMN user_id TYPE TEXT;

-- TRANSFERS
ALTER TABLE transfers
  ALTER COLUMN user_id TYPE TEXT;

-- LOANS
ALTER TABLE loans
  ALTER COLUMN user_id TYPE TEXT;

-- LOAN_PAYMENTS
ALTER TABLE loan_payments
  ALTER COLUMN user_id TYPE TEXT;

-- SAVINGS_GOALS
ALTER TABLE savings_goals
  ALTER COLUMN user_id TYPE TEXT;

-- PASO 4: Crear nuevas foreign keys apuntando a users(google_id)
-- ============================================

-- PROFILES.id → users.google_id
ALTER TABLE profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES users(google_id) ON DELETE CASCADE;

-- ACCOUNTS.user_id → users.google_id
ALTER TABLE accounts
  ADD CONSTRAINT accounts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(google_id) ON DELETE CASCADE;

-- CATEGORIES.user_id → users.google_id
ALTER TABLE categories
  ADD CONSTRAINT categories_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(google_id) ON DELETE CASCADE;

-- TRANSACTIONS.user_id → users.google_id
ALTER TABLE transactions
  ADD CONSTRAINT transactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(google_id) ON DELETE CASCADE;

-- RECURRING_RULES.user_id → users.google_id
ALTER TABLE recurring_rules
  ADD CONSTRAINT recurring_rules_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(google_id) ON DELETE CASCADE;

-- BUDGETS.user_id → users.google_id
ALTER TABLE budgets
  ADD CONSTRAINT budgets_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(google_id) ON DELETE CASCADE;

-- TRANSFERS.user_id → users.google_id
ALTER TABLE transfers
  ADD CONSTRAINT transfers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(google_id) ON DELETE CASCADE;

-- LOANS.user_id → users.google_id
ALTER TABLE loans
  ADD CONSTRAINT loans_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(google_id) ON DELETE CASCADE;

-- LOAN_PAYMENTS.user_id → users.google_id
ALTER TABLE loan_payments
  ADD CONSTRAINT loan_payments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(google_id) ON DELETE CASCADE;

-- SAVINGS_GOALS.user_id → users.google_id
ALTER TABLE savings_goals
  ADD CONSTRAINT savings_goals_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(google_id) ON DELETE CASCADE;

-- PASO 5: Actualizar RLS policies para usar users(google_id)
-- ============================================

-- Las policies existentes usan auth.uid() que viene de Supabase Auth
-- Con NextAuth, necesitamos una estrategia diferente

-- Opción 1: Deshabilitar RLS temporalmente para desarrollo
-- (NO RECOMENDADO PARA PRODUCCIÓN)

-- DESCOMENTAR SOLO PARA DESARROLLO:
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE recurring_rules DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE transfers DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE loans DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE loan_payments DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE savings_goals DISABLE ROW LEVEL SECURITY;

-- Opción 2: Configurar RLS para usar un custom claim o JWT
-- (Requiere configuración adicional en NextAuth)
-- Esto se hará en un paso posterior si es necesario

-- PASO 6: Trigger para updated_at en users
-- ============================================

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- PASO 7: Verificación
-- ============================================

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('id', 'user_id', 'google_id')
  AND table_name IN (
    'users', 'profiles', 'accounts', 'categories',
    'transactions', 'recurring_rules', 'budgets',
    'transfers', 'loans', 'loan_payments', 'savings_goals'
  )
ORDER BY table_name, column_name;

-- Mensaje de confirmación
SELECT '✅ Migración completada: Base de datos configurada para NextAuth con Google OAuth' as resultado;
