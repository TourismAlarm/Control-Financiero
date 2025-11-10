import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { categoryInsertSchema, categorySchema } from '@/lib/validations/schemas';

/**
 * GET /api/categories
 * Get all categories for the current user
 * Optional query params: ?type=income|expense
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let query = supabaseAdmin
      .from('categories')
      .select('*')
      .eq('user_id', session.user.id)
      .order('name', { ascending: true });

    // Filter by type if provided
    if (type && (type === 'income' || type === 'expense')) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ GET /api/categories error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Validate response data
    const validated = data.map((item) => categorySchema.parse(item));

    return NextResponse.json(validated);
  } catch (error: any) {
    console.error('❌ GET /api/categories unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/categories
 * Create a new category
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate and force user_id from session
    const validated = categoryInsertSchema.parse({
      ...body,
      user_id: session.user.id,
    });

    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert(validated)
      .select()
      .single();

    if (error) {
      console.error('❌ POST /api/categories error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = categorySchema.parse(data);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('❌ POST /api/categories unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/categories
 * Update a category (only non-system categories)
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
      return NextResponse.json({ error: 'Category ID required' }, { status: 400 });
    }

    // Verify ownership and that it's not a system category
    const { data: existing } = await supabaseAdmin
      .from('categories')
      .select('id, is_system')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Category not found or unauthorized' }, { status: 404 });
    }

    if (existing.is_system) {
      return NextResponse.json({ error: 'Cannot update system categories' }, { status: 403 });
    }

    // Update
    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('❌ PUT /api/categories error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = categorySchema.parse(data);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ PUT /api/categories unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/categories
 * Delete a category (only non-system categories)
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
      return NextResponse.json({ error: 'Category ID required' }, { status: 400 });
    }

    // Verify it's not a system category
    const { data: existing } = await supabaseAdmin
      .from('categories')
      .select('is_system')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Category not found or unauthorized' }, { status: 404 });
    }

    if (existing.is_system) {
      return NextResponse.json({ error: 'Cannot delete system categories' }, { status: 403 });
    }

    // Delete
    const { error } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('❌ DELETE /api/categories error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ DELETE /api/categories unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
