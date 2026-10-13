# 🔧 Guía: Solucionar Problemas de Autenticación y Datos Faltantes

## 🎯 Problema Identificado

Tu aplicación usa **NextAuth** (con Google OAuth), NO Supabase Auth. Por eso la tabla `auth.users` está vacía - es para un sistema de autenticación diferente.

---

## 📋 Soluciones Disponibles (en orden de prioridad)

### ✅ SOLUCIÓN 1: Script Automático con Datos Existentes (RECOMENDADO)

**Cuándo usar**: Si ya has creado préstamos, transacciones, o cuentas en la aplicación.

**Archivo**: `supabase/fix-accounts-categories-nextauth.sql`

**Qué hace**:
- Busca tu `user_id` desde datos existentes (préstamos, transacciones, cuentas, categorías)
- Crea automáticamente la cuenta y categoría faltantes
- No requiere que pegues manualmente tu user_id

**Cómo ejecutar**:
1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Abre el archivo `fix-accounts-categories-nextauth.sql`
3. Copia todo el contenido
4. Pega en SQL Editor
5. Click **Run**

**Resultado esperado**:
```
NOTICE: Usando user_id detectado: a1b2c3d4-...
NOTICE: ✅ Cuenta creada con ID: ...
NOTICE: ✅ Categoría creada con ID: ...
NOTICE: ✅ Proceso completado exitosamente
```

---

### ✅ SOLUCIÓN 2: Diagnóstico Primero

**Cuándo usar**: Si no estás seguro de qué datos tienes.

**Archivo**: `supabase/diagnostic-check-users.sql`

**Qué hace**:
- Revisa todas tus tablas
- Te muestra qué datos existen
- Identifica qué `user_id` estás usando

**Cómo ejecutar**:
1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Abre el archivo `diagnostic-check-users.sql`
3. Copia todo el contenido
4. Pega en SQL Editor
5. Click **Run**

**Analiza los resultados**:
- Si ves préstamos/transacciones → Usa **SOLUCIÓN 1**
- Si todo está vacío → Usa **SOLUCIÓN 3**
- Si hay datos pero con user_id incorrecto → Usa **SOLUCIÓN 4**

---

### ✅ SOLUCIÓN 3: Obtener tu User ID de NextAuth

**Cuándo usar**: Si no tienes datos aún o los scripts anteriores fallan.

#### Método A: Desde el Navegador (MÁS FÁCIL)

