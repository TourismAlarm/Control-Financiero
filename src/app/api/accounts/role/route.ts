import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { ensureProfile } from '@/lib/ensureProfile';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ROLES } from '@/lib/accounts/roles';

const schema = z.object({
  id: z.string().uuid(),
  role: z.enum(ROLES as [string, ...string[]]).nullable(),
});

// PATCH /api/accounts/role — para qué usas esta cuenta (día a día, deudas, ahorro, casa)
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  await ensureProfile(session);
  const userId = session.user.id;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Datos no válidos' }, { status: 400 });
  const { id, role } = parsed.data;

  // Un papel = una cuenta: si otra lo tenía, se le quita
  if (role) {
    const { error: clearError } = await supabaseAdmin
      .from('accounts')
      .update({ role: null })
      .eq('user_id', userId)
      .eq('role', role)
      .neq('id', id);
    if (clearError) {
      const missing = /role/.test(clearError.message);
      return NextResponse.json(
        { error: missing ? 'Falta aplicar la migración 013 en Supabase (papel de las cuentas)' : clearError.message },
        { status: 500 }
      );
    }
  }

  const { error } = await supabaseAdmin
    .from('accounts')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) {
    const missing = /role/.test(error.message);
    return NextResponse.json(
      { error: missing ? 'Falta aplicar la migración 013 en Supabase (papel de las cuentas)' : error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
