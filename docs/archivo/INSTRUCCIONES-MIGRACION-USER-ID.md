# 🔧 Migración: Cambiar user_id de UUID a TEXT

## 📋 Contexto

NextAuth con Google OAuth devuelve IDs de usuario como strings (no UUIDs), pero las tablas actuales usan tipo UUID, causando errores de inserción.

## ✅ Solución

Cambiar todas las columnas `user_id` de tipo `UUID` a tipo `TEXT`.

## 🚀 Pasos para Aplicar la Migración

### 1. Abrir el SQL Editor de Supabase

Ve a: https://supabase.com/dashboard/project/ngmpkgkftxeqmvjahide/sql/new

### 2. Copiar y Pegar el Script SQL

Abre el archivo `FIX_USER_ID_TYPE.sql` y copia TODO su contenido.

O copia este código directamente:

```sql
-- ============================================
-- FIX: Cambiar user_id de UUID a TEXT
-- Razón: NextAuth devuelve Google IDs como string, no UUIDs
-- ============================================

-- 1. PROFILES
ALTER TABLE profiles
  ALTER COLUMN id TYPE TEXT,
  ALTER COLUMN user_id TYPE TEXT;

-- 2. ACCOUNTS
ALTER TABLE accounts
  ALTER COLUMN user_id TYPE TEXT;

-- 3. TRANSACTIONS
ALTER TABLE transactions
  ALTER COLUMN user_id TYPE TEXT;

-- 4. CATEGORIES
ALTER TABLE categories
  ALTER COLUMN user_id TYPE TEXT;

-- 5. BUDGETS
ALTER TABLE budgets
  ALTER COLUMN user_id TYPE TEXT;

-- 6. RECURRING_RULES
ALTER TABLE recurring_rules
  ALTER COLUMN user_id TYPE TEXT;

-- 7. SAVINGS_GOALS
ALTER TABLE savings_goals
  ALTER COLUMN user_id TYPE TEXT;

-- 8. TRANSFERS
ALTER TABLE transfers
  ALTER COLUMN user_id TYPE TEXT;

-- 9. LOANS
ALTER TABLE loans
  ALTER COLUMN user_id TYPE TEXT;

-- 10. LOAN_PAYMENTS
ALTER TABLE loan_payments
  ALTER COLUMN user_id TYPE TEXT;

-- Verificación
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE column_name = 'user_id'
  AND table_schema = 'public'
ORDER BY table_name;

-- Mensaje
SELECT '✅ user_id cambiado de UUID a TEXT en todas las tablas' as resultado;
```

### 3. Ejecutar el Script

1. Pega el código en el SQL Editor
2. Haz clic en **"Run"** (o presiona `Ctrl+Enter`)
3. Espera a que se complete (debería tomar unos segundos)

### 4. Verificar los Resultados

Deberías ver:
- Una tabla mostrando todas las columnas `user_id` con tipo `text`
- Un mensaje: "✅ user_id cambiado de UUID a TEXT en todas las tablas"

### 5. Probar la Autenticación

Después de aplicar la migración:

1. Abre http://localhost:3000
2. Inicia sesión con Google
3. Verifica que se crea el perfil correctamente
4. Revisa que no hay errores en la consola

## 📊 Tablas Afectadas

1. **profiles** - `id` y `user_id`
2. **accounts** - `user_id`
3. **transactions** - `user_id`
4. **categories** - `user_id`
5. **budgets** - `user_id`
6. **recurring_rules** - `user_id`
7. **savings_goals** - `user_id`
8. **transfers** - `user_id`
9. **loans** - `user_id`
10. **loan_payments** - `user_id`

## ⚠️ Importante

- Esta migración es segura si la base de datos está vacía o con pocos datos
- Si ya tienes datos con UUIDs, necesitarías una migración más compleja
- **No necesitas detener la aplicación** para aplicar esta migración
- Las relaciones de claves foráneas se mantienen automáticamente

## 🔍 Verificación Post-Migración

Ejecuta esta query para confirmar:

```sql
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE column_name IN ('user_id', 'id')
  AND table_schema = 'public'
  AND table_name IN (
    'profiles', 'accounts', 'transactions', 'categories',
    'budgets', 'recurring_rules', 'savings_goals',
    'transfers', 'loans', 'loan_payments'
  )
ORDER BY table_name, column_name;
```

Todos los campos `user_id` e `id` (en profiles) deben mostrar `data_type = 'text'`.

## ✅ Siguiente Paso

Una vez aplicada la migración exitosamente, prueba la autenticación con Google y verifica que:

1. ✅ El login funciona sin errores
2. ✅ Se crea el perfil en la tabla `profiles`
3. ✅ El `user_id` se guarda correctamente como string
4. ✅ No hay errores en la consola del navegador o del servidor

---

🎉 **¡Listo!** Tu sistema ahora puede usar NextAuth con Google OAuth correctamente.
