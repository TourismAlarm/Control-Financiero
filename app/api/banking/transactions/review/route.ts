import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { transaction_id, action, categoria } = body;

    if (!transaction_id || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (action === 'ignore') {
      // Marcar como ignorada
      const { error } = await supabase
        .from('imported_transactions')
        .update({
          ignored: true,
          reviewed: true
        })
        .eq('id', transaction_id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error ignoring transaction:', error);
        return NextResponse.json({ error: 'Error al ignorar transacción' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'ignored' });

    } else if (action === 'confirm' || action === 'edit') {
      // Actualizar categoría si se proporcionó
      const updates: any = { reviewed: true };
      if (categoria) {
        updates.categoria = categoria;
      }

      const { error: updateError } = await supabase
        .from('imported_transactions')
        .update(updates)
        .eq('id', transaction_id)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating transaction:', updateError);
        return NextResponse.json({ error: 'Error al actualizar transacción' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: action });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
