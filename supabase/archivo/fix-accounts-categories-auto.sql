-- Script AUTOMÁTICO para crear cuenta y categoría de deudas
-- Este script obtiene automáticamente tu user_id, no necesitas reemplazar nada

DO $$
DECLARE
  v_user_id uuid;
  v_account_id uuid;
  v_category_id uuid;
BEGIN
  -- Obtener el primer user_id de la tabla auth.users
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró ningún usuario en auth.users';
  END IF;

  RAISE NOTICE 'Usando user_id: %', v_user_id;

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

    RAISE NOTICE 'Cuenta creada con ID: %', v_account_id;
  ELSE
    SELECT id INTO v_account_id FROM accounts
    WHERE user_id = v_user_id
    AND is_active = true
    LIMIT 1;

    RAISE NOTICE 'Ya existe cuenta con ID: %', v_account_id;
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

    RAISE NOTICE 'Categoría creada con ID: %', v_category_id;
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

    RAISE NOTICE 'Ya existe categoría con ID: %', v_category_id;
  END IF;

  RAISE NOTICE '✅ Proceso completado exitosamente';
END $$;

-- Verificar resultados
SELECT '=== CUENTAS CREADAS ===' as info;
SELECT id, name, type, balance, currency, is_active
FROM accounts
WHERE user_id IN (SELECT id FROM auth.users LIMIT 1);

SELECT '=== CATEGORÍAS CREADAS ===' as info;
SELECT id, name, type, icon, color
FROM categories
WHERE user_id IN (SELECT id FROM auth.users LIMIT 1)
AND type = 'expense';
