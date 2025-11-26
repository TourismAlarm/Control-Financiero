import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { transferInsertSchema, transferSchema } from '@/lib/validations/schemas';

// GET /api/transfers - Get all transfers for current user
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
      .from('transfers')
      .select(`
        *,
        from_account:accounts!transfers_from_account_id_fkey(id, name, type),
        to_account:accounts!transfers_to_account_id_fkey(id, name, type)
      `)
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

    const { data, error } = await query;

    if (error) {
      console.error('❌ GET /api/transfers error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const validated = data.map((item) => transferSchema.parse(item));

    return NextResponse.json(validated);
  } catch (error: any) {
    console.error('❌ GET /api/transfers unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/transfers - Create new transfer
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate and force user_id
    const validated = transferInsertSchema.parse({
      ...body,
      user_id: session.user.id,
    });

    // Verify both accounts exist and belong to user
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('user_id', session.user.id)
      .in('id', [validated.from_account_id, validated.to_account_id]);

    if (accountsError || !accounts || accounts.length !== 2) {
      return NextResponse.json(
        { error: 'Invalid accounts. Both accounts must exist and belong to you.' },
        { status: 400 }
      );
    }

    // Create the transfer
    const { data, error } = await supabaseAdmin
      .from('transfers')
      .insert(validated)
      .select(`
        *,
        from_account:accounts!transfers_from_account_id_fkey(id, name, type),
        to_account:accounts!transfers_to_account_id_fkey(id, name, type)
      `)
      .single();

    if (error) {
      console.error('❌ POST /api/transfers error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = transferSchema.parse(data);

    // TODO: Update account balances
    // - Subtract amount from from_account
    // - Add amount to to_account

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('❌ POST /api/transfers unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/transfers - Delete transfer
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Transfer ID required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('transfers')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('❌ DELETE /api/transfers error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // TODO: Revert account balance changes
    // - Add amount back to from_account
    // - Subtract amount from to_account

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ DELETE /api/transfers unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
