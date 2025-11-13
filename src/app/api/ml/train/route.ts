import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CategorizationEngine } from '@/lib/ml/categorization';

/**
 * POST /api/ml/train
 * Manually trigger model training with all user transactions
 * This can be used to refresh the model or after bulk imports
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch user's categories
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from('categories')
      .select('id, name, type')
      .eq('user_id', userId)
      .order('name');

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return NextResponse.json(
        { error: 'Error al obtener categorías' },
        { status: 500 }
      );
    }

    // Fetch ALL user's transactions with categories
    const { data: transactions, error: transactionsError } = await supabaseAdmin
      .from('transactions')
      .select('description, category_id, amount, type, created_at')
      .eq('user_id', userId)
      .not('category_id', 'is', null)
      .order('created_at', { ascending: false });

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return NextResponse.json(
        { error: 'Error al obtener transacciones' },
        { status: 500 }
      );
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        message: 'No hay suficientes transacciones para entrenar el modelo',
        stats: {
          transactionsCount: 0,
          categoriesCount: categories?.length || 0,
        },
      });
    }

    // Initialize and train the engine
    const engine = new CategorizationEngine(categories || []);

    engine.train(
      transactions.map(t => ({
        description: t.description,
        category_id: t.category_id!,
        amount: parseFloat(t.amount),
      }))
    );

    const stats = engine.getStats();
    const exportedModel = engine.exportModel();

    // Optionally save the model to database for caching
    // This would require a new table like 'user_ml_models'
    // For now, we'll just return the stats

    return NextResponse.json({
      message: 'Modelo entrenado exitosamente',
      stats: {
        ...stats,
        transactionsCount: transactions.length,
        categoriesCount: categories?.length || 0,
      },
      modelSize: exportedModel.length,
    });
  } catch (error) {
    console.error('Error training model:', error);
    return NextResponse.json(
      { error: 'Error al entrenar el modelo' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ml/train
 * Get current model statistics without retraining
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get counts
    const { count: transactionsCount } = await supabaseAdmin
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('category_id', 'is', null);

    const { count: categoriesCount } = await supabaseAdmin
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    return NextResponse.json({
      transactionsCount: transactionsCount || 0,
      categoriesCount: categoriesCount || 0,
      message:
        transactionsCount && transactionsCount > 0
          ? 'Datos disponibles para entrenamiento'
          : 'No hay suficientes transacciones categorizadas',
    });
  } catch (error) {
    console.error('Error getting model stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas del modelo' },
      { status: 500 }
    );
  }
}
