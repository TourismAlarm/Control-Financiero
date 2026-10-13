# Code Review - Control Financiero

Reporte de auditoría de código con bugs, mejoras y recomendaciones.

**Fecha:** 2025-11-22
**Rama:** claude/spanish-greeting-01Mw2T1HQqmB3ykEivwCGN3q

---

## Resumen Ejecutivo

| Severidad | Cantidad | Estado |
|-----------|----------|--------|
| **ALTA** | 5 | Pendiente |
| **MEDIA** | 20 | Pendiente |
| **BAJA** | 8 | Backlog |

---

## Bugs de Alta Prioridad

### 1. Race Condition en IDs de Toast
**Archivo:** `src/hooks/use-toast.ts:15`

**Problema:**
```typescript
// Actual - puede generar IDs duplicados
const id = Math.random().toString(36).substr(2, 9);
```

**Solución:**
```typescript
const id = crypto.randomUUID();
```

**Impacto:** Toasts pueden cancelarse entre sí bajo alta concurrencia.

---

### 2. Falta de Rate Limiting en APIs
**Archivo:** Todos los endpoints en `src/app/api/**/route.ts`

**Problema:** No hay protección contra ataques de denegación de servicio.

**Solución:**
```typescript
// middleware.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"),
});

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? "127.0.0.1";
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return new Response("Too Many Requests", { status: 429 });
  }
}
```

---

### 3. Validación de Sesión Incompleta
**Archivo:** `src/app/api/transactions/route.ts:68-71`

**Problema:**
```typescript
// Solo verifica que existe ID, no valida formato
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Solución:**
```typescript
if (!session?.user?.id || typeof session.user.id !== 'string' || session.user.id.length === 0) {
  return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
}

// Opcional: Verificar que el usuario existe en BD
const { data: user } = await supabaseAdmin
  .from('profiles')
  .select('id')
  .eq('google_id', session.user.id)
  .single();

if (!user) {
  return NextResponse.json({ error: 'User not found' }, { status: 401 });
}
```

---

### 4. Memory Leak en useToast
**Archivo:** `src/hooks/use-toast.ts:19-21`

**Problema:**
```typescript
// setTimeout no se limpia si el componente se desmonta
setTimeout(() => {
  setToasts((prev) => prev.filter((t) => t.id !== id));
}, 3000);
```

**Solución:**
```typescript
useEffect(() => {
  const timeoutIds: NodeJS.Timeout[] = [];

  toasts.forEach(toast => {
    const timeoutId = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }, 3000);
    timeoutIds.push(timeoutId);
  });

  return () => timeoutIds.forEach(id => clearTimeout(id));
}, [toasts]);
```

---

### 5. DELETE con Query Parameters
**Archivo:** `src/hooks/useTransactions.ts:140`

**Problema:**
```typescript
// Anti-pattern: ID en query params
await fetch(`/api/transactions?id=${transactionId}`, { method: 'DELETE' });
```

**Solución:**
```typescript
// RESTful: ID en path
await fetch(`/api/transactions/${transactionId}`, { method: 'DELETE' });

// En route.ts crear [id]/route.ts
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  // ...
}
```

---

## Bugs de Media Prioridad

### 6. Exposición de Errores de Base de Datos
**Archivo:** `src/app/api/accounts/route.ts:24`

**Problema:**
```typescript
return NextResponse.json({ error: error.message }, { status: 500 });
// Puede exponer: "relation \"accounts\" does not exist"
```

**Solución:**
```typescript
console.error('Database error:', error);
return NextResponse.json(
  { error: 'An internal error occurred' },
  { status: 500 }
);
```

---

### 7. Abuso de TypeScript `any`
**Archivos múltiples:**
- `src/hooks/useBudgets.ts:87, 121`
- `src/hooks/useRecurringRules.ts:118`
- `src/hooks/useSavingsGoals.ts:114`

**Problema:**
```typescript
// @ts-expect-error - Supabase types issue
const data = response.data as any;
```

**Solución:** Actualizar tipos de Supabase y usar tipos correctos:
```typescript
// src/types/database.ts - regenerar con supabase gen types
import { Database } from './supabase';
type Transaction = Database['public']['Tables']['transactions']['Row'];
```

---

### 8. Código Duplicado en Hooks
**Archivos:** `useTransactions.ts`, `useAccounts.ts`, `useBudgets.ts`

**Problema:** Lógica repetida de fetch, mutations, error handling.

**Solución:**
```typescript
// src/hooks/useApiResource.ts
export function useApiResource<T>(
  endpoint: string,
  queryKey: string[]
) {
  const query = useQuery({
    queryKey,
    queryFn: () => fetch(endpoint).then(r => r.json())
  });

  const create = useMutation({
    mutationFn: (data: Partial<T>) =>
      fetch(endpoint, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey })
  });

  // ... update, delete

  return { query, create, update, delete: remove };
}

