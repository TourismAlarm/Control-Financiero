-- Script para crear cuenta y categoría cuando usas NextAuth (NO Supabase Auth)
-- Este script detecta tu user_id desde las tablas de datos existentes

-- OPCIÓN 1: Detectar user_id desde préstamos existentes
DO $$
DECLARE
  v_user_id uuid;
  v_account_id uuid;
  v_category_id uuid;
BEGIN
  -- Intentar obtener user_id desde préstamos existentes
  SELECT DISTINCT user_id INTO v_user_id FROM loans LIMIT 1;

  -- Si no hay préstamos, intentar desde transacciones
  IF v_user_id IS NULL THEN
    SELECT DISTINCT user_id INTO v_user_id FROM transactions LIMIT 1;
  END IF;

  -- Si no hay transacciones, intentar desde cuentas
  IF v_user_id IS NULL THEN
    SELECT DISTINCT user_id INTO v_user_id FROM accounts LIMIT 1;
  END IF;

  -- Si no hay cuentas, intentar desde categorías
  IF v_user_id IS NULL THEN
    SELECT DISTINCT user_id INTO v_user_id FROM categories LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró ningún user_id en las tablas. Por favor, ejecuta el script fix-manual-insert.sql con tu user_id de NextAuth';
  END IF;

  RAISE NOTICE 'Usando user_id detectado: %', v_user_id;

  -- PASO 1: Crear cuenta principal si no existe
  IF NOT EXISTS (
    SELECT 1 FROM accounts
    WHERE user_id = v_user_id
    AND is_active = true
  ) THEN
    INSERT INTO accounts (
      id,
      user_id,
      name,
      type,
      balance,
      currency,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      'Cuenta Principal',
      'bank',
      0,
      'EUR',
      true,
      NOW(),
      NOW()
    ) RETURNING id INTO v_account_id;

    RAISE NOTICE '✅ Cuenta creada con ID: %', v_account_id;
  ELSE
    SELECT id INTO v_account_id FROM accounts
    WHERE user_id = v_user_id
    AND is_active = true
    LIMIT 1;

    RAISE NOTICE 'ℹ️  Ya existe cuenta con ID: %', v_account_id;
  END IF;

  -- PASO 2: Crear categoría de deudas si no existe
  IF NOT EXISTS (
    SELECT 1 FROM categories
    WHERE user_id = v_user_id
    AND type = 'expense'
    AND (
      LOWER(name) LIKE '%deuda%' OR
      LOWER(name) LIKE '%préstamo%' OR
      LOWER(name) LIKE '%prestamo%'
    )
  ) THEN
    INSERT INTO categories (
      id,
      user_id,
      name,
      type,
      icon,
      color,
      created_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      'Deudas y Préstamos',
      'expense',
      '💳',
      '#ef4444',
      NOW()
    ) RETURNING id INTO v_category_id;

    RAISE NOTICE '✅ Categoría creada con ID: %', v_category_id;
  ELSE
    SELECT id INTO v_category_id FROM categories
    WHERE user_id = v_user_id
    AND type = 'expense'
    AND (
      LOWER(name) LIKE '%deuda%' OR
      LOWER(name) LIKE '%préstamo%' OR
      LOWER(name) LIKE '%prestamo%'
    )
    LIMIT 1;

    RAISE NOTICE 'ℹ️  Ya existe categoría con ID: %', v_category_id;
  END IF;

  RAISE NOTICE '✅ Proceso completado exitosamente para user_id: %', v_user_id;
END $$;

-- Verificar resultados
SELECT '=== CUENTAS ===' as info;
SELECT id, user_id, name, type, balance, is_active
FROM accounts
ORDER BY created_at DESC
LIMIT 5;

SELECT '=== CATEGORÍAS ===' as info;
SELECT id, user_id, name, type, icon
FROM categories
WHERE type = 'expense'
ORDER BY created_at DESC
LIMIT 10;
