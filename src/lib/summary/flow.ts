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
  /** Ingresos normales en tus cuentas (nómina…). Lo que entra en Revolut o la conjunta no cuenta. */
  income: number;
  /** Tu gasto: lo que pagas desde el día a día (y ahorro o cuentas sin papel). Nunca desde Revolut ni la conjunta. */
  spent: number;
  /** Lo que metes en la cuenta de deudas (+ cuotas que se pagan desde otras cuentas) */
  toDebts: number;
  /** Lo que ha salido de la cuenta de deudas (cuotas y otros pagos) */
  paidFromDebts: number;
  /** Cuotas de deudas registradas que el banco ya ha cobrado */
  debtsPaid: number;
  toSavings: number;
  invested: number;
  toHome: number;
  /** Lo que se ha gastado desde la cuenta de casa (alquiler, compra…), entre los dos */
  homeSpent: number | null;
  /** Traspasos a Revolut que no sé si fueron a la de deudas o a la conjunta */
  toRevolutUnknown: number;
  /** Gasto por cuenta, para poder comprobarlo */
  spentByAccount: { accountId: string | null; amount: number }[];
  /** Ids de gastos que en realidad eran traspasos tuyos (no cuentan como gasto) */
  transferIds: string[];
}

type RoleOf = (accountId: string | null) => AccountRole | null;

const round = (n: number) => Math.round(n * 100) / 100;
const kindOf = (t: FlowTx) => t.kind || 'regular';
const dayNum = (d: string) => Date.UTC(+d.substring(0, 4), +d.substring(5, 7) - 1, +d.substring(8, 10)) / 86400000;

const DEST_ROLES: AccountRole[] = ['debts', 'savings', 'home'];
/** Cuentas que se llenan con traspasos tuyos: lo que sale de ellas ya se contó al entrar. */
const FUNDED_ROLES: (AccountRole | null)[] = ['debts', 'home'];

/** ¿Este movimiento cuenta como gasto tuyo? Gasto normal desde cualquier cuenta menos Revolut deudas y la conjunta. */
export function isOwnSpending(t: FlowTx, roleOf: RoleOf): boolean {
  return t.type === 'expense' && kindOf(t) === 'regular' && !FUNDED_ROLES.includes(roleOf(t.account_id));
}

export function computeFlow(txs: FlowTx[], roleOf: RoleOf, linkedRoles: Set<AccountRole>): MonthFlow {
  let income = 0, debtsPaid = 0, invested = 0, homeSpent = 0, paidFromDebts = 0;
  const into: Record<'debts' | 'savings' | 'home', number> = { debts: 0, savings: 0, home: 0 };
  let outOfSavings = 0;
  let revolutUnknown = 0;

  const transfersOut: FlowTx[] = [];
  const transfersIn: FlowTx[] = [];
  const plainIn: FlowTx[] = []; // ingresos normales en cuentas con papel (pueden ser tus traspasos)
  const spending: FlowTx[] = [];

  for (const t of txs) {
    const amount = Number(t.amount) || 0;
    const kind = kindOf(t);
    const role = roleOf(t.account_id);

    if (t.type === 'expense' && role === 'debts' && kind !== 'internal_transfer') paidFromDebts += amount;
    if (t.type === 'expense' && role === 'home' && kind === 'regular') homeSpent += amount;

    if (kind === 'debt_payment' && t.type === 'expense') {
      debtsPaid += amount;
      // Cuota cobrada fuera de Revolut: también es dinero que va a deudas
      if (role !== 'debts') into.debts += amount;
    } else if (kind === 'investment' && t.type === 'expense') {
      invested += amount;
    } else if (kind === 'internal_transfer') {
      (t.type === 'expense' ? transfersOut : transfersIn).push(t);
    } else if (t.type === 'income') {
      if (role && DEST_ROLES.includes(role)) plainIn.push(t);
      if (!FUNDED_ROLES.includes(role)) income += amount;
    } else if (isOwnSpending(t, roleOf)) {
      spending.push(t);
    }
  }

  // 1. Lo que llega como traspaso a una cuenta con papel cuenta siempre
  const usedIn = new Set<FlowTx>();
  for (const t of transfersIn) {
    const role = roleOf(t.account_id);
    if (role === 'debts' || role === 'savings' || role === 'home') into[role] += Number(t.amount);
  }

  const twinOf = (t: FlowTx, pool: FlowTx[]) =>
    pool.find(
      (i) =>
        !usedIn.has(i) &&
        i.account_id !== t.account_id &&
        Math.abs(Number(i.amount) - Number(t.amount)) <= 0.01 &&
        Math.abs(dayNum(i.date) - dayNum(t.date)) <= 4
    );

  const countPlainTwin = (twin: FlowTx, amount: number) => {
    usedIn.add(twin);
    const role = roleOf(twin.account_id);
    if (role === 'debts' || role === 'savings' || role === 'home') into[role] += amount;
    if (!FUNDED_ROLES.includes(role)) income -= Number(twin.amount); // no era un ingreso, era tu dinero
  };

  // 2. Salidas marcadas como traspaso
  for (const t of transfersOut) {
    const amount = Number(t.amount);
    const fromRole = roleOf(t.account_id);
    if (fromRole === 'savings') outOfSavings += amount;

    const twin = twinOf(t, transfersIn);
    if (twin) {
      usedIn.add(twin);
      continue;
    }
    if (fromRole && DEST_ROLES.includes(fromRole)) continue;

    const plainTwin = twinOf(t, plainIn);
    if (plainTwin) {
      countPlainTwin(plainTwin, amount);
      continue;
    }

    // 3. Sin gemela: el destino no está conectado. Lo deduzco del texto.
    const text = `${t.counterparty ?? ''} ${t.description ?? ''}`.toLowerCase();
    if (/trade ?republic/.test(text)) {
      into.savings += amount;
    } else if (/revolut/.test(text)) {
      const debtsLinked = linkedRoles.has('debts');
      const homeLinked = linkedRoles.has('home');
      if (debtsLinked && !homeLinked) into.home += amount;
      else if (homeLinked && !debtsLinked) into.debts += amount;
      else revolutUnknown += amount;
    }
  }

  // 4. Gastos que en realidad son traspasos (el banco no los reconoció): llegan a otra cuenta tuya
  const spentByAccount = new Map<string | null, number>();
  const transferIds: string[] = [];
  let spent = 0;
  for (const t of spending) {
    const twin = twinOf(t, [...transfersIn.filter((i) => DEST_ROLES.includes(roleOf(i.account_id) as AccountRole)), ...plainIn]);
    if (twin) {
      if (transfersIn.includes(twin)) usedIn.add(twin); // ya contado en el paso 1
      else countPlainTwin(twin, Number(t.amount));
      if (t.id) transferIds.push(t.id);
      continue;
    }
    spent += Number(t.amount);
    spentByAccount.set(t.account_id, (spentByAccount.get(t.account_id) || 0) + Number(t.amount));
  }

  return {
    income: round(income),
    spent: round(spent),
    toDebts: round(into.debts),
    paidFromDebts: round(paidFromDebts),
    debtsPaid: round(debtsPaid),
    toSavings: round(into.savings - outOfSavings),
    invested: round(invested),
    toHome: round(into.home),
    homeSpent: linkedRoles.has('home') ? round(homeSpent) : null,
    toRevolutUnknown: round(revolutUnknown),
    spentByAccount: [...spentByAccount.entries()]
      .map(([accountId, amount]) => ({ accountId, amount: round(amount) }))
      .sort((a, b) => b.amount - a.amount),
    transferIds,
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
