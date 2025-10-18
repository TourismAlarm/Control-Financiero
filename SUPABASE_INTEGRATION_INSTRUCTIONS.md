# Instrucciones para Integración con Supabase

## Paso 1: Aplicar Schema en Supabase

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a "SQL Editor"
4. Abre el archivo `supabase/schema.sql`
5. Copia todo su contenido
6. Pégalo en el SQL Editor
7. Haz clic en "Run"

## Paso 2: Actualizar components/ControlFinanciero.jsx

### 2.1 Agregar import (línea 5)
Después de:
```javascript
import { Plus, Trash2, Download, Upload, Save, Calendar, AlertCircle, Moon, Sun, LogOut } from 'lucide-react';
```

Agregar:
```javascript
import { loadFinancialData, saveFinancialData } from '@/lib/financialDataSync';
```

### 2.2 Agregar useEffect para cargar datos de Supabase
Después del primer useEffect (el que carga desde localStorage), agregar:

```javascript
// Cargar datos desde Supabase si el usuario está autenticado
useEffect(() => {
  if (!user) return;

  async function loadFromSupabase() {
    try {
      console.log('🔵 Cargando datos desde Supabase...');
      const data = await loadFinancialData(mesActual);
      
      if (data && data.financialData) {
        const fd = data.financialData;
        console.log('✅ Datos cargados:', fd);
        
        if (fd.ingresos) setIngresos(fd.ingresos);
        if (fd.gastos_fijos) setGastosFijos(fd.gastos_fijos);
        if (fd.gastos_variables) setGastosVariables(fd.gastos_variables);
        if (fd.deudas) setDeudas(fd.deudas);
        if (fd.objetivos) setObjetivos(fd.objetivos);

        if ([fd.ingresos, fd.gastos_fijos, fd.gastos_variables, fd.deudas, fd.objetivos].some(
          (l) => Array.isArray(l) && l.length > 0
        )) {
          setMostrarBienvenida(false);
        }
      }
      
      if (data && data.historial) {
        setHistorialMensual(data.historial);
      }
    } catch (error) {
      console.error('❌ Error cargando desde Supabase:', error);
    }
  }

  loadFromSupabase();
}, [user, mesActual]);
```

### 2.3 Modificar useEffect de guardado (líneas ~85-93)
Reemplazar el useEffect que guarda en localStorage con:

```javascript
// Guardar datos en localStorage Y Supabase
useEffect(() => {
  if (typeof window === 'undefined') return;

  // Guardar en localStorage (cache local)
  try {
    const estado = { nombreUsuario, mesActual, ingresos, gastosFijos, gastosVariables, deudas, objetivos };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
  } catch (e) {
    console.error('Error guardando en localStorage', e);
  }

  // Guardar en Supabase si hay usuario autenticado
  if (user) {
    const saveData = async () => {
      try {
        await saveFinancialData({
          mesActual,
          ingresos,
          gastosFijos,
          gastosVariables,
          deudas,
          objetivos,
          historial: historialMensual
        });
        console.log('✅ Datos guardados en Supabase');
      } catch (error) {
        console.error('❌ Error guardando en Supabase:', error);
      }
    };
    
    // Debounce para no guardar en cada cambio
    const timeoutId = setTimeout(() => {
      saveData();
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }
}, [user, nombreUsuario, mesActual, ingresos, gastosFijos, gastosVariables, deudas, objetivos, historialMensual]);
```

### 2.4 Modificar useEffect de historial (líneas ~95-103)
Eliminar este useEffect ya que ahora el historial se guarda en el useEffect anterior junto con todos los datos.

## Paso 3: Probar

1. Ejecuta `npm run dev`
2. Inicia sesión con Google
3. Agrega algunos datos (ingresos, gastos, etc.)
4. Verifica en la consola del navegador que aparezcan mensajes:
   - "✅ Datos guardados en Supabase"
   - "✅ Datos cargados"
5. Recarga la página - los datos deberían persistir
6. Ve a Supabase Dashboard > Table Editor > financial_data
7. Deberías ver tus datos guardados

## Verificación

Para verificar que todo funciona:
- Los datos se guardan tanto en localStorage (cache) como en Supabase (persistente)
- Al recargar la página, primero se cargan desde localStorage (rápido)
- Luego se sincronizan con Supabase (actualización)
- Funciona sin internet usando localStorage
- Funciona entre dispositivos usando Supabase

