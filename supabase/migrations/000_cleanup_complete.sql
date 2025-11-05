-- =============================================
-- LIMPIEZA COMPLETA DE LA BASE DE DATOS
-- Este script elimina TODAS las tablas, políticas e índices existentes
-- =============================================

-- IMPORTANTE: Ejecuta esto ANTES de ejecutar 001_initial_schema.sql

-- Deshabilitar triggers temporalmente para evitar errores
SET session_replication_role = 'replica';

-- Eliminar políticas RLS existentes
DROP POLICY IF EXISTS "Users can delete own savings goals" ON savings_goals;
DROP POLICY IF EXISTS "Users can update own savings goals" ON savings_goals;
DROP POLICY IF EXISTS "Users can create own savings goals" ON savings_goals;
DROP POLICY IF EXISTS "Users can view own savings goals" ON savings_goals;

DROP POLICY IF EXISTS "Users can delete own loan payments" ON loan_payments;
DROP POLICY IF EXISTS "Users can update own loan payments" ON loan_payments;
DROP POLICY IF EXISTS "Users can create own loan payments" ON loan_payments;
DROP POLICY IF EXISTS "Users can view own loan payments" ON loan_payments;

DROP POLICY IF EXISTS "Users can delete own loans" ON loans;
DROP POLICY IF EXISTS "Users can update own loans" ON loans;
DROP POLICY IF EXISTS "Users can create own loans" ON loans;
DROP POLICY IF EXISTS "Users can view own loans" ON loans;

DROP POLICY IF EXISTS "Users can delete own transfers" ON transfers;
DROP POLICY IF EXISTS "Users can update own transfers" ON transfers;
DROP POLICY IF EXISTS "Users can create own transfers" ON transfers;
DROP POLICY IF EXISTS "Users can view own transfers" ON transfers;

DROP POLICY IF EXISTS "Users can delete own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can update own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can create own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can view own budgets" ON budgets;

DROP POLICY IF EXISTS "Users can delete own recurring rules" ON recurring_rules;
DROP POLICY IF EXISTS "Users can update own recurring rules" ON recurring_rules;
DROP POLICY IF EXISTS "Users can create own recurring rules" ON recurring_rules;
DROP POLICY IF EXISTS "Users can view own recurring rules" ON recurring_rules;

DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can create own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;

DROP POLICY IF EXISTS "Users can delete own categories" ON categories;
DROP POLICY IF EXISTS "Users can update own categories" ON categories;
DROP POLICY IF EXISTS "Users can create own categories" ON categories;
DROP POLICY IF EXISTS "Users can view own categories" ON categories;

DROP POLICY IF EXISTS "Users can delete own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can create own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can view own accounts" ON accounts;

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Eliminar triggers
DROP TRIGGER IF EXISTS update_savings_goals_updated_at ON savings_goals;
DROP TRIGGER IF EXISTS update_loan_payments_updated_at ON loan_payments;
DROP TRIGGER IF EXISTS update_loans_updated_at ON loans;
DROP TRIGGER IF EXISTS update_transfers_updated_at ON transfers;
DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
DROP TRIGGER IF EXISTS update_recurring_rules_updated_at ON recurring_rules;
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

-- Eliminar tablas en orden correcto (respetando foreign keys)
DROP TABLE IF EXISTS loan_payments CASCADE;
DROP TABLE IF EXISTS loans CASCADE;
DROP TABLE IF EXISTS savings_goals CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS recurring_rules CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Eliminar tablas antiguas que ya no se usan
DROP TABLE IF EXISTS financial_data CASCADE;
DROP TABLE IF EXISTS monthly_history CASCADE;

-- Eliminar función si existe
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Re-habilitar triggers
SET session_replication_role = 'origin';

-- Mensaje de éxito
DO $$
BEGIN
  RAISE NOTICE '✅ Limpieza completa exitosa. Ahora ejecuta 001_initial_schema.sql';
END $$;
