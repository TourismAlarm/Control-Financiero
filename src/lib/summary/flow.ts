/**
 * Reparto del mes según el papel de cada cuenta. Lógica pura.
 *
 *   Entró        → ingresos normales fuera de la cuenta de casa (la nómina)
 *   A deudas     → cuotas pagadas (movimientos marcados como pago de deuda)
 *   A ahorro     → lo que entra en la cuenta de ahorro desde tus cuentas, menos lo que sacas
 *   A casa       → lo que tú metes en la conjunta (tu mitad)
 *   Gastado      → tu gasto normal, sin contar la cuenta de casa
 */
import type { AccountRole } from '@/lib/accounts/roles';

export interface FlowTx {
  date: string;
  type: 'income' | 'expense';
  amount: number;
  kind: string | null;
  account_id: string | null;
  description?: string | null;
  counterparty?: string | null;
}

export interface MonthFlow {
  income: number;
  debts: number;
  /** null: no sabemos (la cuenta de ahorro no está conectada y no hay traspasos reconocibles) */
  savings: number | null;
  invested: number;
  /** null: la cuenta de casa no está conectada */
  home: number | null;
  /** Lo que se ha gastado desde la cuenta de casa (alquiler, compra…), entre los dos */
  homeSpent: number | null;
  spent: number;
}

const round = (n: number) => Math.round(n * 100) / 100;
const kindOf = (t: FlowTx) => t.kind || 'regular';

/** ¿Este movimiento cuenta como gasto tuyo? (gasto normal fuera de la cuenta de casa) */
export function isOwnSpending(t: FlowTx, roleOf: (accountId: string | null) => AccountRole | null): boolean {
  return t.type === 'expense' && kindOf(t) === 'regular' && roleOf(t.account_id) !== 'home';
}

export function computeFlow(
  txs: FlowTx[],
  roleOf: (accountId: string | null) => AccountRole | null,
  linkedRoles: Set<AccountRole>
): MonthFlow {
  let income = 0, debts = 0, invested = 0, spent = 0;
  let savingsIn = 0, savingsOut = 0, savingsByText = 0;
  let homeIn = 0, homeSpent = 0;

  for (const t of txs) {
    const amount = Number(t.amount) || 0;
    const kind = kindOf(t);
    const role = roleOf(t.account_id);

    if (kind === 'debt_payment' && t.type === 'expense') debts += amount;
    else if (kind === 'investment' && t.type === 'expense') invested += amount;
    else if (kind === 'regular' && t.type === 'income' && role !== 'home') income += amount;
    else if (isOwnSpending(t, roleOf)) spent += amount;

    if (role === 'home' && kind === 'regular' && t.type === 'expense') homeSpent += amount;

    if (kind === 'internal_transfer') {
      if (role === 'savings') {
        if (t.type === 'income') savingsIn += amount;
        else savingsOut += amount;
      } else if (role === 'home' && t.type === 'income') {
        homeIn += amount;
      } else if (role !== 'home') {
        // Sin la cuenta de ahorro conectada: reconocer el traspaso por el texto
        const text = `${t.counterparty ?? ''} ${t.description ?? ''}`.toLowerCase();
        if (/trade ?republic/.test(text)) savingsByText += t.type === 'expense' ? amount : -amount;
      }
    }
  }

  const savingsLinked = linkedRoles.has('savings');
  const homeLinked = linkedRoles.has('home');
  return {
    income: round(income),
    debts: round(debts),
    savings: savingsLinked ? round(savingsIn - savingsOut) : savingsByText !== 0 ? round(savingsByText) : null,
    invested: round(invested),
    home: homeLinked ? round(homeIn) : null,
    homeSpent: homeLinked ? round(homeSpent) : null,
    spent: round(spent),
  };
}

/**
 * Próxima nómina: el día del último ingreso grande en la cuenta del día a día.
 * Devuelve null si no hay ninguno en el histórico que se le pasa.
 */
export function nextPayday(
  incomes: { date: string; amount: number }[],
  today: Date,
  minAmount = 300
): { day: number; date: string; daysLeft: number } | null {
  const big = incomes.filter((t) => t.amount >= minAmount).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!big) return null;
  const day = parseInt(big.date.substring(8, 10), 10);
  const y = today.getFullYear();
  const m = today.getMonth();
  const clamp = (yy: number, mm: number) => Math.min(day, new Date(yy, mm + 1, 0).getDate());
  let target = new Date(y, m, clamp(y, m));
  if (target.getDate() <= today.getDate()) target = new Date(y, m + 1, clamp(y, m + 1));
  const start = new Date(y, m, today.getDate());
  const daysLeft = Math.max(1, Math.round((target.getTime() - start.getTime()) / 86400000));
  const iso = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
  return { day, date: iso, daysLeft };
}
