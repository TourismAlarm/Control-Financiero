-- =============================================
-- 011 · Sincronización bancaria automática (Enable Banking)
-- =============================================
-- Idempotente: se puede ejecutar varias veces sin romper nada.
-- Solo el servidor (service_role) toca estas tablas, por eso tienen RLS
-- activado y ninguna política: el cliente anónimo no puede leerlas.

-- 1. Cuentas bancarias vinculadas (una fila por cuenta autorizada)
CREATE TABLE IF NOT EXISTS bank_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'enablebanking',
  aspsp_name TEXT NOT NULL,          -- p.ej. 'BBVA', 'Revolut', 'Trade Republic'
  aspsp_country TEXT NOT NULL,       -- 'ES', 'LT', 'DE'...
  session_id TEXT NOT NULL,          -- sesión de Enable Banking
  account_uid TEXT NOT NULL,         -- id de la cuenta en Enable Banking
  iban TEXT,
  account_name TEXT,
  currency TEXT DEFAULT 'EUR',
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL, -- cuenta de la app
  valid_until TIMESTAMPTZ,           -- caducidad del permiso del banco
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'error', 'revoked')),
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, account_uid)
);

CREATE INDEX IF NOT EXISTS idx_bank_links_user ON bank_links(user_id);
ALTER TABLE bank_links ENABLE ROW LEVEL SECURITY;

-- 2. Estados pendientes de autorización (protección CSRF del callback)
CREATE TABLE IF NOT EXISTS bank_auth_states (
  state TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  aspsp_name TEXT NOT NULL,
  aspsp_country TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bank_auth_states ENABLE ROW LEVEL SECURITY;

-- 3. Columnas nuevas en transactions
--    kind: separa el gasto real de los movimientos entre tus propias cuentas,
--    las aportaciones a inversión y los pagos de deudas.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'regular';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS counterparty TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS bank_link_id UUID REFERENCES bank_links(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_kind_check'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_kind_check
      CHECK (kind IN ('regular', 'internal_transfer', 'investment', 'debt_payment'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_source_check'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_source_check
      CHECK (source IN ('manual', 'csv', 'bank_sync', 'recurring'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_user_external
  ON transactions(user_id, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_user_kind
  ON transactions(user_id, kind);
