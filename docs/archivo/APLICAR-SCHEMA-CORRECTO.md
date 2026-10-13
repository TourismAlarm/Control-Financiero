# 🔧 APLICAR SCHEMA CORRECTO EN SUPABASE

## 🚨 PROBLEMA

Tu base de datos NO tiene las tablas que el código necesita. Por eso obtienes errores 400.

## ✅ SOLUCIÓN

### PASO 1: Ir a Supabase Dashboard

1. Abre: **https://supabase.com/dashboard**
2. Selecciona tu proyecto (ngmpkgkftxeqmvjahide)
3. Click en **SQL Editor** (icono </> en el menú lateral)

### PASO 2A: Limpiar la Base de Datos (PRIMERO)

**⚠️ IMPORTANTE: Ejecuta esto PRIMERO para evitar errores**

1. En tu computadora, abre este archivo:
   ```
   C:\Users\jordi\Desktop\Proyectos IA\Control-Financiero\supabase\migrations\000_cleanup_complete.sql
   ```

2. Selecciona **TODO el contenido** del archivo (Ctrl+A)
3. **Cópialo** (Ctrl+C)
4. Vuelve a Supabase SQL Editor
5. **Pega** el código (Ctrl+V)
6. Click en **"RUN"** (botón verde)
7. Deberías ver: "✅ Limpieza completa exitosa"

### PASO 2B: Aplicar el Schema Completo (SEGUNDO)

**Ahora sí, aplica el schema correcto:**

1. En tu computadora, abre este archivo:
   ```
   C:\Users\jordi\Desktop\Proyectos IA\Control-Financiero\supabase\migrations\001_initial_schema.sql
   ```

2. Selecciona **TODO el contenido** del archivo (Ctrl+A)
3. **Cópialo** (Ctrl+C)

### PASO 3: Ejecutar el Schema en Supabase

1. Vuelve a Supabase SQL Editor
2. **BORRA** todo el código anterior (el de limpieza)
3. **Pega** el nuevo código (Ctrl+V)
4. Click en el botón verde **"RUN"** (abajo a la derecha)
5. **ESPERA** a que termine de ejecutar (puede tardar 10-30 segundos)
6. Si ves "Success. No rows returned" o simplemente no hay errores, ¡funcionó!

### PASO 4: Verificar que Funcionó

1. En Supabase, ve a **"Table Editor"** (icono de tabla en el menú lateral)
2. Deberías ver estas 10 tablas:
   - ✅ profiles
   - ✅ accounts
   - ✅ categories
   - ✅ transactions
   - ✅ recurring_rules
   - ✅ budgets
   - ✅ transfers
   - ✅ loans
   - ✅ loan_payments
   - ✅ savings_goals

### PASO 5: Probar la Aplicación

1. Vuelve a tu aplicación: **http://localhost:3000**
2. **Recarga la página** con Ctrl+Shift+R (hard refresh)
3. Los errores 400 deberían **desaparecer**
4. Intenta crear una cuenta en el tab "Cuentas"
5. Deberías ver en la consola (F12):
   ```
   💳 AccountsManager - Enviando datos: {...}
   ✅ AccountsManager - Cuenta creada exitosamente
   ```
6. La cuenta debería aparecer en la lista

## 🔍 Si Hay Errores al Ejecutar el Schema

### Error: "relation already exists"
Si ves este error, significa que algunas tablas YA existen pero pueden estar mal configuradas.

**Solución**:
1. Ve a Supabase > SQL Editor
2. Copia y pega este código para LIMPIAR todo:
   ```sql
   DROP TABLE IF EXISTS loan_payments CASCADE;
   DROP TABLE IF EXISTS loans CASCADE;
   DROP TABLE IF EXISTS savings_goals CASCADE;
   DROP TABLE IF EXISTS transfers CASCADE;
   DROP TABLE IF EXISTS budgets CASCADE;
   DROP TABLE IF EXISTS recurring_rules CASCADE;
   DROP TABLE IF EXISTS transactions CASCADE;
   DROP TABLE IF EXISTS categories CASCADE;
   DROP TABLE IF EXISTS accounts CASCADE;
   DROP TABLE IF EXISTS profiles CASCADE;
   ```
3. Click en **RUN**
4. Ahora vuelve a ejecutar el schema completo de `001_initial_schema.sql`

### Error: "auth.users does not exist"
Esto NO debería pasar porque Supabase siempre crea la tabla `auth.users` automáticamente.

Si pasa, verifica que:
1. Estás en el proyecto CORRECTO en Supabase
2. El proyecto tiene **Authentication** habilitado

## 📊 Verificar Datos en Supabase

Después de crear una cuenta en la app, verifica en Supabase:

1. Ve a **Table Editor** > **accounts**
2. Deberías ver tu cuenta recién creada
3. Click en la fila para ver todos los detalles

## 🎯 Resultado Esperado

Después de aplicar el schema:
- ✅ NO más errores 400 en la consola
- ✅ Puedes crear cuentas, presupuestos, transacciones
- ✅ Los datos SE GUARDAN en Supabase
- ✅ Los datos persisten al recargar la página
- ✅ Las correcciones CRUD que hice funcionan correctamente

## 📝 Notas Importantes

1. **RLS (Row Level Security)**: El schema tiene RLS habilitado con políticas que usan `auth.uid()`
2. **NextAuth**: Tu app usa Google OAuth, así que el `user_id` en las tablas será el UUID de Supabase Auth
3. **Índices**: El schema incluye índices para mejor rendimiento
4. **Triggers**: Actualiza `updated_at` automáticamente en todas las tablas

## 🆘 Si Aún No Funciona

Después de aplicar el schema, si TODAVÍA ves errores 400:

1. Abre la consola del navegador (F12)
2. Ve al tab **Network**
3. Busca las peticiones que fallan (en rojo)
4. Click en una petición fallida
5. Ve al tab **Response**
6. **Cópiame** el mensaje de error exacto

---

**Última actualización**: 2025-11-05
