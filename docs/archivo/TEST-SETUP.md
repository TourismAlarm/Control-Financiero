# 🧪 TEST SETUP - API Routes con NextAuth

## ✅ Cambios Completados

Se ha refactorizado el proyecto para usar API routes con NextAuth + Supabase Admin:

### Archivos Creados/Modificados:
1. ✅ `src/lib/supabase/admin.ts` - Cliente Supabase con Service Role Key
2. ✅ `src/app/api/accounts/route.ts` - API route para cuentas (GET, POST, PUT, DELETE)
3. ✅ `src/app/api/transactions/route.ts` - API route para transacciones (GET, POST, PUT, DELETE)
4. ✅ `src/hooks/useAccounts.ts` - Actualizado para usar fetch a `/api/accounts`
5. ✅ `src/hooks/useTransactions.ts` - Actualizado para usar fetch a `/api/transactions`

### Beneficios de este Cambio:
- ✅ **Seguridad**: Service Role Key solo en servidor
- ✅ **Validación**: Sesión validada en cada request
- ✅ **Sin RLS**: No necesitas políticas RLS complicadas
- ✅ **Control total**: Forzamos user_id en el servidor

---

## 📋 PASO 1: Configurar Service Role Key

### 1.1 Obtener la Key de Supabase

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** > **API**
4. En "Project API keys", copia el **`service_role` key** (⚠️ NO el `anon` key)

### 1.2 Agregar al .env.local

Abre tu archivo `.env.local` y agrega:

