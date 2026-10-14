/**
 * Papel de cada cuenta en el sistema de dinero de Jordi:
 *   BBVA → día a día · Revolut → deudas · Trade Republic → ahorro · Revolut conjunta → casa
 * Lógica pura (sin red ni base de datos) para poder probarla.
 */
import { normalizeText } from '@/lib/banking/transform';

export type AccountRole = 'daily' | 'debts' | 'savings' | 'home';

export const ROLES: AccountRole[] = ['daily', 'debts', 'savings', 'home'];

export const ROLE_LABEL: Record<AccountRole, string> = {
  daily: 'Día a día',
  debts: 'Deudas',
  savings: 'Ahorro',
  home: 'Casa',
};

export const ROLE_HINT: Record<AccountRole, string> = {
  daily: 'Cobras la nómina y gastas',
  debts: 'Desde aquí se pagan las cuotas',
  savings: 'Ahorro e inversión',
  home: 'Alquiler y gastos de casa, a medias',
};

export function isRole(value: unknown): value is AccountRole {
  return typeof value === 'string' && (ROLES as string[]).includes(value);
}

export interface AccountForRole {
  id: string;
  name: string;
  type?: string | null;
  role?: string | null;
  /** Nombre del banco si la cuenta está conectada (bank_links.aspsp_name). */
  bank?: string | null;
  /** Nombre de la cuenta que da el banco (bank_links.account_name). */
  bankAccountName?: string | null;
}

const JOINT = /(conjunt|joint|compartid|shared|grupo|group|casa|hogar|pareja)/;

/** Lo que se puede deducir solo con el nombre. Puede devolver null. */
export function guessRole(a: AccountForRole): AccountRole | null {
  const text = normalizeText(`${a.bank ?? ''} ${a.name ?? ''} ${a.bankAccountName ?? ''}`);
  if (/trade ?republic/.test(text) || a.type === 'savings' || a.type === 'investment') return 'savings';
  if (/revolut/.test(text)) return JOINT.test(text) ? 'home' : 'debts';
  if (/\bbbva\b/.test(text)) return 'daily';
  if (JOINT.test(text)) return 'home';
  return null;
}

/**
 * Papel final de cada cuenta. El que hayas elegido tú manda; si no, se adivina.
 * Si dos cuentas sin elegir se adivinan con el mismo papel de Revolut (las dos
 * Revolut sin "conjunta" en el nombre), no se adivina ninguna: mejor preguntarte
 * que mezclar los gastos de casa con los tuyos.
 */
export function resolveRoles(accounts: AccountForRole[]): Map<string, { role: AccountRole | null; guessed: boolean }> {
  const out = new Map<string, { role: AccountRole | null; guessed: boolean }>();
  const explicit = new Set<AccountRole>();
  for (const a of accounts) {
    if (isRole(a.role)) {
      out.set(a.id, { role: a.role, guessed: false });
      explicit.add(a.role);
    }
  }

  const guesses = accounts.filter((a) => !out.has(a.id)).map((a) => ({ a, role: guessRole(a) }));
  const count = new Map<AccountRole, number>();
  for (const g of guesses) if (g.role) count.set(g.role, (count.get(g.role) || 0) + 1);

  for (const { a, role } of guesses) {
    let final = role;
    if (final === 'debts' || final === 'home') {
      const other: AccountRole = final === 'debts' ? 'home' : 'debts';
      if (explicit.has(final)) {
        // La otra Revolut ya la marcaste tú: esta es la que queda
        final = explicit.has(other) ? null : other;
      } else if ((count.get(final) || 0) > 1) {
        // Dos Revolut y ninguna dice cuál es cuál: mejor preguntar
        final = null;
      }
    }
    out.set(a.id, { role: final, guessed: final !== null });
  }
  return out;
}
