-- Script MANUAL para crear cuenta y categoría
-- Usa este script si los otros fallan
--
-- IMPORTANTE: Este script usa un user_id genérico
-- Después de crear los datos, necesitarás actualizar el user_id con el tuyo real

-- PASO 1: Crear un UUID temporal o usar el tuyo
-- Para obtener tu user_id real:
--   1. Inicia sesión en la aplicación
--   2. Abre la consola del navegador (F12)
--   3. Ve a la pestaña "Application" -> "Cookies"
--   4. Busca la cookie de sesión de NextAuth
--   5. O ejecuta en consola: console.log(await fetch('/api/auth/session').then(r => r.json()))

-- OPCIÓN A: Crear con UUID temporal y luego actualizar
-- Descomenta estas líneas y reemplaza 'TU-USER-ID-AQUI' con tu ID real de NextAuth

/*
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
  'TU-USER-ID-AQUI',  -- ⚠️ REEMPLAZAR
  'Cuenta Principal',
  'bank',
  0,
  'EUR',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

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
  'TU-USER-ID-AQUI',  -- ⚠️ REEMPLAZAR
  'Deudas y Préstamos',
  'expense',
  '💳',
  '#ef4444',
  NOW()
) ON CONFLICT (id) DO NOTHING;
*/

-- OPCIÓN B: Si ya tienes datos pero con user_id incorrecto, actualizar
-- Descomenta y modifica según necesites

/*
-- Actualizar user_id en cuentas
UPDATE accounts
SET user_id = 'TU-USER-ID-CORRECTO-AQUI'  -- ⚠️ REEMPLAZAR
WHERE user_id = 'USER-ID-VIEJO-AQUI';      -- ⚠️ REEMPLAZAR

-- Actualizar user_id en categorías
UPDATE categories
SET user_id = 'TU-USER-ID-CORRECTO-AQUI'  -- ⚠️ REEMPLAZAR
WHERE user_id = 'USER-ID-VIEJO-AQUI';      -- ⚠️ REEMPLAZAR

-- Actualizar user_id en préstamos
UPDATE loans
SET user_id = 'TU-USER-ID-CORRECTO-AQUI'  -- ⚠️ REEMPLAZAR
WHERE user_id = 'USER-ID-VIEJO-AQUI';      -- ⚠️ REEMPLAZAR

-- Actualizar user_id en transacciones
UPDATE transactions
SET user_id = 'TU-USER-ID-CORRECTO-AQUI'  -- ⚠️ REEMPLAZAR
WHERE user_id = 'USER-ID-VIEJO-AQUI';      -- ⚠️ REEMPLAZAR
*/

-- VERIFICACIÓN: Ver qué user_ids existen en cada tabla
SELECT 'Préstamos:' as tabla, COUNT(*) as registros, user_id
FROM loans
GROUP BY user_id
UNION ALL
SELECT 'Cuentas:', COUNT(*), user_id
FROM accounts
GROUP BY user_id
UNION ALL
SELECT 'Categorías:', COUNT(*), user_id
FROM categories
GROUP BY user_id
UNION ALL
SELECT 'Transacciones:', COUNT(*), user_id
FROM transactions
GROUP BY user_id;

-- CÓMO OBTENER TU USER_ID:
-- Método 1: Desde la aplicación web
--   - Abre DevTools (F12)
--   - Ejecuta: fetch('/api/auth/session').then(r => r.json()).then(console.log)
--   - Busca el campo "id" en el objeto "user"

-- Método 2: Desde Supabase
--   - Si ya tienes un préstamo creado, ejecuta:
--   SELECT DISTINCT user_id FROM loans;

-- Método 3: Crear un préstamo de prueba
--   - Ve a la app, crea un préstamo
--   - Luego ejecuta: SELECT user_id FROM loans LIMIT 1;
--   - Ese es tu user_id real