```env
# ⚠️ NUNCA compartas esta key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

**IMPORTANTE**:
- La variable NO debe tener prefijo `NEXT_PUBLIC_`
- NO la commits a Git

### 1.3 Reiniciar el Servidor

```bash
# Detén el servidor (Ctrl+C)
# Inicia de nuevo
npm run dev
```

---

## 📋 PASO 2: Deshabilitar RLS en Supabase

Como ahora usamos Service Role Key con validación en el servidor, deshabilitamos RLS:

1. Ve a Supabase Dashboard > SQL Editor
2. Ejecuta este SQL:

```sql
-- Deshabilitar RLS en las tablas principales
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Opcional: También en las demás tablas
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE loans DISABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments DISABLE ROW LEVEL SECURITY;
```

---

## 🧪 PASO 3: Probar las Cuentas (Accounts)

### 3.1 Abrir la Aplicación

1. Abre http://localhost:3000
2. Inicia sesión con Google
3. Abre DevTools (F12) > Console

### 3.2 Probar CREAR Cuenta

1. Ve al tab **"Cuentas"**
2. Click en **"Nueva Cuenta"**
3. Rellena:
   - Nombre: "Cuenta Test"
   - Tipo: "Cuenta Bancaria"
   - Saldo: 1000
   - Moneda: EUR
4. Click en **"Crear"**

### 3.3 Verificar en Console

Deberías ver en la consola (F12):
```
💳 AccountsManager - Enviando datos: {...}
💳 AccountsManager - Datos procesados: {...}
💳 AccountsManager - Creando nueva cuenta
✅ AccountsManager - Cuenta creada exitosamente
```

### 3.4 Verificar en la UI

- La cuenta aparece en la lista
- Muestra "Cuenta Test" con €1000.00
- El saldo total se actualiza

### 3.5 Verificar en Supabase

1. Ve a Supabase > Table Editor > `accounts`
2. Deberías ver la cuenta recién creada
3. El campo `user_id` debe ser tu Google ID

### 3.6 Probar EDITAR Cuenta

1. Click en el botón de editar (lápiz) en la cuenta
2. Cambia el nombre a "Cuenta Test Editada"
3. Click en "Actualizar"
4. Verifica que el nombre cambió

### 3.7 Probar ELIMINAR Cuenta

1. Click en el botón de eliminar (basura)
2. Confirma la eliminación
3. La cuenta desaparece de la lista

---

## 🧪 PASO 4: Probar las Transacciones

### 4.1 Probar CREAR Transacción (Ingreso)

1. Ve al tab **"Transacciones"**
2. Click en **"Nuevo Ingreso"**
3. Rellena:
   - Descripción: "Salario Test"
   - Monto: 2000
   - Fecha: Hoy
4. Click en **"Guardar"**

### 4.2 Verificar en Console

Deberías ver:
```
💸 TransactionForm - Enviando datos: {...}
💸 TransactionForm - Datos procesados: {...}
💸 TransactionForm - Creando nueva transacción
✅ TransactionForm - Transacción creada exitosamente
```

### 4.3 Verificar en la UI

- La transacción aparece en la lista
- Muestra "Salario Test" con €2000.00
- El tipo es "ingreso" (verde)

### 4.4 Verificar en Supabase

1. Ve a Supabase > Table Editor > `transactions`
2. Deberías ver la transacción
3. El campo `user_id` debe ser tu Google ID

### 4.5 Probar CREAR Transacción (Gasto)

1. Click en **"Nuevo Gasto"**
2. Rellena:
   - Descripción: "Comida"
   - Monto: 50
   - Fecha: Hoy
3. Click en **"Guardar"**
4. Verifica que aparece en la lista como gasto (rojo)

---

## 🔍 PASO 5: Verificar Seguridad

### 5.1 Verificar Aislamiento de Usuarios

Para confirmar que cada usuario solo ve sus datos:

1. Inicia sesión con tu cuenta de Google
2. Crea una cuenta y una transacción
3. **Cierra sesión**
4. Inicia sesión con OTRA cuenta de Google (si tienes)
5. **NO deberías ver** las cuentas/transacciones del otro usuario

### 5.2 Verificar en Network Tab

1. Abre DevTools > Network
2. Crea una cuenta
3. Busca la petición `POST /api/accounts`
4. Ve al tab "Payload" o "Request"
5. Verifica que **NO incluye** `user_id` (se agrega en el servidor)

---

## ✅ Checklist de Verificación

- [ ] Service Role Key agregada a `.env.local`
- [ ] Servidor reiniciado
- [ ] RLS deshabilitado en Supabase
- [ ] Puedo crear cuentas
- [ ] Las cuentas aparecen en la UI
- [ ] Las cuentas se guardan en Supabase con mi `user_id`
- [ ] Puedo editar cuentas
- [ ] Puedo eliminar cuentas
- [ ] Puedo crear transacciones (ingreso y gasto)
- [ ] Las transacciones aparecen en la UI
- [ ] Las transacciones se guardan en Supabase con mi `user_id`
- [ ] NO veo errores en la consola del navegador
- [ ] NO veo errores 401 o 403
- [ ] Los datos persisten al recargar la página

---

## ❌ Troubleshooting

### Error: "Missing SUPABASE_SERVICE_ROLE_KEY"

**Causa**: No agregaste la variable o tiene el nombre incorrecto

**Solución**:
1. Verifica que `.env.local` tiene: `SUPABASE_SERVICE_ROLE_KEY=...`
2. Verifica que NO tiene prefijo `NEXT_PUBLIC_`
3. Reinicia el servidor

### Error: "Unauthorized" (401)

**Causa**: No hay sesión de NextAuth

**Solución**:
1. Verifica que estás logueado con Google
2. Abre DevTools > Network
3. Busca `GET /api/auth/session`
4. Debe retornar tu sesión con `user.id`

### Error: "Failed to fetch accounts"

**Causa**: Puede ser un problema con la API route o Supabase

**Solución**:
1. Abre la terminal del servidor (donde corre `npm run dev`)
2. Busca errores en rojo
3. Si dice "Cannot find module", verifica que `src/lib/supabase/admin.ts` existe
4. Si dice "relation does not exist", verifica que las tablas existen en Supabase

### Las cuentas no aparecen

**Causa**: Posiblemente RLS sigue habilitado

**Solución**:
1. Ve a Supabase > SQL Editor
2. Ejecuta: `ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;`
3. Recarga la página

### "Cannot read properties of undefined"

**Causa**: Algún componente intenta acceder a datos antes de que carguen

**Solución**:
1. Verifica que los componentes esperan a que `isLoading` sea `false`
2. Verifica que manejan el caso cuando `accounts` es un array vacío

---

## 🎯 Próximos Pasos

Si todo funciona correctamente:

1. ✅ **Cuentas y Transacciones funcionan**
2. 🔄 **Siguiente**: Crear API routes para el resto de entidades:
   - `/api/categories`
   - `/api/budgets`
   - `/api/recurring-rules`
   - `/api/savings-goals`
   - `/api/transfers`

3. 🔄 **Actualizar hooks restantes** para usar fetch

4. 🚀 **Deploy a producción** cuando todo esté listo

---

## 📝 Notas Técnicas

### Cómo Funciona la Seguridad

```typescript
// 1. Cliente hace petición
fetch('/api/accounts', { method: 'POST', body: {...} })

// 2. API route valida sesión
const session = await getServerSession(authOptions);
if (!session) return 401;

// 3. API route fuerza user_id
const data = { ...body, user_id: session.user.id };

// 4. Supabase Admin inserta (sin RLS)
await supabaseAdmin.from('accounts').insert(data);
```

### Por Qué NO Necesitamos RLS

- ✅ **Validación en servidor**: Cada request valida la sesión
- ✅ **user_id forzado**: El servidor agrega el user_id, el cliente no lo puede cambiar
- ✅ **Filtrado en queries**: Todos los SELECT filtran por `user_id` del session
- ✅ **Verificación en updates/deletes**: Se verifica ownership antes de modificar

---

**Última actualización**: 2025-11-05
