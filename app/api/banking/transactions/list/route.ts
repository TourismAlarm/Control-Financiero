import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parámetros de query
    const searchParams = request.nextUrl.searchParams;
    const reviewed = searchParams.get('reviewed');
    const ignored = searchParams.get('ignored');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Query base
    let query = supabase
      .from('imported_transactions')
      .select('*, bank_connections(display_name, bank_name)')
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })
      .limit(limit);

    // Filtros
    if (reviewed !== null) {
      query = query.eq('reviewed', reviewed === 'true');
    }
    if (ignored !== null) {
      query = query.eq('ignored', ignored === 'true');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json({ error: 'Error al obtener transacciones' }, { status: 500 });
    }

    return NextResponse.json({ transactions: data || [] });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
