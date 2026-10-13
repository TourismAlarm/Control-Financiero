import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

// POST /api/debts/dismiss { key } — "No es una deuda": no volver a sugerirlo
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const parsed = z.object({ key: z.string().min(1).max(120) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Falta la sugerencia' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('dismissed_suggestions')
    .upsert({ user_id: session.user.id, key: parsed.data.key }, { onConflict: 'user_id,key', ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
