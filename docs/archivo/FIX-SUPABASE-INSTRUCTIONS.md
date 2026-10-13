# 🔧 INSTRUCCIONES PARA ARREGLAR SUPABASE

## 🚨 PROBLEMA IDENTIFICADO

Los datos NO se guardan en Supabase porque las **políticas RLS (Row Level Security)** están bloqueando los INSERT/UPDATE.

Las políticas usan `current_setting('app.current_user_id')` pero el código cliente nunca configura este valor.

## ✅ SOLUCIÓN: Aplicar Nuevo Schema

### PASO 1: Ir a Supabase Dashboard

1. Abre tu proyecto en Supabase: https://supabase.com/dashboard
2. Ve a **SQL Editor** en el menú lateral

### PASO 2: Ejecutar el Nuevo Schema

1. Copia TODO el contenido del archivo: `supabase/schema-simple.sql`
2. Pégalo en el SQL Editor de Supabase
3. Click en **RUN** (botón verde abajo a la derecha)
4. Verifica que diga "Success. No rows returned"

### PASO 3: Verificar Tablas Creadas

1. Ve a **Table Editor** en el menú lateral
2. Deberías ver 3 tablas:
   - ✅ `financial_data`
   - ✅ `monthly_history`
   - ✅ `loans`

### PASO 4: Verificar RLS Deshabilitado

1. Click en cada tabla
2. Ve a la pestaña "RLS"
3. Verifica que diga: **"Row Level Security is disabled"**

### PASO 5: Probar la Aplicación

1. Abre la app (local o Vercel)
2. Inicia sesión con Google
3. Agrega un ingreso o gasto
4. Ve a Supabase → Table Editor → `financial_data`
5. **DEBERÍAS VER** tu registro guardado ✅

## 📊 Verificar Datos en Supabase

### Ver datos en SQL Editor:

```sql
-- Ver todos los datos financieros
SELECT * FROM financial_data ORDER BY updated_at DESC;

-- Ver datos específicos de un usuario
SELECT user_id, mes_actual, ingresos, gastos_fijos
FROM financial_data
WHERE user_id = 'TU_USER_ID';

-- Contar registros
SELECT COUNT(*) FROM financial_data;
```

## 🔍 Si AÚN NO Funciona

### Debug en el Navegador (F12):

1. Abre la consola del navegador (F12 → Console)
2. Busca estos logs cuando agregues un ingreso:
   ```
   🟢 useEffect de GUARDADO ejecutado!
   🔵 Iniciando guardado de datos...
   🔵 User ID de sesión: [debe mostrar un ID]
   🔵 Preparando datos para guardar...
   🔵 Ejecutando upsert...
   ✅ Datos guardados exitosamente: [debe ser null o mostrar datos]
   ❌ Error al guardar: [debe ser null]
   ```

3. Si ves `❌ Error al guardar:` con un mensaje, **cópialo y envíamelo**

### Verificar Credenciales:

1. Verifica en Vercel → Settings → Environment Variables:
   - ✅ `NEXT_PUBLIC_SUPABASE_URL`
   - ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. Verifica que sean las mismas que en tu `.env.local`

## 🛡️ Nota de Seguridad

**IMPORTANTE**: Este schema tiene RLS deshabilitado para simplificar el desarrollo.

Para producción deberías:
1. Habilitar RLS
2. Usar Supabase Auth correctamente
3. Configurar políticas que usen `auth.uid()`

Pero por ahora, para que funcione, está deshabilitado.

## 📝 Resumen de Cambios

- ❌ Eliminado: Foreign key a tabla `users` (no existe)
- ❌ Eliminado: Políticas RLS con `current_setting()`
- ✅ Agregado: RLS deshabilitado para desarrollo
- ✅ Agregado: Índices para mejor rendimiento
- ✅ Agregado: Tabla `loans` para préstamos

## 🎯 Resultado Esperado

Después de aplicar este schema:
- Los datos SE GUARDAN en Supabase ✅
- Los datos PERSISTEN entre dispositivos ✅
- Los datos PERSISTEN al recargar ✅
- Puedes VER los datos en Supabase Table Editor ✅
