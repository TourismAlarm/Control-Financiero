import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ensureProfile } from '@/lib/ensureProfile';
import { buildSummary } from '@/lib/summary/build';

// GET /api/summary?month=YYYY-MM — todo lo que necesita la pantalla de Inicio.
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  await ensureProfile(session);
  try {
    const { summary } = await buildSummary(session.user.id, new URL(request.url).searchParams.get('month'));
    return NextResponse.json(summary);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
