import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';

/**
 * Recurring Rules API Routes
 * Handles CRUD operations for recurring transaction rules
 */

const recurringRuleInsertSchema = z.object({
  account_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  type: z.enum(['income', 'expense']),
  amount: z.number().positive({ message: 'El monto debe ser mayor a 0' }),
  description: z.string().min(1, { message: 'La descripción es requerida' }),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
  start_date: z.string(),
  end_date: z.string().nullable().optional(),
  next_occurrence: z.string(),
  is_active: z.boolean().default(true),
});

const recurringRuleUpdateSchema = recurringRuleInsertSchema.partial().extend({
  id: z.string().uuid(),
});

// ==========================================
// GET /api/recurring-rules
// ==========================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // income | expense
    const activeOnly = searchParams.get('active') === 'true';

    let query = supabaseAdmin
      .from('recurring_rules')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (type && ['income', 'expense'].includes(type)) {
      query = query.eq('type', type);
    }

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ GET /api/recurring-rules error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ GET /api/recurring-rules unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ==========================================
// POST /api/recurring-rules
// ==========================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = recurringRuleInsertSchema.parse(body);

    const { data, error } = await supabaseAdmin
      .from('recurring_rules')
      .insert({
        ...validated,
        user_id: session.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ POST /api/recurring-rules error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('❌ POST /api/recurring-rules unexpected error:', error);

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
// PUT /api/recurring-rules
// ==========================================

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = recurringRuleUpdateSchema.parse(body);
    const { id, ...updateFields } = validated;

    if (!id) {
      return NextResponse.json({ error: 'Recurring rule ID is required' }, { status: 400 });
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('recurring_rules')
      .select('id')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Recurring rule not found or unauthorized' },
        { status: 404 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('recurring_rules')
      .update({ ...updateFields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('❌ PUT /api/recurring-rules error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ PUT /api/recurring-rules unexpected error:', error);

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
// DELETE /api/recurring-rules
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
      return NextResponse.json({ error: 'Recurring rule ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('recurring_rules')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('❌ DELETE /api/recurring-rules error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Recurring rule deleted successfully' });
  } catch (error: any) {
    console.error('❌ DELETE /api/recurring-rules unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
