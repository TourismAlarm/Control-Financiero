-- =============================================
-- 012 · Deudas automáticas y reglas de categoría aprendidas
-- =============================================
-- Idempotente. Pégalo en Supabase → SQL Editor → Run.

-- Deudas: cómo aparece en el banco, cuota, día de cobro y cuenta
ALTER TABLE loans ADD COLUMN IF NOT EXISTS bank_match TEXT;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS monthly_payment NUMERIC(15, 2);
ALTER TABLE loans ADD COLUMN IF NOT EXISTS payment_day INTEGER;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loans_payment_day_check') THEN
    ALTER TABLE loans ADD CONSTRAINT loans_payment_day_check CHECK (payment_day IS NULL OR payment_day BETWEEN 1 AND 31);
  END IF;
END $$;

-- Cada pago de una deuda puede venir de un movimiento del banco (sin duplicar)
ALTER TABLE loan_payments ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_loan_payments_transaction
  ON loan_payments(transaction_id) WHERE transaction_id IS NOT NULL;

-- Y cada movimiento sabe a qué deuda pertenece
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS loan_id UUID REFERENCES loans(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_loan ON transactions(loan_id) WHERE loan_id IS NOT NULL;

-- Sugerencias de deuda que has dicho que no son deuda
CREATE TABLE IF NOT EXISTS dismissed_suggestions (
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, key)
);
ALTER TABLE dismissed_suggestions ENABLE ROW LEVEL SECURITY;

-- Reglas de categoría que la app aprende cuando corriges un movimiento
CREATE TABLE IF NOT EXISTS category_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,                    -- texto normalizado del comercio
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, pattern)
);
ALTER TABLE category_rules ENABLE ROW LEVEL SECURITY;
