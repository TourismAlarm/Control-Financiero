import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';

/**
 * Budgets API Routes
 * Handles CRUD operations for monthly budgets per category
 */

const budgetInsertSchema = z.object({
  category_id: z.string().uuid(),
  amount: z.number().positive({ message: 'El monto debe ser mayor a 0' }),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  alert_threshold: z.number().min(0).max(100).default(80),
});

const budgetUpdateSchema = budgetInsertSchema.partial().extend({
  id: z.string().uuid(),
});

// ==========================================
// GET /api/budgets
// ==========================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    let query = supabaseAdmin
      .from('budgets')
      .select('*, categories(*)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (month) {
      const monthNum = parseInt(month);
      if (!isNaN(monthNum)) query = query.eq('month', monthNum);
    }

    if (year) {
      const yearNum = parseInt(year);
      if (!isNaN(yearNum)) query = query.eq('year', yearNum);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ GET /api/budgets error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ GET /api/budgets unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ==========================================
// POST /api/budgets
// ==========================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = budgetInsertSchema.parse(body);

    const { data, error } = await supabaseAdmin
      .from('budgets')
      .insert({
        ...validated,
        user_id: session.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ POST /api/budgets error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('❌ POST /api/budgets unexpected error:', error);

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
// PUT /api/budgets
// ==========================================

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = budgetUpdateSchema.parse(body);
    const { id, ...updateFields } = validated;

    if (!id) {
      return NextResponse.json({ error: 'Budget ID is required' }, { status: 400 });
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('budgets')
      .select('id')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Budget not found or unauthorized' },
        { status: 404 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('budgets')
      .update({ ...updateFields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('❌ PUT /api/budgets error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ PUT /api/budgets unexpected error:', error);

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
// DELETE /api/budgets
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
      return NextResponse.json({ error: 'Budget ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('❌ DELETE /api/budgets error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Budget deleted successfully' });
  } catch (error: any) {
    console.error('❌ DELETE /api/budgets unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
