import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST /api/db — pasarela para los hooks que antes hablaban directamente con
 * Supabase desde el navegador. Ahora la BD tiene RLS activado y sin políticas,
 * así que la clave pública no puede leer nada; solo el servidor.
 *
 * Seguridad:
 *  - Solo tablas de la lista blanca.
 *  - Toda lectura/escritura se limita al usuario de la sesión (columna dueño).
 *  - En insert se fuerza el dueño; en update no se puede cambiar.
 *  - Solo filtros simples sobre nombres de columna válidos.
 */

const OWNER_COLUMN: Record<string, string> = {
  profiles: 'id',
  agent_notifications: 'user_id',
  savings_goals: 'user_id',
  recurring_rules: 'user_id',
  loans: 'user_id',
  loan_payments: 'user_id',
  budgets: 'user_id',
};

const column = z.string().regex(/^[a-z_][a-z0-9_]*$/);

const requestSchema = z.object({
  table: z.string().refine((t) => t in OWNER_COLUMN, 'Tabla no permitida'),
  action: z.enum(['select', 'insert', 'update', 'delete']),
  // Permite embebidos tipo "*, categories(*)" pero nada más exótico
  select: z.string().regex(/^[a-z0-9_*,()\s:!.]*$/).max(300).optional(),
  values: z.union([z.record(z.string(), z.unknown()), z.array(z.record(z.string(), z.unknown()))]).optional(),
  filters: z
    .array(
      z.object({
        column,
        op: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is']),
        value: z.unknown(),
      })
    )
    .max(20)
    .default([]),
  order: z.array(z.object({ column, ascending: z.boolean().default(true) })).max(5).default([]),
  limit: z.number().int().positive().max(5000).optional(),
  single: z.enum(['single', 'maybeSingle']).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: { message: 'No autorizado' } }, { status: 401 });
  }
  const userId = session.user.id;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: { message: 'Petición no válida' } }, { status: 400 });
  }
  const req = parsed.data;
  const owner = OWNER_COLUMN[req.table]!;

  if (req.table === 'profiles' && (req.action === 'insert' || req.action === 'delete')) {
    return NextResponse.json({ data: null, error: { message: 'Operación no permitida' } }, { status: 403 });
  }

  const table = supabaseAdmin.from(req.table);
  // El tipado genérico de supabase-js no permite construir la consulta dinámicamente
  let query: any;

  switch (req.action) {
    case 'select':
      query = table.select(req.select || '*');
      break;
    case 'insert': {
      const rows = (Array.isArray(req.values) ? req.values : [req.values ?? {}]).map((v) => ({ ...v, [owner]: userId }));
      query = table.insert(Array.isArray(req.values) ? rows : rows[0]!).select(req.select || '*');
      break;
    }
    case 'update': {
      if (!req.values || Array.isArray(req.values)) {
        return NextResponse.json({ data: null, error: { message: 'Faltan valores' } }, { status: 400 });
      }
      const { [owner]: _ignored, ...values } = req.values;
      query = table.update(values).select(req.select || '*');
      break;
    }
    case 'delete':
      query = table.delete();
      break;
  }

  if (req.action !== 'insert') {
    // Siempre limitado a tus filas (en insert ya se ha forzado el dueño)
    query = query.eq(owner, userId);

    for (const f of req.filters) {
      query = f.op === 'in' ? query.in(f.column, Array.isArray(f.value) ? f.value : [f.value]) : query[f.op](f.column, f.value);
    }
  }
  for (const o of req.order) query = query.order(o.column, { ascending: o.ascending });
  if (req.limit) query = query.limit(req.limit);
  if (req.single) query = query[req.single]();

  const { data, error } = await query;
  if (error) {
    console.error(`❌ /api/db ${req.action} ${req.table}:`, error.message);
    return NextResponse.json({ data: null, error: { message: error.message, code: error.code } }, { status: 400 });
  }
  return NextResponse.json({ data: data ?? null, error: null });
}
