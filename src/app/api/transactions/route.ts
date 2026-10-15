import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ensureProfile } from '@/lib/ensureProfile';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { transactionInsertSchema, transactionSchema } from '@/lib/validations/schemas';
import { runAgentsAndSave } from '@/lib/agents/runner';
import { normalizeStartDay, periodOf } from '@/lib/period';
import { fingerprintOf } from '@/lib/banking/transform';

// GET /api/transactions - Get all transactions for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureProfile(session);

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const type = searchParams.get('type');

    const includeInternal = searchParams.get('include_internal') === '1';

    // ?period=YYYY-MM → mes financiero según el día de cobro de Ajustes
    const periodParam = searchParams.get('period');
    let range: { start: string; end: string } | null = null;
    if (periodParam && /^\d{4}-\d{2}$/.test(periodParam)) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('financial_month_start_day')
        .eq('id', session.user.id)
        .maybeSingle();
      range = periodOf(periodParam, normalizeStartDay((profile as { financial_month_start_day?: number } | null)?.financial_month_start_day));
    }

    const buildQuery = (filterInternal: boolean) => {
      let query = supabaseAdmin
        .from('transactions')
        .select('*, category:categories(id, name, type, icon, color)')
        .eq('user_id', session.user.id)
        .order('date', { ascending: false });

      if (range) {
        query = query.gte('date', range.start).lte('date', range.end);
      } else if (month && year) {
        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        // Calculate last day of month properly
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;
        query = query.gte('date', startDate).lte('date', endDate);
      }

      if (type === 'income' || type === 'expense') {
        query = query.eq('type', type);
      }

      // Los traspasos entre cuentas propias no son gasto ni ingreso: se excluyen
      // por defecto para que dashboard, gráficos y presupuestos no los cuenten.
      if (filterInternal) {
        query = query.neq('kind', 'internal_transfer');
      }
      return query;
    };

    let { data, error } = await buildQuery(!includeInternal);

    // Si la migración 011 aún no está aplicada, la columna kind no existe.
    if (error && /kind/.test(error.message)) {
      ({ data, error } = await buildQuery(false));
    }

    if (error) {
      console.error('❌ GET /api/transactions error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Por si quedan duplicados de reconectar el banco: un movimiento por cuenta y huella
    const seenFingerprints = new Set<string>();
    const unique = (data || []).filter((item: { account_id?: string | null; external_id?: string | null }) => {
      if (!item.external_id) return true;
      const key = `${item.account_id}|${fingerprintOf(item.external_id)}`;
      if (seenFingerprints.has(key)) return false;
      seenFingerprints.add(key);
      return true;
    });

    const validated = unique.map((item) => transactionSchema.parse(item));

    return NextResponse.json(validated);
  } catch (error: any) {
    console.error('❌ GET /api/transactions unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/transactions - Create new transaction
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate and force user_id
    const validated = transactionInsertSchema.parse({
      ...body,
      user_id: session.user.id,
    });

    // Normalize date to YYYY-MM-DD to avoid PostgreSQL 22007 error
    const toSafeDate = (v?: string | Date): string => {
      const today = new Date().toISOString().substring(0, 10);
      if (!v) return today;
      const d = new Date(v);
      return isNaN(d.getTime()) ? today : d.toISOString().substring(0, 10);
    };
    const safeDate = toSafeDate(validated.date as string | Date | undefined);

    const { data, error } = await supabaseAdmin
      .from('transactions')
      .insert({ ...validated, date: safeDate })
      .select('*, category:categories(id, name, type, icon, color)')
      .single();

    if (error) {
      console.error('❌ POST /api/transactions error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = transactionSchema.parse(data);

    // Ejecutar agentes en background (sin bloquear la respuesta)
    Promise.resolve().then(() => {
      runAgentsAndSave(session.user.id).catch(err => {
        console.error('❌ Error running agents in background:', err);
      });
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('❌ POST /api/transactions unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/transactions - Update transaction
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
    }

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found or unauthorized' }, { status: 404 });
    }

    // Update
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select('*, category:categories(id, name, type, icon, color)')
      .single();

    if (error) {
      console.error('❌ PUT /api/transactions error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = transactionSchema.parse(data);

    // Ejecutar agentes en background (sin bloquear la respuesta)
    Promise.resolve().then(() => {
      runAgentsAndSave(session.user.id).catch(err => {
        console.error('❌ Error running agents in background:', err);
      });
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ PUT /api/transactions unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/transactions - Delete transaction
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('❌ DELETE /api/transactions error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Ejecutar agentes en background (sin bloquear la respuesta)
    Promise.resolve().then(() => {
      runAgentsAndSave(session.user.id).catch(err => {
        console.error('❌ Error running agents in background:', err);
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ DELETE /api/transactions unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

