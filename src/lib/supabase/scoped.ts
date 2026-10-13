/**
 * Cliente de navegador con la misma forma que supabase-js para las consultas
 * que usan los hooks (from/select/insert/update/delete/eq/order/limit/single),
 * pero que manda todo a /api/db, donde el servidor comprueba la sesión y
 * limita cada consulta a las filas del usuario.
 */

type Op = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'is';

/** Filas (array) u objeto (con single); tipado laxo como el de supabase-js sin genéricos. */
type Loose = any[] & { [key: string]: any };

interface DbResult<T = Loose> {
  data: T;
  error: { message: string; code?: string } | null;
}

class ScopedQuery<T = Loose> implements PromiseLike<DbResult<T>> {
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private selectCols?: string;
  private values?: unknown;
  private filters: { column: string; op: Op; value: unknown }[] = [];
  private orders: { column: string; ascending: boolean }[] = [];
  private limitN?: number;
  private singleMode?: 'single' | 'maybeSingle';

  constructor(private table: string) {}

  select(columns = '*') {
    // Tras insert/update, select() indica qué devolver; la acción no cambia
    this.selectCols = columns;
    return this;
  }
  insert(values: unknown) {
    this.action = 'insert';
    this.values = values;
    return this;
  }
  update(values: unknown) {
    this.action = 'update';
    this.values = values;
    return this;
  }
  delete() {
    this.action = 'delete';
    return this;
  }

  private add(op: Op, column: string, value: unknown) {
    this.filters.push({ column, op, value });
    return this;
  }
  eq(c: string, v: unknown) { return this.add('eq', c, v); }
  neq(c: string, v: unknown) { return this.add('neq', c, v); }
  gt(c: string, v: unknown) { return this.add('gt', c, v); }
  gte(c: string, v: unknown) { return this.add('gte', c, v); }
  lt(c: string, v: unknown) { return this.add('lt', c, v); }
  lte(c: string, v: unknown) { return this.add('lte', c, v); }
  in(c: string, v: unknown[]) { return this.add('in', c, v); }
  is(c: string, v: unknown) { return this.add('is', c, v); }

  order(column: string, opts: { ascending?: boolean } = {}) {
    this.orders.push({ column, ascending: opts.ascending ?? true });
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  single() {
    this.singleMode = 'single';
    return this;
  }
  maybeSingle() {
    this.singleMode = 'maybeSingle';
    return this;
  }

  private async run(): Promise<DbResult<T>> {
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: this.table,
          action: this.action,
          select: this.selectCols,
          values: this.values,
          filters: this.filters,
          order: this.orders,
          limit: this.limitN,
          single: this.singleMode,
        }),
      });
      const body = await res.json().catch(() => ({ data: null, error: { message: res.statusText } }));
      return { data: body.data as T, error: body.error ?? null };
    } catch (err) {
      return { data: null as T, error: { message: err instanceof Error ? err.message : 'Error de red' } };
    }
  }

  then<R1 = DbResult<T>, R2 = never>(
    onfulfilled?: ((value: DbResult<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
  ): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

const client = {
  from: <T = Loose>(table: string) => new ScopedQuery<T>(table),
};

/** Siempre la misma instancia (algunos hooks la usan como dependencia de efectos). */
export function createScopedClient() {
  return client;
}
