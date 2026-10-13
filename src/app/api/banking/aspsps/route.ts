import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isEnableBankingConfigured, listAspsps } from '@/lib/banking/enableBanking';

// GET /api/banking/aspsps?country=ES - Bancos disponibles en un país
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (!isEnableBankingConfigured()) {
    return NextResponse.json({ error: 'Enable Banking no está configurado (faltan variables de entorno)' }, { status: 503 });
  }

  const country = (new URL(request.url).searchParams.get('country') || 'ES').toUpperCase().substring(0, 2);

  try {
    const aspsps = await listAspsps(country);
    return NextResponse.json(
      aspsps.map((a) => ({ name: a.name, country: a.country, logo: a.logo ?? null }))
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error consultando bancos';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
