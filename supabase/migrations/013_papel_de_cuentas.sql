-- =============================================
-- 013 · Papel de cada cuenta
-- =============================================
-- Idempotente. Pégalo en Supabase → SQL Editor → Run.
--
-- Cada cuenta tiene un papel en tu sistema de dinero:
--   daily   → Día a día   (BBVA: cobras la nómina y gastas)
--   debts   → Deudas      (Revolut: desde aquí se pagan las cuotas)
--   savings → Ahorro      (Trade Republic: ahorro e inversión)
--   home    → Casa        (Revolut conjunta: alquiler y gastos de casa, a medias)
-- Sin papel (NULL) la app intenta adivinarlo por el nombre del banco.

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS role TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounts_role_check') THEN
    ALTER TABLE accounts
      ADD CONSTRAINT accounts_role_check CHECK (role IS NULL OR role IN ('daily', 'debts', 'savings', 'home'));
  END IF;
END $$;