// Uso
const transactions = useApiResource<Transaction>('/api/transactions', ['transactions']);
```

---

### 9. Funciones Muy Largas
**Archivo:** `src/components/finance/TransactionsList.tsx:81-160`

**Problema:** `handleDelete` tiene 80+ líneas con lógica de préstamos mezclada.

**Solución:**
```typescript
// Extraer en funciones separadas
async function handleDelete(transactionId: string) {
  const transaction = transactions.find(t => t.id === transactionId);

  if (isLoanTransaction(transaction)) {
    await handleLoanTransactionDeletion(transaction);
  }

  await deleteTransaction(transactionId);
  showSuccessToast('Transacción eliminada');
}

function isLoanTransaction(t: Transaction): boolean {
  return t.description?.startsWith('Pago préstamo:') ?? false;
}

async function handleLoanTransactionDeletion(t: Transaction) {
  // Lógica específica de préstamos
}
```

---

### 10. Re-renders Innecesarios
**Archivo:** `src/components/finance/Statistics.tsx:38-39`

**Problema:**
```typescript
// Dos llamadas separadas causan dos queries
const { transactions } = useTransactions(selectedMonth);
const { transactions: allTransactions } = useTransactions();
```

**Solución:**
```typescript
// Una sola query, filtrar en cliente si es necesario
const { transactions } = useTransactions();

const monthlyTransactions = useMemo(
  () => transactions.filter(t => t.date.startsWith(selectedMonth)),
  [transactions, selectedMonth]
);
```

---

### 11. Query Ineficiente para Mes Financiero
**Archivo:** `src/hooks/useTransactions.ts:44-55`

**Problema:** Descarga TODAS las transacciones y filtra en cliente.

**Solución:**
```typescript
// Calcular rango en servidor
const params = new URLSearchParams();
if (financialMonthStartDay !== 1) {
  const { startDate, endDate } = calculateFinancialMonthRange(month, financialMonthStartDay);
  params.append('startDate', startDate);
  params.append('endDate', endDate);
} else {
  params.append('month', month);
}
```

---

### 12. Falta de Memoización
**Archivo:** `src/components/charts/CategoryDistribution.tsx:31-49`

**Problema:** Agregación de categorías en cada render.

**Solución:**
```typescript
const chartData = useMemo(() => {
  const categoryData: Record<string, ChartDataItem> = {};

  transactions
    .filter(t => t.type === type)
    .forEach(t => {
      const category = t.category?.name || 'Sin categoría';
      if (!categoryData[category]) {
        categoryData[category] = { name: category, value: 0, color: t.category?.color };
      }
      categoryData[category].value += Math.abs(t.amount);
    });

  return Object.values(categoryData)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}, [transactions, type]);
