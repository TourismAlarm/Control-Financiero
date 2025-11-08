import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/auth.config';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { accountInsertSchema, accountSchema } from '@/lib/validations/schemas';

// GET /api/accounts - Get all accounts for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ GET /api/accounts error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Validate response data
    const validated = data.map((item) => accountSchema.parse(item));

    return NextResponse.json(validated);
  } catch (error: any) {
    console.error('❌ GET /api/accounts unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/accounts - Create new account
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate and force user_id
    const validated = accountInsertSchema.parse({
      ...body,
      user_id: session.user.id, // Force user_id from session
    });

    const { data, error } = await supabaseAdmin
      .from('accounts')
      .insert(validated)
      .select()
      .single();

    if (error) {
      console.error('❌ POST /api/accounts error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = accountSchema.parse(data);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('❌ POST /api/accounts unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/accounts - Update account
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    // Verify ownership before update
    const { data: existing } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Account not found or unauthorized' }, { status: 404 });
    }

    // Update
    const { data, error } = await supabaseAdmin
      .from('accounts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', session.user.id) // Double check user_id
      .select()
      .single();

    if (error) {
      console.error('❌ PUT /api/accounts error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = accountSchema.parse(data);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ PUT /api/accounts unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/accounts - Delete account
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    // Delete (user_id check ensures security)
    const { error } = await supabaseAdmin
      .from('accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('❌ DELETE /api/accounts error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ DELETE /api/accounts unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
