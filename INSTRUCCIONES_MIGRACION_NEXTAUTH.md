# 🔄 Migración de Supabase Auth a NextAuth con Google OAuth

## 📋 Situación Actual

Tu proyecto tiene un **conflicto entre dos sistemas de autenticación**:

1. **Supabase Auth** - El schema de la BD está configurado para esto
   - Tablas referencian `auth.users(id)` (UUID)
   - Usa el sistema de autenticación nativo de Supabase

2. **NextAuth con Google OAuth** - Lo que quieres usar
   - Configurado en `.env.local`
   - Código en `src/app/api/auth/[...nextauth]/options.js`
   - Espera una tabla `users` con `google_id` (TEXT)

## ⚠️ El Problema

El error `column "user_id" of relation "profiles" does not exist` ocurre porque:
- NextAuth devuelve IDs de Google como **strings** (ej: `"115555555555555555555"`)
- Las tablas usan **UUID** y referencian `auth.users(id)` de Supabase Auth
- Hay un desajuste completo entre el schema y el sistema de autenticación

## ✅ La Solución

Migrar completamente a NextAuth:

### PASO 1: Verificar Tablas Actuales

Abre el SQL Editor de Supabase:
👉 https://supabase.com/dashboard/project/ngmpkgkftxeqmvjahide/sql/new

Ejecuta el script `VERIFICAR_TABLAS.sql` para ver la estructura actual.

### PASO 2: Aplicar Migración Completa

Ejecuta el script `MIGRACION_NEXTAUTH_COMPLETA.sql` en el SQL Editor de Supabase.

Este script:
1. ✅ Crea la tabla `users` con `google_id` (TEXT)
2. ✅ Elimina referencias a `auth.users(id)`
3. ✅ Cambia todos los `user_id` de UUID a TEXT
4. ✅ Crea nuevas foreign keys apuntando a `users.google_id`
5. ⚠️ **Deshabilita RLS temporalmente** (ver nota abajo)

### PASO 3: Deshabilitar RLS para Desarrollo

**IMPORTANTE:** NextAuth no puede usar `auth.uid()` porque no usa Supabase Auth.

Para desarrollo, **descomenta estas líneas** al final del script de migración:

```sql
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

⚠️ **Esto es SOLO para desarrollo.** Para producción, necesitarás implementar RLS con custom claims o usar Service Role Key.

### PASO 4: Actualizar el Código de la Aplicación

Después de aplicar la migración, necesitarás actualizar:

#### 4.1. Eliminar o Adaptar `useUser.tsx`

Este hook usa Supabase Auth. Opciones:
- **Opción A:** Eliminarlo y usar `useSession` de NextAuth
- **Opción B:** Adaptarlo para que use NextAuth

#### 4.2. Actualizar Página Principal

`src/app/page.tsx` debe usar NextAuth en lugar de Supabase Auth:

```typescript
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  const userId = session.user.id // Este es el google_id
  // ...
}
```

#### 4.3. Actualizar Queries de Supabase

Todas las queries deben usar el `google_id` del usuario de NextAuth:

```typescript
const session = await getServerSession(authOptions)
const userId = session.user.id

const { data, error } = await supabase
  .from('accounts')
  .select('*')
  .eq('user_id', userId) // Ya no se usa auth.uid()
```

### PASO 5: Actualizar las Políticas de Seguridad

Una vez que NextAuth funcione, puedes implementar RLS de dos formas:

#### Opción A: Usar Service Role Key del lado del servidor
- Todas las queries usan el Service Role Key
- La seguridad se maneja en el código del servidor
- Más simple pero menos seguro

#### Opción B: Implementar Custom Claims en JWT
- Configurar NextAuth para incluir `user_id` en el JWT
- Pasar el JWT a Supabase
- Configurar RLS para validar el JWT
- Más complejo pero más seguro

## 📝 Orden de Ejecución

1. ✅ Ejecuta `VERIFICAR_TABLAS.sql` (opcional, para ver estructura)
2. ✅ Ejecuta `MIGRACION_NEXTAUTH_COMPLETA.sql`
3. ✅ Descomenta las líneas de DISABLE RLS en el script
4. ✅ Vuelve a ejecutar solo la sección de RLS
5. ✅ Actualiza el código de la aplicación
6. ✅ Prueba el login con Google

## 🧪 Probar la Migración

Después de aplicar todo:

```bash
cd "C:\Users\jordi\Desktop\Proyectos IA\Control-Financiero"
npm run dev
```

1. Abre http://localhost:3000
2. Deberías ser redirigido a `/auth/signin`
3. Haz click en "Sign in with Google"
4. Verifica en la consola que:
   - ✅ Se crea el usuario en la tabla `users`
   - ✅ No hay errores de tipo de datos
   - ✅ El `google_id` se guarda correctamente

## ⚠️ Advertencias

### Para Producción

**NO dejes RLS deshabilitado en producción.** Necesitarás:
- Implementar autenticación a nivel de código
- Usar Service Role Key solo del lado del servidor
- O implementar Custom Claims con JWT

### Datos Existentes

Este script **solo funciona si la BD está vacía** o no hay datos críticos. Si tienes datos:
- Necesitas una migración de datos más compleja
- Debes mapear UUIDs existentes a google_ids

### Backup

**Haz un backup antes de ejecutar** el script de migración:
1. Ve a Database → Backups en Supabase
2. Crea un backup manual antes de proceder

## 🎯 Archivos Creados

- `VERIFICAR_TABLAS.sql` - Verifica la estructura actual
- `MIGRACION_NEXTAUTH_COMPLETA.sql` - Migración completa
- `INSTRUCCIONES_MIGRACION_NEXTAUTH.md` - Este archivo

## 🚀 Siguiente Paso

**Ejecuta `MIGRACION_NEXTAUTH_COMPLETA.sql` en Supabase SQL Editor** y luego dame feedback sobre cualquier error que aparezca.
