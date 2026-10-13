// Ejecutar: npm run test:banking
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectRecurringDebts, matchLoan, merchantKey, splitPayment, type TxForDetection } from './detect';

let n = 0;
const tx = (date: string, amount: number, counterparty: string | null, description = ''): TxForDetection => ({
  id: `t${++n}`,
  date,
  amount,
  counterparty,
  description: description || counterparty || '',
  account_id: 'rev',
});

const none = { exclude: new Set<string>(), existingMatches: [] };

test('detecta una cuota mensual estable en 3 meses', () => {
  const s = detectRecurringDebts(
    [tx('2026-07-10', 145, 'ONEY BANK SA'), tx('2026-08-10', 145, 'ONEY BANK SA'), tx('2026-09-11', 145, 'ONEY BANK SA')],
    none
  );
  assert.equal(s.length, 1);
  assert.deepEqual({ amount: s[0]!.amount, day: s[0]!.day, months: s[0]!.months }, { amount: 145, day: 10, months: 3 });
  assert.equal(s[0]!.payments[0]!.date, '2026-09-11'); // el más reciente primero
});

test('con palabra de financiación bastan 2 meses', () => {
  const s = detectRecurringDebts([tx('2026-08-05', 180, 'COFIDIS'), tx('2026-09-05', 180, 'COFIDIS')], none);
  assert.equal(s.length, 1);
});

test('no sugiere suscripciones, importes pequeños ni importes que bailan', () => {
  const s = detectRecurringDebts(
    [
      tx('2026-07-01', 30, 'MOVISTAR'), tx('2026-08-01', 30, 'MOVISTAR'), tx('2026-09-01', 30, 'MOVISTAR'),
      tx('2026-07-03', 9.99, 'XYZ STORE'), tx('2026-08-03', 9.99, 'XYZ STORE'), tx('2026-09-03', 9.99, 'XYZ STORE'),
      tx('2026-07-07', 80, 'MERCADONA'), tx('2026-08-07', 140, 'MERCADONA'), tx('2026-09-07', 60, 'MERCADONA'),
    ],
    none
  );
  assert.equal(s.length, 0);
});

test('no repite lo descartado ni lo que ya es una deuda', () => {
  const list = [tx('2026-08-05', 180, 'COFIDIS'), tx('2026-09-05', 180, 'COFIDIS')];
  assert.equal(detectRecurringDebts(list, { exclude: new Set([merchantKey('COFIDIS', '')]), existingMatches: [] }).length, 0);
  assert.equal(detectRecurringDebts(list, { exclude: new Set(), existingMatches: ['cofidis'] }).length, 0);
});

test('la clave ignora números de recibo', () => {
  assert.equal(merchantKey(null, 'RECIBO COFIDIS 0012345'), merchantKey(null, 'RECIBO COFIDIS 0099881'));
});

test('enlaza el pago a la deuda por el texto del banco', () => {
  const loans = [{ id: 'coche', bank_match: 'Cofidis', contact_name: 'Préstamo coche' }];
  assert.equal(matchLoan('COFIDIS SA · Cuota octubre', loans), 'coche');
  assert.equal(matchLoan('MERCADONA', loans), null);
});

test('reparte capital e intereses', () => {
  assert.deepEqual(splitPayment(180, 4000, 6), { principal: 160, interest: 20 });
  assert.deepEqual(splitPayment(180, 4000, 0), { principal: 180, interest: 0 });
});
