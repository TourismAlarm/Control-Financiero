import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CategorizationEngine } from '@/lib/ml/categorization';

/**
 * GET /api/ml/categorize
 * Get category suggestions for a transaction description
 *
 * Query params:
 * - description: Transaction description (required)
 * - amount: Transaction amount (optional)
 * - type: Transaction type 'income' | 'expense' (optional)
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const description = searchParams.get('description');
    const amount = searchParams.get('amount');
    const type = searchParams.get('type') as 'income' | 'expense' | null;

    if (!description) {
      return NextResponse.json(
        { error: 'La descripción es requerida' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    if (!userId) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

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

    // Fetch user's historical transactions for training
    const { data: transactions, error: transactionsError } = await supabaseAdmin
      .from('transactions')
      .select('description, category_id, amount, type')
      .eq('user_id', userId)
      .not('category_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500); // Last 500 transactions for training

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return NextResponse.json(
        { error: 'Error al obtener transacciones' },
        { status: 500 }
      );
    }

    // Check if we have a cached model in the database (we'll use a user_settings table)
    // For now, we'll rebuild the model each time (can be optimized later)

    // Initialize and train the engine
    const engine = new CategorizationEngine(categories || []);

    if (transactions && transactions.length > 0) {
      engine.train(
        transactions.map(t => ({
          description: t.description,
          category_id: t.category_id!,
          amount: parseFloat(t.amount),
        }))
      );
    }

    // Get suggestions
    const suggestions = engine.suggest(
      description,
      amount ? parseFloat(amount) : undefined,
      type || undefined
    );

    return NextResponse.json({
      suggestions,
      stats: engine.getStats(),
    });
  } catch (error) {
    console.error('Error in categorization:', error);
    return NextResponse.json(
      { error: 'Error al categorizar transacción' },
      { status: 500 }
    );
  }
}
