import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSession } from '@/lib/banking/enableBanking';
import { normalizeIban } from '@/lib/banking/transform';
import { syncAll } from '@/lib/banking/sync';

export const maxDuration = 60;

const STATE_MAX_AGE_MS = 60 * 60 * 1000;

function back(request: NextRequest, params: Record<string, string>) {
  const url = new URL('/configuracion', request.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

// GET /api/banking/callback?code=...&state=... - El banco devuelve aquí al usuario
export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const code = params.get('code');
  const state = params.get('state');
  const bankError = params.get('error');

  if (bankError || !code || !state) {
    return back(request, { banco: 'error', motivo: params.get('error_description') || bankError || 'Autorización cancelada' });
  }

  // El state lo creamos nosotros en /connect: así sabemos de quién es y evitamos CSRF
  const { data: pending } = await supabaseAdmin
    .from('bank_auth_states')
    .select('*')
    .eq('state', state)
    .maybeSingle();
  await supabaseAdmin.from('bank_auth_states').delete().eq('state', state);

  if (!pending || Date.now() - new Date(pending.created_at).getTime() > STATE_MAX_AGE_MS) {
    return back(request, { banco: 'error', motivo: 'La autorización ha caducado, vuelve a intentarlo' });
  }

  const userId: string = pending.user_id;

  try {
    const session = await createSession(code);

    for (const account of session.accounts || []) {
      const iban = normalizeIban(account.account_id?.iban);
      const label = `${session.aspsp?.name || pending.aspsp_name}${iban ? ` ···${iban.slice(-4)}` : ''}`;

      // ¿Ya estaba vinculada esta cuenta (reconexión)? Reutilizamos su cuenta de la app
      const { data: previous } = await supabaseAdmin
        .from('bank_links')
        .select('id, account_id')
        .eq('user_id', userId)
        .or(iban ? `account_uid.eq.${account.uid},iban.eq.${iban}` : `account_uid.eq.${account.uid}`)
        .limit(1)
        .maybeSingle();

      let appAccountId: string | null = previous?.account_id ?? null;
      if (!appAccountId) {
        const { data: created } = await supabaseAdmin
          .from('accounts')
          .insert({ user_id: userId, name: label, type: 'bank', balance: 0, currency: account.currency || 'EUR' })
          .select('id')
          .single();
        appAccountId = created?.id ?? null;
      }

      const row = {
        user_id: userId,
        aspsp_name: session.aspsp?.name || pending.aspsp_name,
        aspsp_country: session.aspsp?.country || pending.aspsp_country,
        session_id: session.session_id,
        account_uid: account.uid,
        iban,
        account_name: account.name || account.details || label,
        currency: account.currency || 'EUR',
        account_id: appAccountId,
        valid_until: session.access?.valid_until || null,
        status: 'active',
        last_error: null,
        updated_at: new Date().toISOString(),
      };

      if (previous) {
        // Al reconectar cambia el uid: mantenemos last_synced_at para no reimportar
        await supabaseAdmin.from('bank_links').update(row).eq('id', previous.id);
      } else {
        await supabaseAdmin.from('bank_links').insert(row);
      }
    }

    // Primera sincronización inmediata (últimos 90 días)
    const results = await syncAll(userId);
    const inserted = results.reduce((sum, r) => sum + r.inserted, 0);
    return back(request, { banco: 'ok', nuevos: String(inserted) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error conectando el banco';
    console.error('❌ /api/banking/callback:', message);
    return back(request, { banco: 'error', motivo: message.substring(0, 200) });
  }
}

