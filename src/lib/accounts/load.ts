import { supabaseAdmin } from '@/lib/supabase/admin';
import { resolveRoles, type AccountRole } from './roles';

export interface AccountWithRole {
  id: string;
  name: string;
  balance: number;
  role: AccountRole | null;
  /** true si el papel lo ha deducido la app (no lo has elegido tú) */
  guessed: boolean;
  /** cuenta conectada al banco */
  linked: boolean;
  bank: string | null;
  lastSync: string | null;
}

/** Tus cuentas activas con su papel (elegido o adivinado). Funciona aunque falte la migración 013. */
export async function loadAccounts(userId: string): Promise<{ accounts: AccountWithRole[]; rolesMigrated: boolean }> {
  const [accountsRes, linksRes] = await Promise.all([
    supabaseAdmin.from('accounts').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    supabaseAdmin.from('bank_links').select('account_id, aspsp_name, account_name, last_synced_at, status').eq('user_id', userId),
  ]);
  const rows = ((accountsRes.data || []) as any[]).filter((a) => a.is_active !== false);
  const rolesMigrated = rows.length === 0 || rows.some((a) => 'role' in a);
  const links = (linksRes.data || []) as {
    account_id: string | null;
    aspsp_name: string;
    account_name: string | null;
    last_synced_at: string | null;
    status: string;
  }[];
  const linkOf = (id: string) => links.find((l) => l.account_id === id);

  const resolved = resolveRoles(
    rows.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      role: a.role ?? null,
      bank: linkOf(a.id)?.aspsp_name ?? null,
      bankAccountName: linkOf(a.id)?.account_name ?? null,
    }))
  );

  const accounts = rows.map((a) => {
    const link = linkOf(a.id);
    const r = resolved.get(a.id) || { role: null, guessed: false };
    return {
      id: a.id as string,
      name: a.name as string,
      balance: Math.round(Number(a.balance || 0) * 100) / 100,
      role: r.role,
      guessed: r.guessed,
      linked: Boolean(link),
      bank: link?.aspsp_name ?? null,
      lastSync: link?.last_synced_at ?? null,
    };
  });

  return { accounts, rolesMigrated };
}
