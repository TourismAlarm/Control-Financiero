-- Script de emergencia para crear cuenta y categoría de deudas
-- Ejecutar si el sistema no puede crearlas automáticamente

-- Primero, verificar el user_id actual (reemplaza con tu user_id real)
-- Puedes obtenerlo desde la tabla auth.users o desde el perfil

-- PASO 1: Crear cuenta principal si no existe
-- IMPORTANTE: Reemplaza 'tu-user-id-aqui' con tu user_id real
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
)
SELECT
  gen_random_uuid(),
  'tu-user-id-aqui', -- ⚠️ CAMBIA ESTO POR TU USER_ID REAL
  'Cuenta Principal',
  'bank',
  0,
  'EUR',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM accounts
  WHERE user_id = 'tu-user-id-aqui' -- ⚠️ CAMBIA ESTO TAMBIÉN
  AND is_active = true
);

-- PASO 2: Crear categoría de deudas si no existe
INSERT INTO categories (
  id,
  user_id,
  name,
  type,
  icon,
  color,
  created_at
)
SELECT
  gen_random_uuid(),
  'tu-user-id-aqui', -- ⚠️ CAMBIA ESTO POR TU USER_ID REAL
  'Deudas y Préstamos',
  'expense',
  '💳',
  '#ef4444',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM categories
  WHERE user_id = 'tu-user-id-aqui' -- ⚠️ CAMBIA ESTO TAMBIÉN
  AND type = 'expense'
  AND (
    LOWER(name) LIKE '%deuda%' OR
    LOWER(name) LIKE '%préstamo%' OR
    LOWER(name) LIKE '%prestamo%'
  )
);

-- PASO 3: Verificar que se crearon correctamente
SELECT 'Cuentas creadas:' as resultado;
SELECT id, name, type, is_active
FROM accounts
WHERE user_id = 'tu-user-id-aqui'; -- ⚠️ CAMBIA ESTO

SELECT 'Categorías creadas:' as resultado;
SELECT id, name, type, icon
FROM categories
WHERE user_id = 'tu-user-id-aqui'; -- ⚠️ CAMBIA ESTO

-- INSTRUCCIONES:
-- 1. Obtén tu user_id:
--    SELECT id, email FROM auth.users WHERE email = 'tu-email@example.com';
--
-- 2. Reemplaza TODAS las instancias de 'tu-user-id-aqui' con tu user_id real
--
-- 3. Ejecuta este script en el SQL Editor de Supabase
--
-- 4. Verifica que se crearon:
--    - Debe mostrar al menos 1 cuenta activa
--    - Debe mostrar al menos 1 categoría de tipo 'expense'
