# API Documentation - Control Financiero

Este documento describe los endpoints REST disponibles en la aplicación Control Financiero.

## Información General

### Base URL
```
http://localhost:3000/api
```

### Autenticación
Todas las APIs requieren autenticación mediante NextAuth. La sesión se valida automáticamente usando cookies de sesión.

```typescript
// Verificación de autenticación en cada endpoint
const session = await getServerSession(authOptions);
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Headers Requeridos
```
Content-Type: application/json
Cookie: next-auth.session-token=...
```

### Formato de Respuesta
Todas las respuestas son JSON con la siguiente estructura:

**Éxito:**
```json
{
  "id": "uuid",
  "...campos"
}
```

**Error:**
```json
{
  "error": "Mensaje de error"
}
```

---

## Endpoints

### Transactions (Transacciones)

#### GET /api/transactions
Obtiene todas las transacciones del usuario autenticado.

**Query Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| month | string | No | Mes (1-12) |
| year | string | No | Año (ej: 2025) |
| type | string | No | "income" o "expense" |

**Ejemplo:**
```bash
GET /api/transactions?month=11&year=2025&type=expense
```

**Respuesta (200):**
```json
[
  {
    "id": "uuid",
    "user_id": "google-id",
    "account_id": "uuid",
    "category_id": "uuid",
    "type": "expense",
    "amount": 50.00,
    "description": "Supermercado",
    "date": "2025-11-15",
    "created_at": "2025-11-15T10:30:00Z"
  }
]
```

---

#### POST /api/transactions
Crea una nueva transacción.

**Body:**
```json
{
  "account_id": "uuid",
  "category_id": "uuid",
  "type": "expense",
  "amount": 50.00,
  "description": "Supermercado",
  "date": "2025-11-15"
}
```

**Campos Requeridos:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| account_id | uuid | ID de la cuenta |
| type | string | "income" o "expense" |
| amount | number | Monto (positivo) |
| date | string | Fecha (YYYY-MM-DD) |

**Campos Opcionales:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| category_id | uuid | ID de la categoría |
| description | string | Descripción de la transacción |

**Respuesta (201):**
```json
{
  "id": "uuid-generado",
  "user_id": "google-id",
  "account_id": "uuid",
  "type": "expense",
  "amount": 50.00,
  "description": "Supermercado",
  "date": "2025-11-15",
  "created_at": "2025-11-15T10:30:00Z"
}
```

---

#### PUT /api/transactions
Actualiza una transacción existente.

**Body:**
```json
{
  "id": "uuid-de-transaccion",
  "amount": 75.00,
  "description": "Supermercado (actualizado)"
}
```

**Respuesta (200):**
```json
{
  "id": "uuid",
  "amount": 75.00,
  "description": "Supermercado (actualizado)",
  "..."
}
```

**Errores:**
- `400`: ID de transacción requerido
- `404`: Transacción no encontrada o no autorizado

---

#### DELETE /api/transactions
Elimina una transacción.

**Query Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| id | uuid | Sí | ID de la transacción |

**Ejemplo:**
```bash
DELETE /api/transactions?id=uuid-de-transaccion
```

**Respuesta (200):**
```json
{
  "success": true
}
```

---

### Accounts (Cuentas)

#### GET /api/accounts
Obtiene todas las cuentas del usuario.

**Respuesta (200):**
```json
[
  {
    "id": "uuid",
    "user_id": "google-id",
    "name": "Cuenta Principal",
    "type": "checking",
    "balance": 1500.00,
    "currency": "EUR",
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

---

#### POST /api/accounts
Crea una nueva cuenta.

**Body:**
```json
{
  "name": "Cuenta de Ahorro",
  "type": "savings",
  "balance": 0,
  "currency": "EUR"
}
```

**Tipos de Cuenta Válidos:**
- `checking` - Cuenta corriente
- `savings` - Cuenta de ahorro
- `credit` - Tarjeta de crédito
- `cash` - Efectivo
- `investment` - Inversiones

**Respuesta (201):**
```json
{
  "id": "uuid-generado",
  "name": "Cuenta de Ahorro",
  "type": "savings",
  "balance": 0,
  "currency": "EUR",
  "..."
}
```

---

#### PUT /api/accounts
Actualiza una cuenta existente.

**Body:**
```json
{
  "id": "uuid-de-cuenta",
  "name": "Cuenta Principal Actualizada",
  "balance": 2000.00
}
```

---

#### DELETE /api/accounts
Elimina una cuenta.

**Query Parameters:**

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| id | uuid | Sí |

---

### Categories (Categorías)

#### GET /api/categories
Obtiene todas las categorías del usuario.

**Respuesta (200):**
```json
[
  {
    "id": "uuid",
    "user_id": "google-id",
    "name": "Alimentación",
    "type": "expense",
    "icon": "shopping-cart",
    "color": "#10B981"
  }
]
```

---

#### POST /api/categories
Crea una nueva categoría.

**Body:**
```json
{
  "name": "Entretenimiento",
  "type": "expense",
  "icon": "film",
  "color": "#8B5CF6"
}
```

---

#### PUT /api/categories
Actualiza una categoría.

---

#### DELETE /api/categories
Elimina una categoría.

---

### Loans (Préstamos)

#### GET /api/loans
Obtiene todos los préstamos del usuario.

**Respuesta (200):**
```json
[
  {
    "id": "uuid",
    "user_id": "google-id",
    "name": "Préstamo Coche",
    "principal": 15000.00,
    "interest_rate": 5.5,
    "term_months": 60,
    "start_date": "2025-01-01",
    "monthly_payment": 285.50,
    "remaining_balance": 12000.00,
    "status": "active"
  }
]
```

---

#### POST /api/loans
Crea un nuevo préstamo.

**Body:**
```json
{
  "name": "Préstamo Personal",
  "principal": 10000.00,
  "interest_rate": 7.5,
  "term_months": 36,
  "start_date": "2025-11-01"
}
```

---

#### GET /api/loans/[id]/payments
Obtiene los pagos de un préstamo específico.

---

#### POST /api/loans/[id]/payments
Registra un pago de préstamo.

**Body:**
```json
{
  "amount": 285.50,
  "date": "2025-11-15",
  "principal_amount": 250.00,
  "interest_amount": 35.50
}
```

---

### Financial Data (Datos Financieros)

#### GET /api/financial-data
Obtiene resumen financiero agregado.

**Query Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| month | string | Mes (1-12) |
| year | string | Año |

**Respuesta (200):**
```json
{
  "totalIncome": 3000.00,
  "totalExpenses": 2000.00,
  "balance": 1000.00,
  "savingsRate": 33.33,
  "transactionCount": 45,
  "categoryBreakdown": [
    {
      "category": "Alimentación",
      "amount": 500.00,
      "percentage": 25
    }
  ]
}
```

---

### Auth (Autenticación)

#### GET /api/auth/session
Obtiene la sesión actual del usuario.

**Respuesta (200):**
```json
{
  "user": {
    "id": "google-id",
    "name": "Usuario",
    "email": "usuario@gmail.com",
    "image": "https://..."
  },
  "expires": "2025-12-21T00:00:00Z"
}
```

---

#### GET /api/auth/signin
Redirige al flujo de login de Google OAuth.

---

#### GET /api/auth/signout
Cierra la sesión del usuario.

---

### Test (Solo Desarrollo)

#### GET /api/test/user
Verifica el usuario en la base de datos.

**Respuesta (200):**
```json
{
  "session": { "user": { "id": "...", "email": "..." } },
  "dbUser": { "id": "...", "google_id": "...", "email": "..." }
}
```

---

## Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200 | OK - Solicitud exitosa |
| 201 | Created - Recurso creado exitosamente |
| 400 | Bad Request - Datos inválidos o faltantes |
| 401 | Unauthorized - No autenticado |
| 404 | Not Found - Recurso no encontrado |
| 500 | Internal Server Error - Error del servidor |

---

## Validación con Zod

Todos los endpoints utilizan esquemas Zod para validación:

```typescript
// Ejemplo de esquema de transacción
export const transactionInsertSchema = z.object({
  user_id: z.string(),
  account_id: z.string().uuid(),
  category_id: z.string().uuid().optional().nullable(),
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
```

---

## Ejemplos de Uso

### Con fetch (JavaScript)

```javascript
// GET - Obtener transacciones
const response = await fetch('/api/transactions?month=11&year=2025');
const transactions = await response.json();

// POST - Crear transacción
const newTransaction = await fetch('/api/transactions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    account_id: 'uuid',
    type: 'expense',
    amount: 50,
    description: 'Compra',
    date: '2025-11-15'
  })
});

// PUT - Actualizar transacción
await fetch('/api/transactions', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'uuid',
    amount: 75
  })
});

// DELETE - Eliminar transacción
await fetch('/api/transactions?id=uuid', {
  method: 'DELETE'
});
```

### Con TanStack Query (React)

```typescript
// En los hooks del proyecto
import { useTransactions } from '@/hooks/useTransactions';

function MyComponent() {
  const {
    transactions,
    isLoading,
    createTransaction,
    updateTransaction,
    deleteTransaction
  } = useTransactions('2025-11');

  // Crear
  createTransaction.mutate({
    account_id: 'uuid',
    type: 'expense',
    amount: 50,
    date: '2025-11-15'
  });

  // Actualizar
  updateTransaction.mutate({
    id: 'uuid',
    amount: 75
  });

  // Eliminar
  deleteTransaction.mutate('uuid');
}
```

---

## Seguridad

### Medidas Implementadas

1. **Autenticación obligatoria**: Todos los endpoints verifican la sesión
2. **Filtrado por user_id**: Las queries siempre filtran por el ID del usuario autenticado
3. **Verificación de propiedad**: Antes de UPDATE/DELETE se verifica que el recurso pertenezca al usuario
4. **Validación de entrada**: Zod valida todos los datos de entrada
5. **Sanitización**: Los datos se parsean y validan antes de cualquier operación

### Ejemplo de Verificación de Propiedad

```typescript
// Verificar que el recurso pertenece al usuario antes de modificar
const { data: existing } = await supabaseAdmin
  .from('transactions')
  .select('id')
  .eq('id', id)
  .eq('user_id', session.user.id)
  .single();

if (!existing) {
  return NextResponse.json(
    { error: 'Not found or unauthorized' },
    { status: 404 }
  );
}
```

---

**Última actualización:** Noviembre 2025
