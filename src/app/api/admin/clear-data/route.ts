import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

// DELETE /api/admin/clear-data - Borra todos los datos de prueba del usuario autenticado
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;

    // Tablas con user_id TEXT (NextAuth/Google ID)
    const textIdTables = [
      { table: 'loan_payments', label: 'Pagos de préstamos' },
      { table: 'loans', label: 'Préstamos' },
      { table: 'agent_notifications', label: 'Notificaciones del agente' },
      { table: 'transactions', label: 'Transacciones' },
      { table: 'transfers', label: 'Transferencias' },
      { table: 'budgets', label: 'Presupuestos' },
      { table: 'savings_goals', label: 'Metas de ahorro' },
      { table: 'recurring_rules', label: 'Reglas recurrentes' },
      { table: 'accounts', label: 'Cuentas' },
    ];

    // Tablas con user_id UUID (tablas de banking, creadas antes de la migración a NextAuth).
    // Si el usuario usa Google OAuth, su ID no es un UUID, por lo que estas tablas
    // no pueden tener datos del usuario. Se intentan borrar ignorando errores de tipo.
    const uuidIdTables = [
      { table: 'imported_transactions', label: 'Transacciones importadas' },
      { table: 'sync_history', label: 'Historial de sincronización' },
      { table: 'bank_connections', label: 'Conexiones bancarias' },
    ];

    const results: { table: string; label: string; count: number }[] = [];

    for (const { table, label } of textIdTables) {
      const { error, count } = await supabaseAdmin
        .from(table)
        .delete({ count: 'exact' })
        .eq('user_id', userId);

      if (error) {
        console.error(`Error borrando ${table}:`, error);
        return NextResponse.json(
          { error: `Error al borrar ${label}: ${error.message}` },
          { status: 500 }
        );
      }

      results.push({ table, label, count: count ?? 0 });
    }

    for (const { table, label } of uuidIdTables) {
      const { error, count } = await supabaseAdmin
        .from(table)
        .delete({ count: 'exact' })
        .eq('user_id', userId);

      if (error) {
        // Si el error es de tipo UUID, el usuario no tiene datos ahí (ID no es UUID)
        if (error.message?.includes('invalid input syntax for type uuid')) {
          results.push({ table, label, count: 0 });
        } else {
          console.error(`Error borrando ${table}:`, error);
          return NextResponse.json(
            { error: `Error al borrar ${label}: ${error.message}` },
            { status: 500 }
          );
        }
      } else {
        results.push({ table, label, count: count ?? 0 });
      }
    }

    // Borrar categorías personalizadas (mantener las del sistema)
    const { error: catError, count: catCount } = await supabaseAdmin
      .from('categories')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .eq('is_system', false);

    if (catError) {
      return NextResponse.json(
        { error: `Error al borrar categorías: ${catError.message}` },
        { status: 500 }
      );
    }

    results.push({ table: 'categories', label: 'Categorías personalizadas', count: catCount ?? 0 });

    // Resetear onboarding para que el usuario configure desde cero
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ onboarding_completed: false, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (profileError) {
      console.error('Error reseteando perfil:', profileError);
      // No es crítico, continuamos
    }

    const totalDeleted = results.reduce((sum, r) => sum + r.count, 0);

    return NextResponse.json({
      success: true,
      message: `Datos de prueba eliminados correctamente. ${totalDeleted} registros borrados.`,
      details: results,
    });
  } catch (error) {
    console.error('Error en clear-data:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
