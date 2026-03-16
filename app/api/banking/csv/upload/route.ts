import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { detectBankFormat, parseCSV } from '@/lib/banking/csv-parser';
import { categorizeTransaction } from '@/lib/banking/categorization';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener el archivo
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Leer contenido del CSV
    const text = await file.text();

    // Detectar formato del banco
    const format = detectBankFormat(text);
    if (!format) {
      return NextResponse.json({
        error: 'Formato de CSV no reconocido. Bancos soportados: BBVA, Revolut, Santander, CaixaBank'
      }, { status: 400 });
    }

    // Parsear transacciones
    const transactions = parseCSV(text, format);

    if (transactions.length === 0) {
      return NextResponse.json({
        error: 'No se encontraron transacciones válidas en el archivo'
      }, { status: 400 });
    }

    // Crear conexión bancaria (CSV)
    const { data: connection, error: connError } = await supabase
      .from('bank_connections')
      .insert({
        user_id: user.id,
        bank_type: 'csv',
        bank_name: format.name,
        display_name: `${format.name} (CSV)`,
        status: 'active',
        last_sync: new Date().toISOString()
      })
      .select()
      .single();

    if (connError || !connection) {
      console.error('Error creating connection:', connError);
      return NextResponse.json({ error: 'Error al crear conexión' }, { status: 500 });
    }

    // Procesar transacciones
    let newCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (const txn of transactions) {
      try {
        // Generar ID único para la transacción
        const transactionId = `csv_${format.name}_${txn.fecha}_${txn.concepto}_${txn.monto}`;

        // Categorizar
        const categoria = categorizeTransaction(txn.concepto);

        // Intentar insertar (ignorar duplicados)
        const { error: insertError } = await supabase
          .from('imported_transactions')
          .insert({
            user_id: user.id,
            bank_connection_id: connection.id,
            transaction_id: transactionId,
            fecha: txn.fecha,
            concepto: txn.concepto,
            monto: txn.monto,
            categoria: categoria,
            source_type: 'csv',
            es_ingreso: txn.es_ingreso,
            reviewed: false,
            ignored: false,
            raw_data: txn
          });

        if (insertError) {
          if (insertError.code === '23505') { // Duplicate key
            duplicateCount++;
          } else {
            errorCount++;
            console.error('Error inserting transaction:', insertError);
          }
        } else {
          newCount++;
        }
      } catch (error) {
        errorCount++;
        console.error('Error processing transaction:', error);
      }
    }

    // Registrar sincronización en historial
    await supabase
      .from('sync_history')
      .insert({
        user_id: user.id,
        bank_connection_id: connection.id,
        sync_type: 'csv',
        status: errorCount > 0 ? 'partial' : 'success',
        transactions_found: transactions.length,
        transactions_new: newCount,
        transactions_duplicated: duplicateCount,
        transactions_error: errorCount
      });

    return NextResponse.json({
      success: true,
      bank: format.name,
      connection_id: connection.id,
      stats: {
        total: transactions.length,
        new: newCount,
        duplicated: duplicateCount,
        errors: errorCount
      }
    });

  } catch (error) {
    console.error('Error in CSV upload:', error);
    return NextResponse.json({
      error: 'Error al procesar el archivo'
    }, { status: 500 });
  }
}
