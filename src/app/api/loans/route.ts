import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { loanInsertSchema, loanSchema } from '@/lib/validations/schemas';

/**
 * GET /api/loans
 * Get all loans for the current user
 * Optional query params: ?type=borrowed|lent&status=active|paid|cancelled
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('loans')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    // Filter by type if provided
    if (type && (type === 'borrowed' || type === 'lent')) {
      query = query.eq('type', type);
    }

    // Filter by status if provided
    if (status && (status === 'active' || status === 'paid' || status === 'cancelled')) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ GET /api/loans error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Validate response data
    const validated = data.map((item) => loanSchema.parse(item));

    return NextResponse.json(validated);
  } catch (error: any) {
    console.error('❌ GET /api/loans unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/loans
 * Create a new loan
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate and force user_id from session
    const validated = loanInsertSchema.parse({
      ...body,
      user_id: session.user.id,
    });

    const { data, error } = await supabaseAdmin
      .from('loans')
      .insert(validated)
      .select()
      .single();

    if (error) {
      console.error('❌ POST /api/loans error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = loanSchema.parse(data);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('❌ POST /api/loans unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/loans
 * Update a loan
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Loan ID required' }, { status: 400 });
    }

    // Verify ownership before update
    const { data: existing } = await supabaseAdmin
      .from('loans')
      .select('id')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Loan not found or unauthorized' }, { status: 404 });
    }

    // Update
    const { data, error } = await supabaseAdmin
      .from('loans')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('❌ PUT /api/loans error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = loanSchema.parse(data);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ PUT /api/loans unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/loans
 * Delete a loan
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Loan ID required' }, { status: 400 });
    }

    // Delete (user_id check ensures security)
    const { error } = await supabaseAdmin
      .from('loans')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('❌ DELETE /api/loans error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ DELETE /api/loans unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
