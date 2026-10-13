import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { syncAll } from '@/lib/banking/sync';

export const maxDuration = 60;

// POST /api/banking/sync - "Sincronizar ahora" para el usuario actual
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const results = await syncAll(session.user.id);
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error sincronizando';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
