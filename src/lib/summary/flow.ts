/**
 * Reparto del mes según el papel de cada cuenta. Lógica pura.
 *
 *   Entró        → ingresos normales fuera de la cuenta de casa (la nómina)
 *   A deudas     → lo que metes en la cuenta de deudas (Revolut)
 *   A ahorro     → lo que metes en la cuenta de ahorro, menos lo que sacas
 *   A casa       → lo que tú metes en la conjunta (tu mitad)
 *   Gastado      → tu gasto normal, sin contar la cuenta de casa
 *
 * Los traspasos se miran por los dos lados: si la cuenta de destino está
 * conectada, cuenta lo que llega allí; si no, se deduce del texto del
 * movimiento de salida (Trade Republic, Revolut…).
 */
import type { AccountRole } from '@/lib/accounts/roles';

export interface FlowTx {
  id?: string;
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
  spent: number;
  toDebts: number;
  /** Cuotas que el banco ya ha cobrado este mes */
  debtsPaid: number;
  toSavings: number;
  invested: number;
  toHome: number;
  /** Lo que se ha gastado desde la cuenta de casa (alquiler, compra…), entre los dos */
  homeSpent: number | null;
  /** Traspasos a Revolut que no sé si fueron a la de deudas o a la conjunta */
  toRevolutUnknown: number;
}

type RoleOf = (accountId: string | null) => AccountRole | null;

const round = (n: number) => Math.round(n * 100) / 100;
const kindOf = (t: FlowTx) => t.kind || 'regular';
const dayNum = (d: string) => Date.UTC(+d.substring(0, 4), +d.substring(5, 7) - 1, +d.substring(8, 10)) / 86400000;

/** ¿Este movimiento cuenta como gasto tuyo? (gasto normal fuera de la cuenta de casa) */
export function isOwnSpending(t: FlowTx, roleOf: RoleOf): boolean {
  return t.type === 'expense' && kindOf(t) === 'regular' && roleOf(t.account_id) !== 'home';
}

const DEST_ROLES: AccountRole[] = ['debts', 'savings', 'home'];

export function computeFlow(txs: FlowTx[], roleOf: RoleOf, linkedRoles: Set<AccountRole>): MonthFlow {
  let income = 0, spent = 0, debtsPaid = 0, invested = 0, homeSpent = 0;
  const into: Record<'debts' | 'savings' | 'home', number> = { debts: 0, savings: 0, home: 0 };
  let outOfSavings = 0;
  let revolutUnknown = 0;

  const transfersOut: FlowTx[] = [];
  const transfersIn: FlowTx[] = [];

  for (const t of txs) {
    const amount = Number(t.amount) || 0;
    const kind = kindOf(t);
    const role = roleOf(t.account_id);

    if (kind === 'debt_payment' && t.type === 'expense') debtsPaid += amount;
    else if (kind === 'investment' && t.type === 'expense') invested += amount;
    else if (kind === 'regular' && t.type === 'income' && role !== 'home') income += amount;
    else if (isOwnSpending(t, roleOf)) spent += amount;

    if (role === 'home' && kind === 'regular' && t.type === 'expense') homeSpent += amount;

    if (kind === 'internal_transfer') (t.type === 'expense' ? transfersOut : transfersIn).push(t);
  }

  // 1. Lo que llega a una cuenta con papel (conectada) cuenta siempre
  const usedIn = new Set<FlowTx>();
  for (const t of transfersIn) {
    const role = roleOf(t.account_id);
    if (role === 'debts' || role === 'savings' || role === 'home') into[role] += Number(t.amount);
  }

  // 2. Salidas: si hay una entrada gemela en otra cuenta, ya está contada
  for (const t of transfersOut) {
    const amount = Number(t.amount);
    const fromRole = roleOf(t.account_id);
    if (fromRole === 'savings') outOfSavings += amount;

    const twin = transfersIn.find(
      (i) =>
        !usedIn.has(i) &&
        i.account_id !== t.account_id &&
        Math.abs(Number(i.amount) - amount) <= 0.01 &&
        Math.abs(dayNum(i.date) - dayNum(t.date)) <= 4
    );
    if (twin) {
      usedIn.add(twin);
      continue;
    }
    if (fromRole && DEST_ROLES.includes(fromRole)) continue; // salidas de deudas/casa a cuentas no conectadas: no son reparto

    // 3. Sin gemela: el destino no está conectado. Lo deduzco del texto.
    const text = `${t.counterparty ?? ''} ${t.description ?? ''}`.toLowerCase();
    if (/trade ?republic/.test(text)) {
      into.savings += amount;
    } else if (/revolut/.test(text)) {
      const debtsLinked = linkedRoles.has('debts');
      const homeLinked = linkedRoles.has('home');
      // Si una de las dos Revolut está conectada y no ha llegado nada allí, fue a la otra
      if (debtsLinked && !homeLinked) into.home += amount;
      else if (homeLinked && !debtsLinked) into.debts += amount;
      else revolutUnknown += amount;
    }
  }

  return {
    income: round(income),
    spent: round(spent),
    toDebts: round(into.debts),
    debtsPaid: round(debtsPaid),
    toSavings: round(into.savings - outOfSavings),
    invested: round(invested),
    toHome: round(into.home),
    homeSpent: linkedRoles.has('home') ? round(homeSpent) : null,
    toRevolutUnknown: round(revolutUnknown),
  };
}

/**
 * Próxima nómina cuando no hay día de cobro configurado: el día del último
 * ingreso grande. Devuelve null si no hay ninguno.
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
