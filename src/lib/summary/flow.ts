/**
 * Gasto real y traspasos del mes. Lógica pura.
 *
 *   Traspasos entre tus cuentas → nunca son gasto (solo se enseñan: a Revolut, a casa, a ahorro)
 *   Gasto                       → lo que pagas desde cada cuenta: BBVA, Revolut (cuotas incluidas),
 *                                 Trade Republic y tu mitad de lo que se paga desde la conjunta
 *   Entró                       → ingresos que no vienen de otra cuenta tuya (la nómina)
 *
 * Un movimiento que el banco no marcó como traspaso, pero que sale de una cuenta tuya y
 * llega a otra (mismo importe, ±4 días), también es traspaso.
 *
 * Devoluciones (ingresos con la categoría "Devoluciones") no son ingreso: si hay un gasto
 * del mismo importe en la misma cuenta en los 60 días anteriores, se anulan los dos
 * (el Bizum de 90 € que te devuelven). Si no, restan del gasto de esa cuenta.
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
  /** Ingreso con la categoría "Devoluciones" */
  refund?: boolean;
}

export interface AccountSpending {
  accountId: string | null;
  /** Lo que cuenta como gasto tuyo (en la conjunta, tu parte) */
  amount: number;
  /** De eso, cuotas de deudas apuntadas */
  debts: number;
  /** Solo en la conjunta: lo gastado entre los dos */
  total: number;
}

export interface MonthFlow {
  income: number;
  /** Gasto real tuyo, sumando todas las cuentas */
  spent: number;
  byAccount: AccountSpending[];
  /** Cuotas de deudas apuntadas que se han cobrado (en cualquier cuenta) */
  debtsPaid: number;
  invested: number;
  /** Traspasos (no son gasto) */
  moved: { toDebts: number; toSavings: number; toHome: number; toRevolutUnknown: number };
  /** Ids de movimientos que parecían gasto o ingreso pero eran traspasos tuyos */
  transferIds: string[];
  /** Devoluciones del mes (lo que te han devuelto, ya descontado del gasto) */
  refunded: number;
  /** Ids de gastos anulados por una devolución, y de esas devoluciones */
  refundedIds: string[];
}

type RoleOf = (accountId: string | null) => AccountRole | null;

const round = (n: number) => Math.round(n * 100) / 100;
const kindOf = (t: FlowTx) => t.kind || 'regular';
const dayNum = (d: string) => Date.UTC(+d.substring(0, 4), +d.substring(5, 7) - 1, +d.substring(8, 10)) / 86400000;

const DEST_ROLES: AccountRole[] = ['debts', 'savings', 'home'];
/** Días hacia atrás en los que se busca el gasto que te devuelven */
const REFUND_WINDOW = 60;

/** Gasto real: pagos normales y cuotas, desde cualquier cuenta. */
export function isSpending(t: FlowTx): boolean {
  const kind = kindOf(t);
  return t.type === 'expense' && (kind === 'regular' || kind === 'debt_payment');
}

/** Qué parte de un gasto es tuya: la mitad en la conjunta, todo en el resto. */
export function shareOf(t: FlowTx, roleOf: RoleOf, homeShare: number): number {
  return roleOf(t.account_id) === 'home' ? homeShare : 1;
}

