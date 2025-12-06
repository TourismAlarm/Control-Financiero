import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  recurringRuleInsertSchema,
  recurringRuleUpdateSchema,
  recurringRuleSchema,
} from '@/lib/validations/schemas';

// GET /api/recurring-rules - Get all recurring rules for current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('recurring_rules')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ GET /api/recurring-rules error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const validated = data.map((item) => recurringRuleSchema.parse(item));

    return NextResponse.json(validated);
  } catch (error: any) {
    console.error('❌ GET /api/recurring-rules unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/recurring-rules - Create new recurring rule
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate and force user_id
    const validated = recurringRuleInsertSchema.parse({
      ...body,
      user_id: session.user.id,
    });

    const { data, error } = await supabaseAdmin
      .from('recurring_rules')
      .insert(validated)
      .select()
      .single();

    if (error) {
      console.error('❌ POST /api/recurring-rules error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = recurringRuleSchema.parse(data);

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('❌ POST /api/recurring-rules unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/recurring-rules - Update recurring rule
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = recurringRuleUpdateSchema.parse(body);

    if (!validated.id) {
      return NextResponse.json({ error: 'Recurring rule ID required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('recurring_rules')
      .update(validated)
      .eq('id', validated.id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('❌ PUT /api/recurring-rules error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = recurringRuleSchema.parse(data);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ PUT /api/recurring-rules unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/recurring-rules - Delete recurring rule
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Recurring rule ID required' }, { status: 400 });
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ DELETE /api/recurring-rules unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/recurring-rules/toggle - Toggle active status
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action');

    if (!id) {
      return NextResponse.json({ error: 'Recurring rule ID required' }, { status: 400 });
    }

    if (action === 'toggle') {
      // Get current rule to toggle is_active
      const { data: currentRule, error: fetchError } = await supabaseAdmin
        .from('recurring_rules')
        .select('is_active')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .single();

      if (fetchError) {
        console.error('❌ PATCH /api/recurring-rules toggle fetch error:', fetchError);
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
      }

      const { data, error } = await supabaseAdmin
        .from('recurring_rules')
        .update({ is_active: !currentRule.is_active })
        .eq('id', id)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ PATCH /api/recurring-rules toggle error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const result = recurringRuleSchema.parse(data);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('❌ PATCH /api/recurring-rules unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
