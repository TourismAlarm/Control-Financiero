-- =============================================
-- 015 · Devoluciones ligadas al gasto que devuelven
-- =============================================
-- Idempotente. Pégalo en Supabase → SQL Editor → Run.
--
-- Un ingreso con la categoría "Devoluciones" puede apuntar al gasto que te devuelven.
-- Ese gasto pasa a valer lo que te ha costado de verdad:
--   pagas 100 € y te devuelven 25 € → el gasto cuenta 75 €
--   te devuelven los 90 € del Bizum → el gasto cuenta 0 €

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refund_of UUID REFERENCES transactions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_refund_of ON transactions(refund_of) WHERE refund_of IS NOT NULL;