export function computeFlow(
  txs: FlowTx[],
  roleOf: RoleOf,
  linkedRoles: Set<AccountRole>,
  homeShare = 0.5
): MonthFlow {
  let debtsPaid = 0, invested = 0;
  const moved = { debts: 0, savings: 0, home: 0, unknown: 0 };
  let outOfSavings = 0;

  const transfersOut: FlowTx[] = [];
  const transfersIn: FlowTx[] = [];
  const plainIn: FlowTx[] = [];
  const plainOut: FlowTx[] = [];
  const refunds: FlowTx[] = [];

  for (const t of txs) {
    const kind = kindOf(t);
    if (kind === 'internal_transfer') (t.type === 'expense' ? transfersOut : transfersIn).push(t);
    else if (kind === 'investment' && t.type === 'expense') invested += Number(t.amount);
    else if (t.type === 'income' && t.refund) refunds.push(t);
    else if (t.type === 'income') plainIn.push(t);
    else if (isSpending(t)) plainOut.push(t);
  }

  const used = new Set<FlowTx>();
  const twinOf = (t: FlowTx, pool: FlowTx[]) =>
    pool.find(
      (i) =>
        !used.has(i) &&
        i !== t &&
        i.account_id !== t.account_id &&
        Math.abs(Number(i.amount) - Number(t.amount)) <= 0.01 &&
        Math.abs(dayNum(i.date) - dayNum(t.date)) <= 4
    );
  const addMoved = (role: AccountRole | null, amount: number) => {
    if (role === 'debts' || role === 'savings' || role === 'home') moved[role] += amount;
  };

  // 1. Lo que entra como traspaso en Revolut, ahorro o casa
  for (const t of transfersIn) addMoved(roleOf(t.account_id), Number(t.amount));

  // 2. Salidas marcadas como traspaso
  for (const t of transfersOut) {
    const amount = Number(t.amount);
    const fromRole = roleOf(t.account_id);
    if (fromRole === 'savings') outOfSavings += amount;

    const twin = twinOf(t, transfersIn);
    if (twin) {
      used.add(twin);
      continue;
    }
    // Llega a otra cuenta tuya como ingreso normal: es traspaso
    const plainTwin = twinOf(t, plainIn);
    if (plainTwin && plainTwin.account_id) {
      used.add(plainTwin);
      addMoved(roleOf(plainTwin.account_id), amount);
      continue;
    }
    if (fromRole && DEST_ROLES.includes(fromRole)) continue;

    // Destino no conectado: por el texto
    const text = `${t.counterparty ?? ''} ${t.description ?? ''}`.toLowerCase();
    if (/trade ?republic/.test(text)) moved.savings += amount;
    else if (/revolut/.test(text)) {
      const debtsLinked = linkedRoles.has('debts');
      const homeLinked = linkedRoles.has('home');
      if (debtsLinked && !homeLinked) moved.home += amount;
      else if (homeLinked && !debtsLinked) moved.debts += amount;
      else moved.unknown += amount;
    }
  }

  // 3. Gastos normales que en realidad llegan a otra cuenta tuya: traspaso
  const transferIds: string[] = [];
  const realOut: FlowTx[] = [];
  for (const t of plainOut) {
    if (kindOf(t) === 'regular') {
      const twin = twinOf(t, [...transfersIn, ...plainIn]);
      if (twin && twin.account_id) {
        if (!transfersIn.includes(twin)) addMoved(roleOf(twin.account_id), Number(t.amount));
        used.add(twin);
        if (t.id) transferIds.push(t.id);
        if (twin.id && !transfersIn.includes(twin)) transferIds.push(twin.id);
        continue;
      }
    }
    realOut.push(t);
  }
  for (const t of plainIn) if (used.has(t) && t.id && !transferIds.includes(t.id)) transferIds.push(t.id);

  // 3b. Devoluciones: anulan el gasto que devuelven (misma cuenta, mismo importe, antes)
  const refundedIds: string[] = [];
  const looseRefunds: FlowTx[] = [];
  let refunded = 0;
  for (const r of [...refunds].sort((a, b) => a.date.localeCompare(b.date))) {
    refunded += Number(r.amount);
    const candidates = realOut
      .filter(
        (t) =>
          kindOf(t) === 'regular' &&
          t.account_id === r.account_id &&
          Math.abs(Number(t.amount) - Number(r.amount)) <= 0.01 &&
          dayNum(r.date) - dayNum(t.date) >= 0 &&
          dayNum(r.date) - dayNum(t.date) <= REFUND_WINDOW
      )
      .sort((a, b) => b.date.localeCompare(a.date));
    const original = candidates[0];
    if (original) {
      realOut.splice(realOut.indexOf(original), 1);
      if (original.id) refundedIds.push(original.id);
      if (r.id) refundedIds.push(r.id);
    } else {
      looseRefunds.push(r);
    }
  }

  // 4. Ingresos: lo que no viene de una cuenta tuya, fuera de la conjunta (allí entra lo de tu pareja)
  let income = 0;
  for (const t of plainIn) {
    if (used.has(t)) continue;
    if (roleOf(t.account_id) === 'home') continue;
    income += Number(t.amount);
  }

  // 5. Gasto por cuenta
  const byAccount = new Map<string | null, AccountSpending>();
  let spent = 0;
  for (const t of realOut) {
    const amount = Number(t.amount);
    const share = shareOf(t, roleOf, homeShare);
    const entry = byAccount.get(t.account_id) || { accountId: t.account_id, amount: 0, debts: 0, total: 0 };
    entry.amount += amount * share;
    entry.total += amount;
    if (kindOf(t) === 'debt_payment') {
      entry.debts += amount * share;
      debtsPaid += amount;
    }
    byAccount.set(t.account_id, entry);
    spent += amount * share;
  }
  // Devoluciones de gastos de otro mes: restan del gasto de la cuenta donde llegan
  for (const r of looseRefunds) {
    const amount = Number(r.amount);
    const share = shareOf(r, roleOf, homeShare);
    const entry = byAccount.get(r.account_id) || { accountId: r.account_id, amount: 0, debts: 0, total: 0 };
    entry.amount -= amount * share;
    entry.total -= amount;
    byAccount.set(r.account_id, entry);
    spent -= amount * share;
  }

  return {
    income: round(income),
    spent: round(spent),
    byAccount: [...byAccount.values()]
      .map((a) => ({ ...a, amount: round(a.amount), debts: round(a.debts), total: round(a.total) }))
      .sort((a, b) => b.amount - a.amount),
    debtsPaid: round(debtsPaid),
    invested: round(invested),
    moved: {
      toDebts: round(moved.debts),
      toSavings: round(moved.savings - outOfSavings),
      toHome: round(moved.home),
      toRevolutUnknown: round(moved.unknown),
    },
    transferIds,
    refunded: round(refunded),
    refundedIds,
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
