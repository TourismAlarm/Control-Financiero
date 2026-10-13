// Ejecutar: npm run test:banking
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyKind, cleanMasked, mapTransaction, pickBalance, type ClassifyContext } from './transform';
import type { EbTransaction } from './enableBanking';

const tx = (overrides: Partial<EbTransaction>): EbTransaction => ({
  transaction_amount: { currency: 'EUR', amount: '25.40' },
  credit_debit_indicator: 'DBIT',
  status: 'BOOK',
  booking_date: '2026-10-10',
  entry_reference: 'REF1',
  ...overrides,
});

const ctx = (overrides: Partial<ClassifyContext> = {}): ClassifyContext => ({
  providerName: 'BBVA',
  ownIbans: new Set(['DE89370400440532013000']),
  ownNames: ['Jordi Elias'],
  loanNames: ['Cofidis'],
  ...overrides,
});

const classify = (t: EbTransaction, c = ctx()) => {
  const mapped = mapTransaction(t, 'acc-1');
  assert.ok(mapped);
  return classifyKind(mapped, c);
};

test('mapea un cargo con tarjeta como gasto', () => {
  const m = mapTransaction(tx({ creditor: { name: 'MERCADONA ARENYS' }, remittance_information: ['COMPRA TARJ 1234'] }), 'acc-1');
  assert.deepEqual(
    { type: m?.type, amount: m?.amount, date: m?.date, external_id: m?.external_id },
    { type: 'expense', amount: 25.4, date: '2026-10-10', external_id: 'eb:acc-1:REF1' }
  );
  assert.match(m!.description, /MERCADONA/);
});

test('ignora movimientos pendientes y sin importe', () => {
  assert.equal(mapTransaction(tx({ status: 'PDNG' }), 'a'), null);
  assert.equal(mapTransaction(tx({ transaction_amount: { currency: 'EUR', amount: '0' } }), 'a'), null);
});

test('sin referencia genera un id estable', () => {
  const a = mapTransaction(tx({ entry_reference: null, remittance_information: ['BIZUM'] }), 'a');
  const b = mapTransaction(tx({ entry_reference: null, remittance_information: ['BIZUM'] }), 'a');
  assert.equal(a?.external_id, b?.external_id);
});

test('el abono de la nómina es ingreso normal', () => {
  const t = tx({ credit_debit_indicator: 'CRDT', debtor: { name: 'TRANSPORTS I GRUES ELSA SL' }, remittance_information: ['NOMINA SEPTIEMBRE'] });
  assert.equal(classify(t), 'regular');
});

test('BBVA → Trade Republic es traspaso interno', () => {
  const t = tx({ creditor: { name: 'Trade Republic Bank GmbH' }, remittance_information: ['Ahorro mensual'] });
  assert.equal(classify(t), 'internal_transfer');
});

test('recarga de Revolut desde BBVA es traspaso interno', () => {
  assert.equal(classify(tx({ remittance_information: ['REVOLUT**4821* DUBLIN'] })), 'internal_transfer');
});

test('IBAN propio es traspaso aunque no diga el banco', () => {
  const t = tx({ creditor: { name: 'X' }, creditor_account: { iban: 'DE89 3704 0044 0532 0130 00' } });
  assert.equal(classify(t), 'internal_transfer');
});

test('transferencia a tu propio nombre es traspaso', () => {
  assert.equal(classify(tx({ creditor: { name: 'ELIAS SERRA JORDI' } })), 'internal_transfer');
});

test('otro Jordi no es traspaso', () => {
  assert.equal(classify(tx({ creditor: { name: 'JORDI PUIG' }, remittance_information: ['Bizum cena'] })), 'regular');
});

test('Trade Republic → exchange es inversión', () => {
  const t = tx({ creditor: { name: 'Bitvavo B.V.' } });
  assert.equal(classify(t, ctx({ providerName: 'Trade Republic' })), 'investment');
});

test('plan de ahorro dentro de Trade Republic es inversión', () => {
  const t = tx({ remittance_information: ['Savings plan execution MSCI World'] });
  assert.equal(classify(t, ctx({ providerName: 'Trade Republic' })), 'investment');
});

test('pago con tarjeta de Trade Republic es gasto normal', () => {
  const t = tx({ creditor: { name: 'GASOLINERA REPSOL' }, remittance_information: ['Card transaction'] });
  assert.equal(classify(t, ctx({ providerName: 'Trade Republic' })), 'regular');
});

test('pago a una deuda registrada desde Revolut', () => {
  const t = tx({ creditor: { name: 'COFIDIS SA' }, remittance_information: ['Cuota octubre'] });
  assert.equal(classify(t, ctx({ providerName: 'Revolut' })), 'debt_payment');
});

test('dentro de Revolut, la palabra Revolut no lo convierte en traspaso', () => {
  const t = tx({ creditor: { name: 'Amazon' }, remittance_information: ['Revolut card payment'] });
  assert.equal(classify(t, ctx({ providerName: 'Revolut' })), 'regular');
});

test('saldo: prefiere el contable sobre el disponible', () => {
  assert.equal(
    pickBalance([
      { balance_type: 'ITAV', balance_amount: { currency: 'EUR', amount: '1500.00' } },
      { balance_type: 'ITBD', balance_amount: { currency: 'EUR', amount: '1234.56' } },
    ]),
    1234.56
  );
});

test('saldo: usa lo que haya si el tipo es desconocido y null si no hay nada', () => {
  assert.equal(pickBalance([{ balance_type: 'XYZ', balance_amount: { currency: 'EUR', amount: '-20.5' } }]), -20.5);
  assert.equal(pickBalance([]), null);
});

test('quita lo enmascarado y deja lo legible', () => {
  assert.equal(cleanMasked('***'), null);
  assert.equal(cleanMasked('*** · COMPRA TARJ 4512****1234 MERCADONA'), 'COMPRA TARJ 4512 MERCADONA');
  assert.equal(cleanMasked('XXXX1234'), null);
  assert.equal(cleanMasked('TAXI EXXON XXXL'), 'TAXI EXXON XXXL');
});

test('movimiento con nombre enmascarado: muestra el concepto, mismo id que antes', () => {
  const masked = tx({ entry_reference: null, creditor: { name: '***' }, remittance_information: ['COMPRA EN MERCADONA ARENYS'] });
  const m = mapTransaction(masked, 'a');
  assert.equal(m?.counterparty, null);
  assert.equal(m?.description, 'COMPRA EN MERCADONA ARENYS');
  // El id se calcula con el concepto en bruto (como antes del arreglo) para no duplicar
  assert.match(m!.external_id, /^eb:a:[0-9a-f]{20}$/);
  const legacyRaw = '*** · COMPRA EN MERCADONA ARENYS';
  const { createHash } = require('crypto');
  const legacy = createHash('sha1').update(['2026-10-10', 'D', '25.40', legacyRaw.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()].join('|')).digest('hex').substring(0, 20);
  assert.equal(m!.external_id, `eb:a:${legacy}`);
});

test('todo enmascarado: texto de reserva', () => {
  const m = mapTransaction(tx({ creditor: { name: '***' }, remittance_information: ['****'] }), 'a');
  assert.equal(m?.description, 'Movimiento bancario');
});
