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
    const { transaction_id } = body;

    if (!transaction_id) {
      return NextResponse.json({ error: 'Missing transaction_id' }, { status: 400 });
    }

    // Obtener la transacción
    const { data: transaction, error: txnError } = await supabase
      .from('imported_transactions')
      .select('*')
      .eq('id', transaction_id)
      .eq('user_id', user.id)
      .single();

    if (txnError || !transaction) {
      console.error('Transaction not found:', txnError);
      return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 });
    }

    // Verificar que no sea ingreso
    if (transaction.es_ingreso) {
      return NextResponse.json({ error: 'No se pueden crear gastos de ingresos' }, { status: 400 });
    }

    // Verificar que no tenga ya un expense asociado
    if (transaction.expense_id) {
      return NextResponse.json({ error: 'Esta transacción ya tiene un gasto asociado' }, { status: 400 });
    }

    // Crear el gasto en la tabla expenses
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        user_id: user.id,
        fecha: transaction.fecha,
        concepto: transaction.concepto,
        monto: transaction.monto,
        categoria: transaction.categoria || 'Otros',
        tipo: 'variable',
        source: 'bank_import'
      })
      .select()
      .single();

    if (expenseError || !expense) {
      console.error('Error creating expense:', expenseError);
      return NextResponse.json({ error: 'Error al crear gasto' }, { status: 500 });
    }

    // Vincular el expense a la transacción
    const { error: linkError } = await supabase
      .from('imported_transactions')
      .update({
        expense_id: expense.id,
        reviewed: true
      })
      .eq('id', transaction_id)
      .eq('user_id', user.id);

    if (linkError) {
      console.error('Error linking expense:', linkError);
      // Intentar eliminar el expense creado
      await supabase.from('expenses').delete().eq('id', expense.id);
      return NextResponse.json({ error: 'Error al vincular gasto' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      expense_id: expense.id
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
