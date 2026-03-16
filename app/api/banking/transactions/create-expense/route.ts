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

    // Obtener la transacción importada
    const { data: importedTxn, error: txnError } = await supabase
      .from('imported_transactions')
      .select('*')
      .eq('id', transaction_id)
      .eq('user_id', user.id)
      .single();

    if (txnError || !importedTxn) {
      console.error('Transaction not found:', txnError);
      return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 });
    }

    // Verificar que no tenga ya una transacción asociada
    if (importedTxn.transaction_created_id) {
      return NextResponse.json({ error: 'Esta transacción ya tiene un registro asociado' }, { status: 400 });
    }

    // Buscar la categoría correspondiente o usar una por defecto
    let categoryId = null;
    if (importedTxn.categoria) {
      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', importedTxn.categoria)
        .eq('type', importedTxn.es_ingreso ? 'income' : 'expense')
        .single();

      if (category) {
        categoryId = category.id;
      }
    }

    // Crear la transacción en la tabla transactions
    const { data: newTransaction, error: createError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        category_id: categoryId,
        type: importedTxn.es_ingreso ? 'income' : 'expense',
        amount: importedTxn.monto,
        description: importedTxn.concepto,
        date: importedTxn.fecha,
        notes: `Importado desde ${importedTxn.source_type}`
      })
      .select()
      .single();

    if (createError || !newTransaction) {
      console.error('Error creating transaction:', createError);
      return NextResponse.json({ error: 'Error al crear transacción' }, { status: 500 });
    }

    // Vincular la transacción creada a la importada
    const { error: linkError } = await supabase
      .from('imported_transactions')
      .update({
        transaction_created_id: newTransaction.id,
        reviewed: true
      })
      .eq('id', transaction_id)
      .eq('user_id', user.id);

    if (linkError) {
      console.error('Error linking transaction:', linkError);
      // Intentar eliminar la transacción creada
      await supabase.from('transactions').delete().eq('id', newTransaction.id);
      return NextResponse.json({ error: 'Error al vincular transacción' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      transaction_id: newTransaction.id
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
