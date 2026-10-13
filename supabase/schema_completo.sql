-- =====================================================================
-- CONTROL FINANCIERO · ESQUEMA COMPLETO PARA UNA BASE DE DATOS NUEVA
-- =====================================================================
-- Pégalo entero en Supabase → SQL Editor → Run.
-- Es idempotente: si lo ejecutas dos veces no rompe nada.
--
-- Seguridad: RLS activado en TODAS las tablas y SIN políticas. Así la
-- clave pública (anon) no puede leer ni escribir nada; solo el servidor
-- de la app (service_role) accede, y siempre filtrando por tu usuario.
--
-- Usuario = id de Google (TEXT), porque el login es con NextAuth.
-- =====================================================================

-- ─── Utilidades ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ─── Perfiles ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,                      -- id de Google
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,                           -- también sirve para detectar traspasos a tu nombre
  avatar_url TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  financial_month_start_day INTEGER NOT NULL DEFAULT 1
    CHECK (financial_month_start_day BETWEEN 1 AND 28),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Cuentas ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'credit_card', 'savings', 'investment')),
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

-- ─── Categorías ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT,
  color TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, name, type)
);
CREATE INDEX IF NOT EXISTS idx_categories_user_type ON categories(user_id, type);

-- ─── Reglas recurrentes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recurring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_occurrence DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_rules(user_id);

-- ─── Conexiones bancarias (Enable Banking) ───────────────────────────
CREATE TABLE IF NOT EXISTS bank_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'enablebanking',
  aspsp_name TEXT NOT NULL,
  aspsp_country TEXT NOT NULL,
  session_id TEXT NOT NULL,
  account_uid TEXT NOT NULL,
  iban TEXT,
  account_name TEXT,
  currency TEXT DEFAULT 'EUR',
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  valid_until TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'error', 'revoked')),
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, account_uid)
);
CREATE INDEX IF NOT EXISTS idx_bank_links_user ON bank_links(user_id);

CREATE TABLE IF NOT EXISTS bank_auth_states (
  state TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  aspsp_name TEXT NOT NULL,
  aspsp_country TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Movimientos ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  tags TEXT[],
  recurring_rule_id UUID REFERENCES recurring_rules(id) ON DELETE SET NULL,
  external_id TEXT,                         -- id del banco / CSV, para no duplicar
  -- regular = gasto/ingreso real · internal_transfer = entre tus cuentas
  -- investment = a exchange/broker · debt_payment = pago de deuda
  kind TEXT NOT NULL DEFAULT 'regular'
    CHECK (kind IN ('regular', 'internal_transfer', 'investment', 'debt_payment')),
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'csv', 'bank_sync', 'recurring')),
  counterparty TEXT,
  bank_link_id UUID REFERENCES bank_links(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_kind ON transactions(user_id, kind);
CREATE INDEX IF NOT EXISTS idx_transactions_user_external
  ON transactions(user_id, external_id) WHERE external_id IS NOT NULL;

-- ─── Presupuestos ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2000),
  alert_threshold NUMERIC(5, 2) NOT NULL DEFAULT 80 CHECK (alert_threshold BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, category_id, month, year)
);

-- ─── Traspasos manuales ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  to_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (from_account_id <> to_account_id)
);

-- ─── Deudas y préstamos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('borrowed', 'lent')),
  contact_name TEXT NOT NULL,               -- acreedor: se usa para detectar los pagos
  principal_amount NUMERIC(15, 2) NOT NULL CHECK (principal_amount > 0),
  outstanding_amount NUMERIC(15, 2) NOT NULL CHECK (outstanding_amount >= 0),
  interest_rate NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (interest_rate >= 0),
  start_date DATE NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id);

CREATE TABLE IF NOT EXISTS loan_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  principal_paid NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (principal_paid >= 0),
  interest_paid NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (interest_paid >= 0),
  payment_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan ON loan_payments(loan_id);

-- ─── Metas de ahorro ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  target_amount NUMERIC(15, 2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  target_date DATE,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(50),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Avisos de los agentes ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_user_unread
  ON agent_notifications(user_id, is_read) WHERE is_read = false;

-- ─── updated_at automático ───────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'accounts', 'categories', 'recurring_rules', 'bank_links', 'transactions',
    'budgets', 'transfers', 'loans', 'loan_payments', 'savings_goals'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON %1$I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON %1$I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t
    );
  END LOOP;
END $$;

-- ─── Categorías por defecto al crear el perfil ───────────────────────
-- Incluye los nombres que usa la categorización automática.
CREATE OR REPLACE FUNCTION create_categories_for_user(p_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO categories (user_id, name, type, icon, color, is_system) VALUES
    (p_user_id, 'Alimentación',         'expense', '🛒', '#EF4444', true),
    (p_user_id, 'Restaurantes',         'expense', '🍽️', '#F97316', true),
    (p_user_id, 'Transporte',           'expense', '🚗', '#FB923C', true),
    (p_user_id, 'Vivienda',             'expense', '🏠', '#FBBF24', true),
    (p_user_id, 'Telecomunicaciones',   'expense', '📱', '#A3E635', true),
    (p_user_id, 'Salud',                'expense', '🏥', '#4ADE80', true),
    (p_user_id, 'Educación',            'expense', '📚', '#34D399', true),
    (p_user_id, 'Entretenimiento',      'expense', '🎮', '#2DD4BF', true),
    (p_user_id, 'Compras',              'expense', '🛍️', '#22D3EE', true),
    (p_user_id, 'Viajes',               'expense', '✈️', '#38BDF8', true),
    (p_user_id, 'Mascotas',             'expense', '🐕', '#60A5FA', true),
    (p_user_id, 'Seguros',              'expense', '🛡️', '#818CF8', true),
    (p_user_id, 'Comisiones bancarias', 'expense', '🏦', '#A78BFA', true),
    (p_user_id, 'Impuestos',            'expense', '📋', '#C084FC', true),
    (p_user_id, 'Regalos',              'expense', '🎁', '#E879F9', true),
    (p_user_id, 'Otros Gastos',         'expense', '📌', '#F87171', true),
    (p_user_id, 'Nómina',               'income',  '💼', '#10B981', true),
    (p_user_id, 'Freelance',            'income',  '💻', '#14B8A6', true),
    (p_user_id, 'Inversiones',          'income',  '📈', '#0EA5E9', true),
    (p_user_id, 'Intereses',            'income',  '💰', '#6366F1', true),
    (p_user_id, 'Regalos',              'income',  '🎁', '#A855F7', true),
    (p_user_id, 'Otros Ingresos',       'income',  '📌', '#10B981', true)
  ON CONFLICT (user_id, name, type) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_create_categories_on_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM create_categories_for_user(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_create_categories_on_profile ON profiles;
CREATE TRIGGER auto_create_categories_on_profile
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_create_categories_on_profile();

-- ─── Seguridad: RLS activado y sin políticas en todo ─────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'accounts', 'categories', 'recurring_rules', 'bank_links', 'bank_auth_states',
    'transactions', 'budgets', 'transfers', 'loans', 'loan_payments', 'savings_goals',
    'agent_notifications'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Las funciones solo las usa el trigger
REVOKE EXECUTE ON FUNCTION create_categories_for_user(TEXT) FROM PUBLIC, anon, authenticated;
