import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';

/**
 * Savings Goals API Routes
 * Handles CRUD operations and amount contributions for savings goals
 */

const savingsGoalInsertSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es requerido' }).max(200),
  target_amount: z.number().positive({ message: 'La meta debe ser mayor a 0' }),
  current_amount: z.number().nonnegative().default(0),
  target_date: z.string().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  is_completed: z.boolean().default(false),
});

const savingsGoalUpdateSchema = savingsGoalInsertSchema.partial().extend({
  id: z.string().uuid(),
});

// ==========================================
// GET /api/savings-goals
// ==========================================

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('savings_goals')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ GET /api/savings-goals error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ GET /api/savings-goals unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ==========================================
// POST /api/savings-goals
// ==========================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = savingsGoalInsertSchema.parse(body);

    const { data, error } = await supabaseAdmin
      .from('savings_goals')
      .insert({
        ...validated,
        user_id: session.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ POST /api/savings-goals error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('❌ POST /api/savings-goals unexpected error:', error);

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
// PUT /api/savings-goals
// ==========================================

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = savingsGoalUpdateSchema.parse(body);
    const { id, ...updateFields } = validated;

    if (!id) {
      return NextResponse.json({ error: 'Savings goal ID is required' }, { status: 400 });
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('savings_goals')
      .select('id, target_amount, current_amount')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Savings goal not found or unauthorized' },
        { status: 404 }
      );
    }

    // Auto-complete if current_amount reaches target_amount
    const finalFields = { ...updateFields };
    const newCurrentAmount = updateFields.current_amount ?? existing.current_amount;
    const targetAmount = updateFields.target_amount ?? existing.target_amount;
    if (newCurrentAmount >= targetAmount) {
      finalFields.is_completed = true;
    }

    const { data, error } = await supabaseAdmin
      .from('savings_goals')
      .update({ ...finalFields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('❌ PUT /api/savings-goals error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ PUT /api/savings-goals unexpected error:', error);

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
// DELETE /api/savings-goals
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
      return NextResponse.json({ error: 'Savings goal ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('savings_goals')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('❌ DELETE /api/savings-goals error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Savings goal deleted successfully' });
  } catch (error: any) {
    console.error('❌ DELETE /api/savings-goals unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
