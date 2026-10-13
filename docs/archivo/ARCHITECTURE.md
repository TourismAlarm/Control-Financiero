# Arquitectura del Sistema - Control Financiero

## Visión General

Control Financiero sigue una arquitectura modular basada en capas, utilizando Next.js App Router como framework principal y Supabase como backend.

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTE (Browser)                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Next.js App Router                        ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ ││
│  │  │   Pages     │  │ Components  │  │   Providers         │ ││
│  │  │  (app/)     │  │  (UI/UX)    │  │ Session/Query/User  │ ││
│  │  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ ││
│  │         │                │                     │            ││
│  │  ┌──────▼─────────────────▼─────────────────────▼──────────┐││
│  │  │                  Custom Hooks                           │││
│  │  │  useTransactions │ useBudgets │ useLoans │ useAccounts  │││
│  │  │  useFinancialSummary │ useRecurringRules │ useSavingsGoals ││
│  │  └──────────────────────────┬──────────────────────────────┘││
│  │                             │                               ││
│  │  ┌──────────────────────────▼──────────────────────────────┐││
│  │  │              TanStack Query (Cache Layer)               │││
│  │  └──────────────────────────┬──────────────────────────────┘││
│  └─────────────────────────────┼───────────────────────────────┘│
└────────────────────────────────┼────────────────────────────────┘
                                 │ HTTP/REST
┌────────────────────────────────▼────────────────────────────────┐
│                         SERVIDOR (API)                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    API Routes (app/api/)                     ││
│  │  /transactions │ /accounts │ /categories │ /loans │ /auth   ││
│  └──────────────────────────┬──────────────────────────────────┘│
│                             │                                    │
│  ┌──────────────────────────▼──────────────────────────────────┐│
│  │              Supabase Admin Client                           ││
│  │              (SERVICE_ROLE_KEY)                              ││
│  └──────────────────────────┬──────────────────────────────────┘│
└─────────────────────────────┼───────────────────────────────────┘
                              │ PostgreSQL
┌─────────────────────────────▼───────────────────────────────────┐
│                      SUPABASE (Backend)                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    PostgreSQL Database                       ││
│  │  profiles │ accounts │ transactions │ categories │ budgets  ││
│  │  loans │ loan_payments │ savings_goals │ recurring_rules    ││
│  └─────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

## Capas de la Arquitectura

### 1. Capa de Presentación (UI)

**Ubicación:** `src/components/`

```
components/
├── finance/           # Componentes financieros principales
│   ├── TransactionForm.tsx
│   ├── TransactionsList.tsx
│   ├── FinancialDashboard.tsx
│   ├── AccountsManager.tsx
│   ├── BudgetOverview.tsx
│   ├── RecurringTransactions.tsx
│   ├── SavingsGoals.tsx
│   └── Statistics.tsx
├── charts/            # Gráficos y análisis visual
│   ├── PatternDetector.tsx      # Detección de anomalías
│   ├── ExpenseProjection.tsx    # Proyecciones
│   ├── CategoryDistribution.tsx # Distribución
│   └── MonthlyTrends.tsx        # Tendencias
├── loans/             # Gestión de préstamos
│   ├── LoansList.tsx
│   ├── LoanForm.tsx
│   ├── LoanDetails.tsx
│   ├── PaymentForm.tsx
│   └── AmortizationTable.tsx
└── import/            # Importación de datos
    └── CSVImporter.tsx
```

### 2. Capa de Estado (State Management)

**Ubicación:** `src/hooks/`

Utilizamos TanStack Query para gestión de estado servidor con caching inteligente.

```typescript
// Configuración del QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,     // Cache válido 1 minuto
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

**Hooks disponibles:**

| Hook | Responsabilidad | Query Keys |
|------|-----------------|------------|
| `useTransactions` | CRUD transacciones, totales, filtros | `['transactions', month]` |
| `useAccounts` | CRUD cuentas, balances | `['accounts']` |
| `useBudgets` | CRUD presupuestos, alertas | `['budgets', month]` |
| `useLoans` | CRUD préstamos, pagos | `['loans']` |
| `useFinancialSummary` | Agregaciones, health score | `['summary', month]` |
| `useRecurringRules` | Reglas recurrentes | `['recurring']` |
| `useSavingsGoals` | Metas de ahorro | `['savings-goals']` |
| `useCategories` | CRUD categorías | `['categories']` |

### 3. Capa de Validación

**Ubicación:** `src/lib/validations/schemas.ts`

Esquemas Zod para validación type-safe:

```typescript
// Ejemplo de esquema
export const transactionInsertSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  description: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category_id: z.string().uuid().optional(),
  account_id: z.string().uuid(),
});
```

### 4. Capa de API (Backend)

**Ubicación:** `src/app/api/`

APIs REST con Next.js Route Handlers:

```
api/
├── auth/
│   └── [...nextauth]/     # NextAuth endpoints
│       └── route.ts
├── transactions/
│   └── route.ts           # GET, POST, PUT, DELETE
├── accounts/
│   └── route.ts
├── categories/
│   └── route.ts
├── loans/
│   ├── route.ts
│   └── [id]/
│       └── payments/
│           └── route.ts
└── financial-data/
    └── route.ts
