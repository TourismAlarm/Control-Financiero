-- Script de diagnóstico: Verificar estado de usuarios y datos
-- Ejecuta este script para ver qué hay en tu base de datos

-- PASO 1: Verificar si hay usuarios en auth.users
SELECT
  '=== USUARIOS EN auth.users ===' as seccion;
SELECT
  id,
  email,
  created_at,
  confirmed_at,
  email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;

-- PASO 2: Verificar si hay cuentas
SELECT
  '=== CUENTAS EXISTENTES ===' as seccion;
SELECT
  id,
  user_id,
  name,
  type,
  is_active,
  balance
FROM accounts
ORDER BY created_at DESC;

-- PASO 3: Verificar si hay categorías
SELECT
  '=== CATEGORÍAS EXISTENTES ===' as seccion;
SELECT
  id,
  user_id,
  name,
  type,
  icon
FROM categories
ORDER BY created_at DESC;

-- PASO 4: Verificar si hay préstamos
SELECT
  '=== PRÉSTAMOS EXISTENTES ===' as seccion;
SELECT
  id,
  user_id,
  nombre,
  monto_total,
  estado
FROM loans
ORDER BY created_at DESC;

-- RESULTADO:
-- Si auth.users está vacío → Necesitas crear un usuario desde la aplicación
-- Si hay usuarios pero sin cuentas → Usar script con user_id específico
-- Si todo está vacío → Necesitas registrarte en la aplicación primero
