import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFlow, nextPayday, type FlowTx } from './flow';
import { resolveRoles, guessRole } from '../accounts/roles';
import { periodOf, monthOfDate, dayInPeriod, sameHeight, periodLabel } from '../period';
import type { AccountRole } from '../accounts/roles';

const roles: Record<string, AccountRole> = { bbva: 'daily', rev: 'debts', tr: 'savings', joint: 'home' };
const roleOf = (id: string | null) => (id ? roles[id] ?? null : null);
const tx = (p: Partial<FlowTx>): FlowTx => ({ date: '2026-10-05', type: 'expense', amount: 10, kind: 'regular', account_id: 'bbva', ...p });

test('reparto del mes con las cuatro cuentas conectadas', () => {
  const flow = computeFlow(
    [
      tx({ type: 'income', amount: 2000 }), // nómina en BBVA
      tx({ amount: 50 }), // súper en BBVA
      tx({ amount: 30, account_id: 'rev' }), // gasto suelto desde Revolut
      tx({ kind: 'internal_transfer', amount: 400, date: '2026-10-01' }), // BBVA → Revolut
      tx({ kind: 'internal_transfer', type: 'income', amount: 400, account_id: 'rev', date: '2026-10-02' }),
      tx({ kind: 'debt_payment', amount: 250, account_id: 'rev' }),
      tx({ kind: 'internal_transfer', amount: 300 }), // BBVA → Trade Republic
      tx({ kind: 'internal_transfer', type: 'income', amount: 300, account_id: 'tr' }),
      tx({ kind: 'internal_transfer', amount: 50, account_id: 'tr' }), // saco 50 del ahorro
      tx({ kind: 'internal_transfer', type: 'income', amount: 50 }), // y llegan a BBVA
      tx({ kind: 'investment', amount: 100, account_id: 'tr' }),
      tx({ kind: 'internal_transfer', amount: 650 }), // BBVA → conjunta
      tx({ kind: 'internal_transfer', type: 'income', amount: 650, account_id: 'joint' }), // mi mitad
      tx({ type: 'income', amount: 650, account_id: 'joint' }), // la mitad de mi pareja
      tx({ amount: 1200, account_id: 'joint' }), // alquiler
    ],
    roleOf,
    new Set<AccountRole>(['daily', 'debts', 'savings', 'home'])
  );
  assert.deepEqual(flow, {
    income: 2000,
    spent: 80,
    toDebts: 400,
    debtsPaid: 250,
    toSavings: 250,
    invested: 100,
    toHome: 650,
    homeSpent: 1200,
    toRevolutUnknown: 0,
  });
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
  assert.equal(flow.toSavings, 200);
  assert.equal(flow.toRevolutUnknown, 1050);
  assert.equal(flow.homeSpent, null);
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
  assert.equal(flow.toDebts, 400);
  assert.equal(flow.toHome, 650);
  assert.equal(flow.toRevolutUnknown, 0);
});

test('traspaso que el banco de destino marca como ingreso normal', () => {
  const flow = computeFlow(
    [
      tx({ type: 'income', amount: 2000 }),
      tx({ kind: 'internal_transfer', amount: 650, description: 'Alquiler', date: '2026-09-27' }),
      tx({ type: 'income', amount: 650, account_id: 'joint', date: '2026-09-27' }),
      tx({ kind: 'internal_transfer', amount: 420, description: 'Deudas', date: '2026-09-27' }),
      tx({ type: 'income', amount: 420, account_id: 'rev', date: '2026-09-28' }),
    ],
    roleOf,
    new Set<AccountRole>(['daily', 'debts', 'savings', 'home'])
  );
  assert.equal(flow.toHome, 650);
  assert.equal(flow.toDebts, 420);
  assert.equal(flow.income, 2000);
  assert.equal(flow.toRevolutUnknown, 0);
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
