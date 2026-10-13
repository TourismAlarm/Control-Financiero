# 🔑 Configurar SUPABASE_SERVICE_ROLE_KEY

## ⚠️ IMPORTANTE

Este cambio usa Supabase Service Role Key que tiene acceso completo a la base de datos (sin RLS). Por seguridad, NUNCA expongas esta key en el cliente.

## PASO 1: Obtener Service Role Key

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** > **API**
4. En la sección "Project API keys"
5. Copia el valor de **`service_role` key** (NO el `anon` key)

## PASO 2: Agregar a .env.local

Abre tu archivo `.env.local` y agrega:

```env
# ⚠️ NUNCA compartas esta key - tiene acceso completo a la BD
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

**IMPORTANTE**: Esta variable NO debe tener el prefijo `NEXT_PUBLIC_` porque no debe ser accesible desde el navegador.

## PASO 3: Reiniciar el Servidor

Después de agregar la key:

```bash
# Detén el servidor (Ctrl+C)
# Inicia de nuevo
npm run dev
```

## PASO 4: Deshabilitar RLS en Supabase

Como ahora usamos Service Role Key con validación en el servidor, puedes deshabilitar RLS:

1. Ve a Supabase Dashboard > SQL Editor
2. Ejecuta este SQL:

```sql
-- Deshabilitar RLS en todas las tablas
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE loans DISABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals DISABLE ROW LEVEL SECURITY;
```

## Verificación

Si configuraste todo correctamente:
- ✅ El servidor inicia sin errores
- ✅ La app puede crear/leer/actualizar/eliminar datos
- ✅ NO hay errores 401 o 403 en la consola
- ✅ Los datos se guardan en Supabase

## ¿Por qué este cambio?

### ANTES (Problemático):
- Cliente accedía directamente a Supabase
- RLS con `auth.uid()` no funcionaba con NextAuth
- Errores 400/401 constantes

### AHORA (Correcto):
- Cliente llama a API routes (`/api/accounts`, etc.)
- API routes validan la sesión de NextAuth
- API routes usan Service Role Key para acceder a Supabase
- Seguridad garantizada por validación de sesión en el servidor

## Seguridad

✅ **Seguro**:
- Service Role Key solo se usa en el servidor (API routes)
- Cada request valida la sesión con `getServerSession()`
- Todos los inserts/updates fuerzan `user_id` de la sesión
- Todos los selects filtran por `user_id` de la sesión

❌ **NO SEGURO** (no hagas esto):
- Nunca pongas `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
- Nunca uses Service Role Key en componentes cliente
- Nunca compartas tu Service Role Key en Git

## Troubleshooting

### Error: "Missing SUPABASE_SERVICE_ROLE_KEY"
- Verifica que agregaste la variable en `.env.local`
- Verifica que NO tiene el prefijo `NEXT_PUBLIC_`
- Reinicia el servidor

### Error: "Unauthorized"
- Verifica que estás logueado con Google OAuth
- Abre DevTools y verifica que `GET /api/auth/session` retorna tu sesión

### Los datos no se guardan
- Verifica en la consola del servidor (terminal) si hay errores
- Verifica que deshabilitaste RLS en Supabase
- Verifica que la Service Role Key es correcta

---

**Última actualización**: 2025-11-05
