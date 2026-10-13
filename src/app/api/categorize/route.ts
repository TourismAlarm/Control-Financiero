import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { merchantKey } from '@/lib/debts/detect';

const schema = z.object({
  id: z.string().uuid(),
  category_id: z.string().uuid(),
  learn: z.boolean().default(true),
});

/**
 * POST /api/categorize — pone categoría a un movimiento y, si learn, aprende la regla:
 * los próximos movimientos del mismo comercio (y los que ya están sin categoría) se
 * categorizan solos.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const userId = session.user.id;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Datos no válidos' }, { status: 400 });
  const { id, category_id, learn } = parsed.data;

  // La categoría tiene que ser tuya
  const { data: cat } = await supabaseAdmin
    .from('categories')
    .select('id')
    .eq('id', category_id)
    .eq('user_id', userId)
    .maybeSingle();
  if (!cat) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });

  const { data: tx, error } = await supabaseAdmin
    .from('transactions')
    .update({ category_id })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, description, counterparty, type')
    .maybeSingle();
  if (error || !tx) return NextResponse.json({ error: error?.message || 'Movimiento no encontrado' }, { status: 404 });

  let alsoUpdated = 0;
  if (learn) {
    const pattern = merchantKey(tx.counterparty, tx.description || '');
    if (pattern.length >= 3) {
      const { error: ruleError } = await supabaseAdmin
        .from('category_rules')
        .upsert({ user_id: userId, pattern, category_id }, { onConflict: 'user_id,pattern' });

      if (!ruleError) {
        // Aplica la regla a los demás movimientos del mismo comercio que siguen sin categoría
        const { data: pending } = await supabaseAdmin
          .from('transactions')
          .select('id, description, counterparty')
          .eq('user_id', userId)
          .eq('type', tx.type)
          .is('category_id', null);
        const sameMerchant = (pending || [])
          .filter((p: any) => merchantKey(p.counterparty, p.description || '') === pattern)
          .map((p: any) => p.id);
        if (sameMerchant.length) {
          await supabaseAdmin.from('transactions').update({ category_id }).in('id', sameMerchant).eq('user_id', userId);
          alsoUpdated = sameMerchant.length;
        }
      }
    }
  }

  return NextResponse.json({ ok: true, alsoUpdated });
}