```

**Patrón de API Route:**

```typescript
// Ejemplo: GET /api/transactions
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('user_id', session.user.id);

  return NextResponse.json(data);
}
```

### 5. Capa de Base de Datos

**Tecnología:** Supabase (PostgreSQL)

#### Diagrama ER Simplificado

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   profiles   │     │   accounts   │     │  categories  │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (PK)      │     │ id (PK)      │     │ id (PK)      │
│ google_id    │◄────│ user_id (FK) │     │ user_id (FK) │
│ email        │     │ name         │     │ name         │
│ name         │     │ type         │     │ type         │
│ payday       │     │ balance      │     │ icon         │
└──────────────┘     │ currency     │     │ color        │
       ▲             └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │             ┌──────▼───────┐            │
       │             │ transactions │            │
       └─────────────┤──────────────├────────────┘
                     │ id (PK)      │
                     │ user_id (FK) │
                     │ account_id   │
                     │ category_id  │
                     │ type         │
                     │ amount       │
                     │ description  │
                     │ date         │
                     └──────────────┘

┌──────────────┐     ┌──────────────┐
│    loans     │────►│loan_payments │
├──────────────┤     ├──────────────┤
│ id (PK)      │     │ id (PK)      │
│ user_id (FK) │     │ loan_id (FK) │
│ name         │     │ amount       │
│ principal    │     │ date         │
│ interest     │     │ principal    │
│ term_months  │     │ interest     │
└──────────────┘     └──────────────┘

┌──────────────┐     ┌──────────────┐
│   budgets    │     │savings_goals │
├──────────────┤     ├──────────────┤
│ id (PK)      │     │ id (PK)      │
│ user_id (FK) │     │ user_id (FK) │
│ category_id  │     │ name         │
│ amount       │     │ target       │
│ month        │     │ current      │
│ year         │     │ deadline     │
└──────────────┘     └──────────────┘
```

## Flujo de Datos

### Lectura de Datos

```
1. Usuario navega a dashboard
2. Componente llama useTransactions('2025-01')
3. Hook verifica cache de TanStack Query
4. Si stale → fetch('/api/transactions?month=2025-01')
5. API valida sesión con NextAuth
6. Supabase Admin consulta PostgreSQL
7. Datos retornan y se cachean
8. Componente renderiza
```

### Escritura de Datos

```
1. Usuario envía formulario
2. React Hook Form valida con Zod
3. Hook llama mutation (createTransaction)
4. POST /api/transactions con body
5. API valida sesión y datos
6. Supabase Admin inserta en DB
7. Mutation invalida queries relacionadas
8. UI se actualiza automáticamente
```

## Providers y Context

```typescript
// src/components/Providers.tsx
<UserProvider>              // Contexto de usuario
  <SessionProvider>         // NextAuth session
    <QueryClientProvider>   // TanStack Query cache
      {children}
      <ReactQueryDevtools /> // Debug en desarrollo
    </QueryClientProvider>
  </SessionProvider>
</UserProvider>
```

## Sistemas Inteligentes

Los "agentes" son componentes React con lógica de análisis:

| Sistema | Archivo | Algoritmo |
|---------|---------|-----------|
| Pattern Detector | `charts/PatternDetector.tsx` | Desviación estándar (>2σ) |
| Expense Projection | `charts/ExpenseProjection.tsx` | Regresión lineal |
| Auto-Categorización | `lib/categorization/autoCategorize.ts` | Matching por keywords |
| Health Score | `hooks/useFinancialSummary.ts` | Fórmula ponderada |

## Seguridad

### Autenticación

```
NextAuth + Google OAuth
        │
        ▼
┌──────────────────┐
│  Session Token   │
│  (JWT/Database)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  user.id =       │
│  google_id       │
└──────────────────┘
```

### Autorización

- Cada API verifica `session.user.id`
- Todas las queries filtran por `user_id`
- RLS deshabilitado (desarrollo) - activar en producción

## Rendimiento

### Estrategias Implementadas

1. **Caching**: TanStack Query con staleTime de 60s
2. **Precisión monetaria**: Decimal.js evita errores de flotantes
3. **Lazy loading**: Componentes se cargan bajo demanda
4. **Query invalidation**: Solo se refetch lo necesario

### Métricas Target

| Métrica | Objetivo |
|---------|----------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| API Response Time | < 200ms |

## Escalabilidad

### Actual (MVP)
- Single tenant
- Un usuario por instancia
- PostgreSQL directo

### Futuro
- Multi-tenant con RLS
- Conexiones pooling
- Edge functions para cálculos pesados
- Redis para cache distribuido

---

**Última actualización:** Noviembre 2025
