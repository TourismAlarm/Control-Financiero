import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';

/**
 * Loan API Routes
 * Handles CRUD operations for loans/debts
 */

// ==========================================
// VALIDATION SCHEMAS (Spanish columns)
// ==========================================

const paymentRecordSchema = z.object({
  fecha: z.string(),
  monto: z.number(),
  numero_pago: z.number().optional(),
  tipo: z.enum(['cuota', 'amortizacion']).optional(),
});

const extraPaymentSchema = z.object({
  fecha: z.string(),
  monto: z.number(),
  nota: z.string().optional(),
});

const loanSpanishSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().optional(), // Will be set by server
  nombre: z.string().min(1, { message: 'El nombre es requerido' }).max(200),
  monto_total: z.number().positive({ message: 'El monto debe ser mayor a 0' }),
  tasa_interes: z.number().nonnegative({ message: 'La tasa no puede ser negativa' }).default(0),
  plazo_meses: z.number().int().positive({ message: 'El plazo debe ser mayor a 0' }),
  fecha_inicio: z.string(),
  tipo_prestamo: z.string().optional(),
  descripcion: z.string().max(1000).optional().nullable(),
  cuota_mensual: z.number().positive().optional().nullable(),
  pagos_realizados: z.array(paymentRecordSchema).default([]),
  amortizaciones_extras: z.array(extraPaymentSchema).default([]),
  estado: z.enum(['activo', 'completado', 'cancelado']).default('activo'),
  created_at: z.string().or(z.date()).optional(),
  updated_at: z.string().or(z.date()).optional(),
});

const loanInsertSpanishSchema = loanSpanishSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true,
});


// ==========================================
// GET /api/loans
// ==========================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // activo, completado, cancelado

    let query = supabaseAdmin
      .from('loans')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    // Optional status filter
    if (status && ['activo', 'completado', 'cancelado'].includes(status)) {
      query = query.eq('estado', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ GET /api/loans error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Parse JSONB fields
    const parsedData = data.map((loan) => ({
      ...loan,
      pagos_realizados: typeof loan.pagos_realizados === 'string'
        ? JSON.parse(loan.pagos_realizados)
        : loan.pagos_realizados || [],
      amortizaciones_extras: typeof loan.amortizaciones_extras === 'string'
        ? JSON.parse(loan.amortizaciones_extras)
        : loan.amortizaciones_extras || [],
    }));

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('❌ GET /api/loans unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ==========================================
// POST /api/loans
// ==========================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    const validated = loanInsertSpanishSchema.parse(body);

    // Insert loan with user_id
    const { data, error } = await supabaseAdmin
      .from('loans')
      .insert({
        ...validated,
        user_id: session.user.id,
        pagos_realizados: validated.pagos_realizados || [],
        amortizaciones_extras: validated.amortizaciones_extras || [],
      })
      .select()
      .single();

    if (error) {
      console.error('❌ POST /api/loans error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Parse JSONB fields in response
    const parsedData = {
      ...data,
      pagos_realizados: typeof data.pagos_realizados === 'string'
        ? JSON.parse(data.pagos_realizados)
        : data.pagos_realizados || [],
      amortizaciones_extras: typeof data.amortizaciones_extras === 'string'
        ? JSON.parse(data.amortizaciones_extras)
        : data.amortizaciones_extras || [],
    };

    return NextResponse.json(parsedData, { status: 201 });
  } catch (error: any) {
    console.error('❌ POST /api/loans unexpected error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ==========================================
// PUT /api/loans
// ==========================================

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });
    }

    // Validate that the loan belongs to the user
    const { data: existingLoan, error: fetchError } = await supabaseAdmin
      .from('loans')
      .select('id')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (fetchError || !existingLoan) {
      return NextResponse.json(
        { error: 'Loan not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update loan
    const { data, error } = await supabaseAdmin
      .from('loans')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('❌ PUT /api/loans error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Parse JSONB fields in response
    const parsedData = {
      ...data,
      pagos_realizados: typeof data.pagos_realizados === 'string'
        ? JSON.parse(data.pagos_realizados)
        : data.pagos_realizados || [],
      amortizaciones_extras: typeof data.amortizaciones_extras === 'string'
        ? JSON.parse(data.amortizaciones_extras)
        : data.amortizaciones_extras || [],
    };

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('❌ PUT /api/loans unexpected error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ==========================================
// DELETE /api/loans
// ==========================================

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });
    }

    // Delete loan (only if belongs to user)
    const { error } = await supabaseAdmin
      .from('loans')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('❌ DELETE /api/loans error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Loan deleted successfully' });
  } catch (error: any) {
    console.error('❌ DELETE /api/loans unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
