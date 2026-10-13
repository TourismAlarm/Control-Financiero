import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { ensureProfile } from '@/lib/ensureProfile';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isEnableBankingConfigured, listAspsps, startAuthorization } from '@/lib/banking/enableBanking';
import { DEFAULT_CONSENT_SECONDS, getRedirectUrl } from '@/lib/banking/config';

const bodySchema = z.object({
  aspsp_name: z.string().min(1).max(200),
  aspsp_country: z.string().length(2),
});

// POST /api/banking/connect - Devuelve la URL del banco para autorizar el acceso
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (!isEnableBankingConfigured()) {
    return NextResponse.json({ error: 'Enable Banking no está configurado' }, { status: 503 });
  }
  await ensureProfile(session);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Banco no válido' }, { status: 400 });
  }
  const aspspName = parsed.data.aspsp_name;
  const aspspCountry = parsed.data.aspsp_country.toUpperCase();

  try {
    // Pedimos el permiso con la duración máxima que admite el banco
    const aspsp = (await listAspsps(aspspCountry)).find((a) => a.name === aspspName);
    if (!aspsp) {
      return NextResponse.json({ error: `${aspspName} no está disponible en ${aspspCountry}` }, { status: 404 });
    }
    const seconds = aspsp.maximum_consent_validity || DEFAULT_CONSENT_SECONDS;
    // Pequeño margen para no pasarnos del máximo por segundos de diferencia
    const validUntil = new Date(Date.now() + (seconds - 3600) * 1000);

    const state = randomUUID();
    const { error } = await supabaseAdmin.from('bank_auth_states').insert({
      state,
      user_id: session.user.id,
      aspsp_name: aspspName,
      aspsp_country: aspspCountry,
    });
    if (error) throw new Error(error.message);

    const url = await startAuthorization({
      aspspName,
      aspspCountry,
      state,
      redirectUrl: getRedirectUrl(),
      validUntil,
    });

    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo iniciar la conexión';
    console.error('❌ POST /api/banking/connect:', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
