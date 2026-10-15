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
 * Devoluciones (ingresos con la categoría "Devoluciones") no son ingreso: rebajan el gasto
 * que devuelven. Si dijiste cuál (refund_of), ese gasto pasa a valer lo que te costó
 * (100 € con 25 devueltos → 75 €). Si no, se busca un gasto del mismo importe en la misma
 * cuenta en los 60 días anteriores (el Bizum de 90 € que te devuelven) y se anulan los dos.
 * Si el gasto es de otro mes o no aparece, la devolución resta del gasto de esa cuenta.
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
  /** Devolución: id del gasto que te devuelven */
  refund_of?: string | null;
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
  /** Ids de gastos devueltos enteros, y de las devoluciones ya aplicadas a un gasto del mes */
  refundedIds: string[];
  /** Gastos devueltos en parte: id → lo devuelto (cuentan solo la diferencia) */
  refundedBy: Record<string, number>;
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

  // 3b. Devoluciones: rebajan el gasto que devuelven
  const refundedIds: string[] = [];
  const reduced = new Map<FlowTx, number>();
  const looseRefunds: { tx: FlowTx; amount: number }[] = [];
  const left = (t: FlowTx) => Number(t.amount) - (reduced.get(t) || 0);
  let refunded = 0;
  for (const r of [...refunds].sort((a, b) => a.date.localeCompare(b.date))) {
    const amount = Number(r.amount);
    refunded += amount;
    let original: FlowTx | undefined;
    if (r.refund_of) {
      original = realOut.find((t) => t.id === r.refund_of && kindOf(t) === 'regular');
    } else {
      // Sin decir cuál: un gasto del mismo importe, misma cuenta, en los días anteriores
      original = realOut
        .filter(
          (t) =>
            kindOf(t) === 'regular' &&
            !reduced.has(t) &&
            t.account_id === r.account_id &&
            Math.abs(Number(t.amount) - amount) <= 0.01 &&
            dayNum(r.date) - dayNum(t.date) >= 0 &&
            dayNum(r.date) - dayNum(t.date) <= REFUND_WINDOW
        )
        .sort((a, b) => b.date.localeCompare(a.date))[0];
    }
    if (!original) {
      looseRefunds.push({ tx: r, amount });
      continue;
    }
    const applied = Math.min(amount, left(original));
    reduced.set(original, (reduced.get(original) || 0) + applied);
    if (r.id) refundedIds.push(r.id);
    // Te devuelven más de lo que costó: el resto resta del gasto de la cuenta
    if (amount - applied > 0.005) looseRefunds.push({ tx: r, amount: amount - applied });
  }
  const refundedBy: Record<string, number> = {};
  for (const [t, amount] of reduced) {
    if (left(t) <= 0.005) {
      realOut.splice(realOut.indexOf(t), 1);
      if (t.id) refundedIds.push(t.id);
    } else if (t.id) {
      refundedBy[t.id] = round(amount);
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
    const amount = left(t);
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
  for (const { tx: r, amount } of looseRefunds) {
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
    refundedBy,
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
