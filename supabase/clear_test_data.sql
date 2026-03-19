-- =============================================
-- LIMPIAR DATOS DE PRUEBA - Control Financiero
-- =============================================
-- Ejecuta este script en el SQL Editor de Supabase Dashboard
-- para borrar todos los datos de prueba de tu cuenta.
--
-- IMPORTANTE: Reemplaza 'TU_USER_ID' con tu UUID de usuario.
-- Lo puedes obtener en: Authentication > Users en el dashboard de Supabase.
--
-- Este script:
--   ✓ Elimina todos los datos financieros (transacciones, cuentas, etc.)
--   ✓ Elimina categorías personalizadas (mantiene las del sistema)
--   ✓ Resetea el onboarding para que puedas configurar desde cero
--   ✗ NO elimina tu cuenta ni tu perfil
-- =============================================

DO $$
DECLARE
  target_user_id UUID := 'TU_USER_ID'; -- ← REEMPLAZA ESTO
BEGIN

  -- 1. Pagos de préstamos
  DELETE FROM loan_payments WHERE user_id = target_user_id;

  -- 2. Transacciones importadas de bancos
  DELETE FROM imported_transactions WHERE user_id = target_user_id;

  -- 3. Historial de sincronizaciones
  DELETE FROM sync_history WHERE user_id = target_user_id;

  -- 4. Préstamos
  DELETE FROM loans WHERE user_id = target_user_id;

  -- 5. Conexiones bancarias
  DELETE FROM bank_connections WHERE user_id = target_user_id;

  -- 6. Notificaciones del agente IA
  DELETE FROM agent_notifications WHERE user_id = target_user_id;

  -- 7. Transacciones
  DELETE FROM transactions WHERE user_id = target_user_id;

  -- 8. Transferencias entre cuentas
  DELETE FROM transfers WHERE user_id = target_user_id;

  -- 9. Presupuestos
  DELETE FROM budgets WHERE user_id = target_user_id;

  -- 10. Metas de ahorro
  DELETE FROM savings_goals WHERE user_id = target_user_id;

  -- 11. Reglas de transacciones recurrentes
  DELETE FROM recurring_rules WHERE user_id = target_user_id;

  -- 12. Cuentas bancarias/efectivo
  DELETE FROM accounts WHERE user_id = target_user_id;

  -- 13. Categorías personalizadas (mantiene las del sistema)
  DELETE FROM categories WHERE user_id = target_user_id AND is_system = false;

  -- 14. Resetear onboarding del perfil para configurar desde cero
  UPDATE profiles
  SET onboarding_completed = false, updated_at = NOW()
  WHERE id = target_user_id;

  RAISE NOTICE 'Datos de prueba eliminados correctamente para usuario: %', target_user_id;
END $$;
