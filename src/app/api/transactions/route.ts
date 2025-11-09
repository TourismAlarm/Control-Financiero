import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { transactionInsertSchema, transactionSchema } from '@/lib/validations/schemas';

// GET /api/transactions - Get all transactions for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const type = searchParams.get('type');

    let query = supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('date', { ascending: false });

    // Optional filters
    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      // Calculate last day of month properly
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;
      query = query.gte('date', startDate).lte('date', endDate);
    }

    if (type && (type === 'income' || type === 'expense')) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ GET /api/transactions error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const validated = data.map((item) => transactionSchema.parse(item));

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

    const { data, error } = await supabaseAdmin
      .from('transactions')
      .insert(validated)
      .select()
      .single();

    if (error) {
      console.error('❌ POST /api/transactions error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = transactionSchema.parse(data);
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
      .select()
      .single();

    if (error) {
      console.error('❌ PUT /api/transactions error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = transactionSchema.parse(data);
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ DELETE /api/transactions unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

