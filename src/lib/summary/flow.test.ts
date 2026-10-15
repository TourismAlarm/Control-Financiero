import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFlow, nextPayday, type FlowTx } from './flow';
import { resolveRoles, guessRole } from '../accounts/roles';
import { periodOf, monthOfDate, dayInPeriod, sameHeight, periodLabel } from '../period';
import type { AccountRole } from '../accounts/roles';

const roles: Record<string, AccountRole> = { bbva: 'daily', rev: 'debts', tr: 'savings', joint: 'home' };
const roleOf = (id: string | null) => (id ? roles[id] ?? null : null);
const tx = (p: Partial<FlowTx>): FlowTx => ({ date: '2026-10-05', type: 'expense', amount: 10, kind: 'regular', account_id: 'bbva', ...p });

test('traspasos nunca son gasto; el gasto se cuenta en la cuenta donde se paga', () => {
  const flow = computeFlow(
    [
      tx({ id: 'n', type: 'income', amount: 2000 }), // nómina en BBVA
      tx({ amount: 50 }), // súper en BBVA
      tx({ kind: 'internal_transfer', amount: 400, date: '2026-10-01' }), // BBVA → Revolut
      tx({ kind: 'internal_transfer', type: 'income', amount: 400, account_id: 'rev', date: '2026-10-02' }),
      tx({ amount: 30, account_id: 'rev' }), // pago suelto desde Revolut
      tx({ kind: 'debt_payment', amount: 250, account_id: 'rev' }), // cuota
      tx({ kind: 'internal_transfer', amount: 300 }), // BBVA → Trade Republic
      tx({ kind: 'internal_transfer', type: 'income', amount: 300, account_id: 'tr' }),
      tx({ kind: 'internal_transfer', amount: 50, account_id: 'tr' }), // saco 50 del ahorro
      tx({ kind: 'internal_transfer', type: 'income', amount: 50 }),
      tx({ kind: 'investment', amount: 100, account_id: 'tr' }),
      tx({ kind: 'internal_transfer', amount: 650 }), // BBVA → conjunta
      tx({ kind: 'internal_transfer', type: 'income', amount: 650, account_id: 'joint' }),
      tx({ type: 'income', amount: 650, account_id: 'joint' }), // la mitad de mi pareja
      tx({ amount: 1200, account_id: 'joint' }), // alquiler
    ],
    roleOf,
    new Set<AccountRole>(['daily', 'debts', 'savings', 'home'])
  );
  assert.equal(flow.income, 2000);
  assert.equal(flow.spent, 50 + 30 + 250 + 600); // 600 = tu mitad del alquiler
  assert.deepEqual(flow.byAccount, [
    { accountId: 'joint', amount: 600, debts: 0, total: 1200 },
    { accountId: 'rev', amount: 280, debts: 250, total: 280 },
    { accountId: 'bbva', amount: 50, debts: 0, total: 50 },
  ]);
  assert.equal(flow.debtsPaid, 250);
  assert.equal(flow.invested, 100);
  assert.deepEqual(flow.moved, { toDebts: 400, toSavings: 250, toHome: 650, toRevolutUnknown: 0 });
});

test('solo BBVA conectado: los traspasos se reparten por el texto', () => {
  const flow = computeFlow(
    [
      tx({ kind: 'internal_transfer', amount: 200, description: 'Transferencia a Trade Republic' }),
      tx({ kind: 'internal_transfer', amount: 650, counterparty: 'Revolut Bank UAB' }),
      tx({ kind: 'internal_transfer', amount: 400, counterparty: 'Revolut Bank UAB' }),
    ],
    roleOf,
    new Set<AccountRole>(['daily'])
  );
  assert.equal(flow.spent, 0);
  assert.equal(flow.moved.toSavings, 200);
  assert.equal(flow.moved.toRevolutUnknown, 1050);
});

test('una Revolut conectada: lo que no llega a ella fue a la otra', () => {
  const flow = computeFlow(
    [
      tx({ kind: 'internal_transfer', amount: 400, description: 'A Revolut', date: '2026-10-01' }),
      tx({ kind: 'internal_transfer', type: 'income', amount: 400, account_id: 'rev', date: '2026-10-01' }),
      tx({ kind: 'internal_transfer', amount: 650, description: 'A Revolut' }),
    ],
    roleOf,
    new Set<AccountRole>(['daily', 'debts'])
  );
  assert.equal(flow.moved.toDebts, 400);
  assert.equal(flow.moved.toHome, 650);
});

