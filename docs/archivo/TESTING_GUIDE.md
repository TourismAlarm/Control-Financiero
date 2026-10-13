# 🧪 Guía de Pruebas - NextAuth + Supabase Integration

## ✅ Migración Completada

Se ha actualizado completamente el código para trabajar con NextAuth + Google OAuth:

### 1. **Base de Datos** ✅
- ✅ Tabla `users` creada con `google_id` (TEXT)
- ✅ Todas las columnas `user_id` cambiadas de UUID a TEXT
- ✅ Foreign keys actualizadas para apuntar a `users.google_id`
- ✅ RLS deshabilitado (desarrollo)

### 2. **Backend Actualizado** ✅
- ✅ Cliente Supabase Admin con SERVICE_ROLE_KEY
- ✅ Tipos TypeScript actualizados (`user_id: string`)
- ✅ Validaciones Zod actualizadas
- ✅ NextAuth configurado para crear `users` y `profiles` automáticamente
- ✅ API Routes:
  - `/api/transactions` (GET, POST, PUT, DELETE)
  - `/api/categories` (GET, POST, PUT, DELETE)
  - `/api/accounts` (GET, POST, PUT, DELETE)
  - `/api/test/user` (para verificar datos)

### 3. **Hooks con TanStack Query** ✅
- ✅ `useTransactions()` - CRUD completo + helpers
- ✅ `useCategories()` - CRUD completo + filtros

### 4. **Página de Prueba** ✅
- ✅ `/test` - Página completa de pruebas

---

## 🚀 Cómo Probar

### PASO 1: Iniciar el Servidor

```bash
cd "C:\Users\jordi\Desktop\Proyectos IA\Control-Financiero"
npm run dev
```

### PASO 2: Abrir la Aplicación

Abre en tu navegador:
```
http://localhost:3000
```

### PASO 3: Iniciar Sesión con Google

1. Serás redirigido a `/auth/signin`
2. Haz clic en "Sign in with Google"
3. Selecciona tu cuenta de Google
4. Acepta los permisos

### PASO 4: Verificar en la Consola del Servidor

Deberías ver en la terminal algo como:

```
🔵 NextAuth signIn callback - Google ID: 115555555555555555555
🔵 Email: tu@email.com
🔵 Name: Tu Nombre
🆕 Creando nuevo usuario...
✅ Usuario creado: { google_id: '115555...', email: '...', name: '...' }
✅ Perfil creado: { id: '115555...', email: '...', full_name: '...' }
```

O si ya existe:

```
🔵 NextAuth signIn callback - Google ID: 115555555555555555555
✅ Usuario ya existe, Google ID: 115555555555555555555
```

### PASO 5: Ir a la Página de Prueba

```
http://localhost:3000/test
```

### PASO 6: Verificar la Información

En la página de prueba verás:

#### 📝 Información de Sesión
- Status: `authenticated`
- Email: tu email de Google
- **Google ID (user_id)**: `115555555555555555555` (importante!)

#### 👤 Usuario en Base de Datos
```json
{
  "session": {
    "google_id": "115555555555555555555",
    "email": "tu@email.com",
    "name": "Tu Nombre"
  },
  "user_in_database": {
    "google_id": "115555555555555555555",
    "email": "tu@email.com",
    "name": "Tu Nombre",
    "created_at": "2025-11-05T...",
    "updated_at": "2025-11-05T..."
  },
  "profile_in_database": {
    "id": "115555555555555555555",
    "email": "tu@email.com",
    "full_name": "Tu Nombre",
    ...
  }
}
```

### PASO 7: Crear Categorías (si no existen)

Si no hay categorías, primero créalas usando la consola del navegador o desde Supabase SQL Editor:

```sql
-- Insertar categorías de ejemplo
INSERT INTO categories (user_id, name, type, icon, color) VALUES
  ('TU_GOOGLE_ID', 'Alimentación', 'expense', '🍔', '#ef4444'),
  ('TU_GOOGLE_ID', 'Transporte', 'expense', '🚗', '#f59e0b'),
  ('TU_GOOGLE_ID', 'Salario', 'income', '💰', '#10b981');
```

Reemplaza `'TU_GOOGLE_ID'` con tu Google ID que aparece en la página de prueba.

O usa la API directamente desde la consola del navegador:

```javascript
fetch('/api/categories', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Alimentación',
    type: 'expense',
    icon: '🍔',
    color: '#ef4444'
  })
}).then(r => r.json()).then(console.log)
```