```

---

### 13. Sincronización Offline Frágil
**Archivo:** `src/lib/offline/syncQueue.ts:96-116`

**Problema:** Solo 3 reintentos sin backoff exponencial.

**Solución:**
```typescript
async function syncWithRetry(item: QueueItem, maxRetries = 5): Promise<boolean> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await syncItem(item);
      return true;
    } catch (error) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
      console.log(`Retry ${attempt + 1}/${maxRetries} in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return false;
}
```

---

### 14. IndexedDB Sync Bloqueante
**Archivo:** `src/lib/offline/syncQueue.ts:56-78`

**Problema:**
```typescript
// Secuencial - lento
for (const item of queue) {
  await this.syncItem(item);
}
```

**Solución:**
```typescript
// Paralelo con límite de concurrencia
const BATCH_SIZE = 5;
for (let i = 0; i < queue.length; i += BATCH_SIZE) {
  const batch = queue.slice(i, i + BATCH_SIZE);
  await Promise.allSettled(batch.map(item => this.syncItem(item)));
}
```

---

### 15. Falta de CSRF Protection
**Archivos:** Todas las APIs con POST/PUT/DELETE

**Solución:**
```typescript
// En next.config.js
module.exports = {
  async headers() {
    return [{
      source: '/api/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
      ]
    }];
  }
};

// O usar next-auth CSRF token automático
```

---

## Bugs de Baja Prioridad

### 16. Logging No Estructurado
**Problema:** `console.log()` con emojis, imposible parsear.

**Solución:**
```typescript
// src/lib/logger.ts
export const logger = {
  info: (msg: string, data?: object) =>
    console.log(JSON.stringify({ level: 'info', msg, ...data, timestamp: new Date().toISOString() })),
  error: (msg: string, error?: Error, data?: object) =>
    console.error(JSON.stringify({ level: 'error', msg, error: error?.message, ...data, timestamp: new Date().toISOString() }))
};
```

---

### 17. Falta de Tests
**Problema:** No hay tests unitarios o de integración.

**Solución:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

```typescript
// src/hooks/__tests__/useTransactions.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useTransactions } from '../useTransactions';

describe('useTransactions', () => {
  it('should fetch transactions for given month', async () => {
    const { result } = renderHook(() => useTransactions('2025-11'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.transactions).toBeDefined();
  });
});
```

---

### 18. Tipos TypeScript Débiles
**Archivo:** `src/lib/validations/schemas.ts`

**Problema:**
```typescript
user_id: z.string() // Demasiado permisivo
```

**Solución:**
```typescript
// Google ID es numérico como string
user_id: z.string().regex(/^[0-9]+$/, {
  message: 'Invalid Google ID format'
})
```

---

### 19. Falta de Optimistic Updates
**Archivos:** Todos los hooks de mutación

**Solución:**
```typescript
const deleteMutation = useMutation({
  mutationFn: deleteTransaction,
  onMutate: async (transactionId) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['transactions'] });

    // Snapshot current data
    const previous = queryClient.getQueryData(['transactions']);

    // Optimistically update
    queryClient.setQueryData(['transactions'], (old: Transaction[]) =>
      old.filter(t => t.id !== transactionId)
    );

    return { previous };
  },
  onError: (err, id, context) => {
    // Rollback on error
    queryClient.setQueryData(['transactions'], context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  }
});
```

---

### 20. Manejo de Edge Cases Incompleto
**Archivo:** `src/components/finance/BudgetOverview.tsx:287-289`

**Problema:**
```typescript
const usage = getBudgetUsage(budget.id);
// usage puede ser null
```

**Solución:**
```typescript
const usage = budget.id ? getBudgetUsage(budget.id) : null;

if (usage === null) {
  return (
    <div className="text-gray-500">
      No hay datos de uso disponibles
    </div>
  );
}
```

---

## Plan de Acción

### Sprint 1 (Crítico)
- [ ] Fix race condition en Toast IDs
- [ ] Implementar rate limiting básico
- [ ] Reforzar validación de sesión
- [ ] Fix memory leak en useToast
- [ ] Migrar DELETE a path params

### Sprint 2 (Importante)
- [ ] Crear hook genérico `useApiResource`
- [ ] Ocultar errores de BD sensibles
- [ ] Corregir tipos TypeScript (`any` → tipos correctos)
- [ ] Agregar memoización a componentes de charts
- [ ] Implementar backoff exponencial en sync

### Sprint 3 (Mejoras)
- [ ] Agregar tests unitarios para hooks
- [ ] Implementar optimistic updates
- [ ] Refactorizar funciones largas
- [ ] Mejorar logging estructurado
- [ ] Agregar CSRF protection

---

## Métricas de Calidad Objetivo

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Test Coverage | 0% | 70% |
| TypeScript `any` | 15+ | 0 |
| Bugs Críticos | 5 | 0 |
| Tiempo de Build | ~30s | <20s |
| Bundle Size | ~500KB | <400KB |

---

**Próxima revisión:** Diciembre 2025