test('traspasos que los bancos marcan como gasto o ingreso normal', () => {
  const flow = computeFlow(
    [
      tx({ id: 'n', type: 'income', amount: 1757 }),
      tx({ amount: 600 }), // gasto real en BBVA
      // BBVA → conjunta, marcado como traspaso en BBVA pero como ingreso en la conjunta
      tx({ kind: 'internal_transfer', amount: 650, date: '2026-09-27' }),
      tx({ id: 'j', type: 'income', amount: 650, account_id: 'joint', date: '2026-09-27' }),
      // BBVA → Revolut, marcado como gasto en BBVA y como ingreso en Revolut
      tx({ id: 'o', amount: 420, description: 'Transferencia', date: '2026-09-27' }),
      tx({ id: 'i', type: 'income', amount: 420, account_id: 'rev', date: '2026-09-28' }),
    ],
    roleOf,
    new Set<AccountRole>(['daily', 'debts', 'savings', 'home'])
  );
  assert.equal(flow.spent, 600);
  assert.equal(flow.income, 1757);
  assert.equal(flow.moved.toHome, 650);
  assert.equal(flow.moved.toDebts, 420);
  assert.deepEqual(flow.transferIds.sort(), ['i', 'j', 'o']);
});

test('próxima nómina', () => {
  const p = nextPayday([{ date: '2026-09-28', amount: 1900 }, { date: '2026-10-02', amount: 40 }], new Date(2026, 9, 14));
  assert.deepEqual(p, { day: 28, date: '2026-10-28', daysLeft: 14 });
  const after = nextPayday([{ date: '2026-10-03', amount: 1900 }], new Date(2026, 9, 14));
  assert.equal(after?.date, '2026-11-03');
  assert.equal(nextPayday([{ date: '2026-10-03', amount: 50 }], new Date(2026, 9, 14)), null);
});

test('adivinar el papel de cada cuenta', () => {
  assert.equal(guessRole({ id: '1', name: 'Cuenta', bank: 'BBVA' }), 'daily');
  assert.equal(guessRole({ id: '2', name: 'Trade Republic' }), 'savings');
  assert.equal(guessRole({ id: '3', name: 'Revolut', bank: 'Revolut' }), 'debts');
  assert.equal(guessRole({ id: '4', name: 'Revolut conjunta', bank: 'Revolut' }), 'home');
});

test('dos Revolut sin pistas: no se adivina; si marcas una, la otra es la que queda', () => {
  const two = [
    { id: 'a', name: 'Revolut', bank: 'Revolut' },
    { id: 'b', name: 'Revolut EUR', bank: 'Revolut' },
  ];
  const r1 = resolveRoles(two);
  assert.equal(r1.get('a')?.role, null);
  assert.equal(r1.get('b')?.role, null);
  const r2 = resolveRoles([{ ...two[0]!, role: 'home' }, two[1]!]);
  assert.equal(r2.get('a')?.role, 'home');
  assert.deepEqual(r2.get('b'), { role: 'debts', guessed: true });
});

test('mes financiero que empieza el 26', () => {
  assert.deepEqual(periodOf('2026-10', 26), { month: '2026-10', start: '2026-09-26', end: '2026-10-25', days: 30 });
  assert.deepEqual(periodOf('2026-01', 26), { month: '2026-01', start: '2025-12-26', end: '2026-01-25', days: 31 });
  assert.deepEqual(periodOf('2026-10', 1), { month: '2026-10', start: '2026-10-01', end: '2026-10-31', days: 31 });
  assert.equal(periodOf('2026-03', 31).start, '2026-02-28'); // cobro el 31 → en febrero, el 28
  assert.equal(monthOfDate('2026-10-15', 26), '2026-10');
  assert.equal(monthOfDate('2026-10-26', 26), '2026-11');
  assert.equal(monthOfDate('2026-09-26', 26), '2026-10');
  const p = periodOf('2026-10', 26);
  assert.equal(dayInPeriod(p, '2026-10-15'), 20);
  assert.equal(sameHeight(periodOf('2026-09', 26), 20), '2026-09-14');
  assert.equal(periodLabel(p), '26 sept – 25 oct');
});