### PASO 8: Crear una Transacción de Prueba

En la página `/test`:

1. Selecciona **Tipo**: Gasto
2. Ingresa **Monto**: `10.50`
3. Ingresa **Descripción**: `Café con amigos`
4. Selecciona una **Categoría** (si creaste alguna)
5. Haz clic en **"Crear Transacción"**

### PASO 9: Verificar el Resultado

Deberías ver:

```
✅ Transacción creada correctamente

{
  "id": "uuid-de-la-transaccion",
  "user_id": "115555555555555555555",  ← IMPORTANTE: Tu Google ID!
  "type": "expense",
  "amount": 10.50,
  "description": "Café con amigos",
  "category_id": "uuid-de-categoria",
  "date": "2025-11-05",
  "created_at": "2025-11-05T...",
  ...
}
```

### PASO 10: Ver Lista de Transacciones

Desplázate hacia abajo en la página de prueba y verás todas tus transacciones listadas.

---

## ✅ Qué Verificar

### En la Base de Datos (Supabase Dashboard)

1. **Tabla `users`**:
   - Debe existir tu registro con `google_id` (string, no UUID)
   - `email` y `name` deben coincidir con tu cuenta de Google

2. **Tabla `profiles`**:
   - `id` debe ser tu Google ID (mismo que en `users.google_id`)
   - Debe tener tus datos

3. **Tabla `transactions`**:
   - `user_id` debe ser tu Google ID (TEXT, no UUID)
   - Debe aparecer la transacción que creaste

### En la Consola del Navegador

Abre DevTools (F12) → Console y no deberías ver errores de:
- ❌ "column user_id does not exist"
- ❌ "invalid UUID"
- ❌ "unauthorized"

### En la Consola del Servidor (Terminal)

Deberías ver:
- ✅ Logs de NextAuth signIn callback
- ✅ Creación de usuario/perfil (primera vez)
- ❌ NO errores de PostgreSQL

---

## 🐛 Troubleshooting

### Error: "Unauthorized" en la página /test

**Causa**: No estás autenticado.

**Solución**:
```bash
# Ir a /auth/signin y hacer login con Google
http://localhost:3000/auth/signin
```

### Error: "User not found in database"

**Causa**: NextAuth no pudo crear el usuario.

**Solución**: Revisa la consola del servidor y busca errores en el callback de NextAuth.

### Error: "No hay categorías"

**Causa**: No has creado categorías aún.

**Solución**: Crea categorías manualmente (ver PASO 7 arriba).

### Error: "Failed to fetch categories/transactions"

**Causa**: Posible error en la API o problemas de autenticación.

**Solución**:
1. Abre DevTools → Network
2. Intenta de nuevo
3. Revisa el error específico del endpoint

---

## 📊 Verificación Final

### Checklist Completo

- [ ] ✅ Login con Google funciona
- [ ] ✅ Se crea usuario en tabla `users` con Google ID
- [ ] ✅ Se crea perfil en tabla `profiles`
- [ ] ✅ Página `/test` muestra información correcta
- [ ] ✅ Se pueden crear categorías
- [ ] ✅ Se pueden crear transacciones
- [ ] ✅ `user_id` en transacciones es el Google ID (string)
- [ ] ✅ No hay errores en consola del navegador
- [ ] ✅ No hay errores en consola del servidor

---

## 🎉 Siguiente Paso

Una vez que todo funcione en `/test`, puedes:

1. **Crear categorías por defecto** para todos los usuarios nuevos
2. **Crear la interfaz principal** con dashboard
3. **Implementar onboarding** para nuevos usuarios
4. **Habilitar RLS en producción** (con configuración adecuada)

---

## 📝 Notas Importantes

1. **RLS está DESHABILITADO**: Solo para desarrollo. En producción necesitas implementar seguridad.

2. **Google ID es STRING**: No es UUID. Es un número largo como string (ej: `"115555555555555555555"`).

3. **Service Role Key**: Se usa del lado del servidor. NUNCA expongas esta key al cliente.

4. **NextAuth Session**: El `session.user.id` contiene el Google ID directamente.

---

¿Todo funcionando? 🎊

Si encuentras algún error, revisa:
1. Los logs del servidor (terminal donde corre `npm run dev`)
2. La consola del navegador (F12)
3. El SQL Editor de Supabase para verificar los datos

**¡Buena suerte con las pruebas!** 🚀
