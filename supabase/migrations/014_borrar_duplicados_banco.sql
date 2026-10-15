-- =============================================
-- 014 · Borrar movimientos del banco duplicados
-- =============================================
-- Al reconectar un banco, Enable Banking cambia el identificador de la cuenta y
-- la app volvía a importar los últimos días como si fueran movimientos nuevos.
-- Esto deja una sola copia de cada movimiento (la primera que se guardó).
-- Si un duplicado había bajado lo pendiente de una deuda, se devuelve.
--
-- Pégalo en Supabase → SQL Editor → Run. El resultado dice cuántos ha borrado.
-- Se puede ejecutar varias veces: la segunda vez borra 0.

BEGIN;

CREATE TEMP TABLE dup_tx ON COMMIT DROP AS
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, account_id, regexp_replace(external_id, '^eb:[^:]*:', '')
      ORDER BY created_at, id
    ) AS rn
  FROM transactions
  WHERE external_id LIKE 'eb:%'
)
SELECT id FROM ranked WHERE rn > 1;

-- Deudas: devolver lo que los pagos duplicados restaron
UPDATE loans l
SET outstanding_amount = l.outstanding_amount + p.total,
    status = CASE WHEN l.status = 'paid' THEN 'active' ELSE l.status END,
    updated_at = NOW()
FROM (
  SELECT loan_id, SUM(principal_paid) AS total
  FROM loan_payments
  WHERE transaction_id IN (SELECT id FROM dup_tx)
  GROUP BY loan_id
) p
WHERE l.id = p.loan_id AND p.total > 0;

DELETE FROM loan_payments WHERE transaction_id IN (SELECT id FROM dup_tx);
DELETE FROM transactions WHERE id IN (SELECT id FROM dup_tx);

SELECT COUNT(*) AS duplicados_borrados FROM dup_tx;

COMMIT;
