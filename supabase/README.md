# Supabase Database Setup

## Instrucciones para aplicar el schema

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto "Control Financiero"
3. Ve a la sección "SQL Editor" en el menú lateral
4. Crea una nueva query
5. Copia todo el contenido de `schema.sql` y pégalo en el editor
6. Haz clic en "Run" para ejecutar el schema

## Tablas creadas

### `financial_data`
Almacena los datos financieros del usuario por mes:
- ingresos
- gastos_fijos
- gastos_variables
- deudas
- objetivos

### `monthly_history`
Almacena el historial mensual del usuario

## Seguridad

- Row Level Security (RLS) habilitado
- Los usuarios solo pueden ver/editar sus propios datos
- Relación con la tabla `users` via `google_id`