1. **Inicia sesión** en tu aplicación (http://localhost:3000)
2. Abre **DevTools** (F12)
3. Ve a la pestaña **Console**
4. Ejecuta este comando:
   ```javascript
   fetch('/api/auth/session').then(r => r.json()).then(data => {
     console.log('Tu user_id es:', data?.user?.id);
   });
   ```
5. Copia el `user_id` que aparece

#### Método B: Crear un Préstamo de Prueba

1. Ve a tu aplicación
2. Inicia sesión con Google
3. Crea un préstamo de prueba (cualquier dato)
4. Ve a Supabase SQL Editor
5. Ejecuta:
   ```sql
   SELECT DISTINCT user_id FROM loans;
   ```
6. Ese es tu `user_id` real

#### Método C: Desde las Cookies

1. Abre **DevTools** (F12)
2. Ve a **Application** → **Cookies**
3. Busca la cookie de `next-auth.session-token`
4. O busca en **Local Storage** datos de sesión

---

### ✅ SOLUCIÓN 4: Inserción Manual (ÚLTIMO RECURSO)

**Cuándo usar**: Si tienes tu `user_id` de NextAuth y los otros scripts fallan.

**Archivo**: `supabase/fix-manual-insert.sql`

**Cómo ejecutar**:
1. Obtén tu `user_id` usando **SOLUCIÓN 3**
2. Abre `fix-manual-insert.sql`
3. Busca `'TU-USER-ID-AQUI'`
4. Reemplaza TODAS las instancias con tu user_id real
5. Descomenta la sección OPCIÓN A (quita los `/*` y `*/`)
6. Ejecuta en Supabase SQL Editor

---

## 🔍 Verificación Final

Después de ejecutar cualquier script, verifica que todo esté bien:

### 1. Verificar en Supabase:
```sql
-- Ver tus cuentas
SELECT * FROM accounts WHERE user_id = 'tu-user-id';

-- Ver tus categorías
SELECT * FROM categories WHERE user_id = 'tu-user-id' AND type = 'expense';
```

### 2. Probar en la Aplicación:
1. Ve a la pestaña **Deudas**
2. Crea o edita un préstamo
3. Marca un pago como pagado
4. Ve a la pestaña **Transacciones**
5. **Verifica que apareció la transacción automática** ✅

---

## 📊 Tabla de Decisión

| Situación | Script a Usar |
|-----------|---------------|
| Ya tengo préstamos/transacciones | `fix-accounts-categories-nextauth.sql` |
| No sé qué datos tengo | `diagnostic-check-users.sql` primero |
| No tengo ningún dato | **SOLUCIÓN 3** → obtener user_id → `fix-manual-insert.sql` |
| Tengo datos con user_id incorrecto | `fix-manual-insert.sql` OPCIÓN B |
| Todos los scripts fallan | Crear préstamo de prueba → ver user_id → manual insert |

---

## ⚠️ IMPORTANTE: Diferencia entre Auth Systems

### Supabase Auth (NO lo estás usando):
- Usa la tabla `auth.users`
- Login con email/password directo en Supabase
- Tu app NO usa esto

### NextAuth (LO QUE ESTÁS USANDO):
- Usa Google OAuth
- No almacena en `auth.users` de Supabase
- El `user_id` viene del JWT de Google
- Se almacena en la sesión de NextAuth

Por eso el script original fallaba - buscaba usuarios en la tabla equivocada.

---

## 🆘 Si Nada Funciona

Ejecuta estos comandos en orden:

### 1. Diagnóstico completo:
```sql
-- En Supabase SQL Editor
SELECT 'PRÉSTAMOS' as tabla, COUNT(*) as cantidad, user_id FROM loans GROUP BY user_id
UNION ALL
SELECT 'TRANSACCIONES', COUNT(*), user_id FROM transactions GROUP BY user_id
UNION ALL
SELECT 'CUENTAS', COUNT(*), user_id FROM accounts GROUP BY user_id
UNION ALL
SELECT 'CATEGORÍAS', COUNT(*), user_id FROM categories GROUP BY user_id;
```

### 2. En la consola del navegador (con app abierta y logueado):
```javascript
// Ver tu sesión completa
fetch('/api/auth/session').then(r => r.json()).then(console.log);
```

### 3. Comparte los resultados
Envíame:
- Output del diagnóstico SQL
- Output de la sesión de NextAuth
- Cualquier error que aparezca

---

## ✅ Checklist Post-Solución

Después de ejecutar el script correcto:

- [ ] Ejecuté el script en Supabase SQL Editor
- [ ] Vi los mensajes de éxito (✅ Cuenta creada, ✅ Categoría creada)
- [ ] Verifiqué que existen con SELECT queries
- [ ] Marqué un pago en un préstamo
- [ ] Se creó la transacción automática
- [ ] No aparece el mensaje de error "no se pudo crear transacción"
- [ ] Puedo crear nuevas categorías desde la UI
- [ ] Puedo crear ingresos y gastos normalmente

Si todos los checkboxes están marcados: **¡PROBLEMA RESUELTO!** ✅

---

## 📞 Resumen Rápido

```bash
# FLUJO RECOMENDADO:

1. Ejecutar diagnostic-check-users.sql
   ↓
2. ¿Hay datos?
   → SÍ: fix-accounts-categories-nextauth.sql
   → NO: Continuar paso 3
   ↓
3. Obtener user_id desde navegador (F12 → Console → fetch session)
   ↓
4. Usar fix-manual-insert.sql con tu user_id
   ↓
5. Verificar que funciona todo ✅
```

---

**Nota**: Los archivos de script están en la carpeta:
`C:\Users\jordi\Desktop\Proyectos IA\Control-Financiero\supabase\`
