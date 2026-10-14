import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFlow, nextPayday, type FlowTx } from './flow';
import { resolveRoles, guessRole } from '../accounts/roles';
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
      tx({ kind: 'internal_transfer', amount: 400 }), // BBVA → Revolut (no cuenta)
      tx({ kind: 'debt_payment', amount: 250, account_id: 'rev' }),
      tx({ kind: 'internal_transfer', type: 'income', amount: 300, account_id: 'tr' }),
      tx({ kind: 'internal_transfer', amount: 50, account_id: 'tr' }), // saco 50 del ahorro
      tx({ kind: 'investment', amount: 100, account_id: 'tr' }),
      tx({ kind: 'internal_transfer', type: 'income', amount: 600, account_id: 'joint' }), // mi mitad
      tx({ type: 'income', amount: 600, account_id: 'joint' }), // la mitad de mi pareja
      tx({ amount: 900, account_id: 'joint' }), // alquiler
    ],
    roleOf,
    new Set<AccountRole>(['daily', 'debts', 'savings', 'home'])
  );
  assert.deepEqual(flow, { income: 2000, debts: 250, savings: 250, invested: 100, home: 600, homeSpent: 900, spent: 80 });
});

test('sin ahorro ni casa conectados: ahorro por el texto, casa desconocida', () => {
  const flow = computeFlow(
    [tx({ kind: 'internal_transfer', amount: 200, description: 'Transferencia a Trade Republic' })],
    roleOf,
    new Set<AccountRole>(['daily'])
  );
  assert.equal(flow.savings, 200);
  assert.equal(flow.home, null);
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
