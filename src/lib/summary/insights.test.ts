import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildInsightFacts, merchantKey, tipsFromFacts, type InsightFacts, type InsightTx } from './insights';
import type { AccountRole } from '../accounts/roles';

const roles: Record<string, AccountRole> = { bbva: 'daily', rev: 'debts', joint: 'home' };
const roleOf = (id: string | null) => (id ? roles[id] ?? null : null);
let n = 0;
const tx = (p: Partial<InsightTx>): InsightTx => ({
  id: `t${n++}`,
  date: '2026-10-05',
  type: 'expense',
  amount: 10,
  kind: 'regular',
  account_id: 'bbva',
  ...p,
});

const base: InsightFacts = {
  mes: '26 sep – 25 oct',
  dia_del_mes: 15,
  dias_del_mes: 30,
  mes_en_curso: true,
  te_queda_en_cuenta_del_dia_a_dia: 500,
  por_dia_hasta_nomina: 33,
  dias_hasta_nomina: 15,
  gastado: 600,
  media_gastada_a_esta_altura: 600,
  ingresos: 2000,
  cuotas_de_deudas: 0,
  invertido: 0,
  pasado_a_ahorro: 0,
  movimientos_sin_categoria: 0,
  categorias: [],
  comercios: [],
  recurrentes: [],
};

test('mismo comercio aunque cambien números y acentos', () => {
  assert.equal(merchantKey('MERCADONA 1234 ARENYS'), merchantKey('Mercadona 99 Arenys'));
  assert.equal(merchantKey('Café Sólo'), 'cafe solo');
});

test('sin nada raro no hay consejos', () => {
  assert.deepEqual(tipsFromFacts(base), []);
});

test('ritmo: avisa si vas por encima de tu media y felicita si vas por debajo', () => {
  const [over] = tipsFromFacts({ ...base, gastado: 800 });
  assert.equal(over?.tipo, 'alerta');
  assert.match(over!.texto, /200 € más que tu media a estas alturas del mes \(\+33 %\)/);
  const [under] = tipsFromFacts({ ...base, gastado: 400 });
  assert.equal(under?.tipo, 'bien');
});

test('categoría disparada, ignorando cuotas de deudas', () => {
  const tips = tipsFromFacts({
    ...base,
    categorias: [
      { nombre: 'Cuotas de deudas', este_mes: 500, media_meses_anteriores: 100 },
      { nombre: 'Restaurantes', este_mes: 180, media_meses_anteriores: 90 },
      { nombre: 'Súper', este_mes: 210, media_meses_anteriores: 200 },
    ],
  });
  assert.equal(tips.length, 1);
  assert.match(tips[0]!.texto, /En Restaurantes llevas 180 €, 90 € más/);
});

test('como mucho 3, las alertas primero', () => {
  const tips = tipsFromFacts({
    ...base,
    gastado: 400,
    movimientos_sin_categoria: 8,
    recurrentes: [{ nombre: 'Netflix', importe_habitual: 13, meses: 3 }, { nombre: 'Spotify', importe_habitual: 11, meses: 3 }],
    comercios: [{ nombre: 'Bar Pepe', veces: 7, total: 42 }],
    categorias: [{ nombre: 'Ocio', este_mes: 150, media_meses_anteriores: 50 }],
  });
  assert.equal(tips.length, 3);
  assert.equal(tips[0]!.tipo, 'alerta');
  assert.match(tips[1]!.texto, /2 cargos fijos \(Netflix, Spotify\) que suman 24 €\/mes/);
});

test('hechos: traspasos fuera, conjunta a medias y cargos que se repiten', () => {
  const sub = (date: string) => tx({ date, amount: 12.99, counterparty: 'NETFLIX.COM', category: { name: 'Suscripciones' } });
  const all: InsightTx[] = [
    // tres meses anteriores (mes financiero desde el 26)
    sub('2026-07-01'), sub('2026-08-01'), sub('2026-09-01'),
    tx({ date: '2026-07-05', amount: 40, category: { name: 'Restaurantes' } }),
    tx({ date: '2026-08-05', amount: 40, category: { name: 'Restaurantes' } }),
    tx({ date: '2026-09-05', amount: 40, category: { name: 'Restaurantes' } }),
    // mes actual
    sub('2026-10-01'),
    tx({ date: '2026-10-03', amount: 150, category: { name: 'Restaurantes' } }),
    tx({ date: '2026-10-04', amount: 100, account_id: 'joint', category: { name: 'Casa' } }),
    tx({ date: '2026-10-02', amount: 300, kind: 'internal_transfer' }), // BBVA → Revolut
    tx({ date: '2026-10-02', amount: 300, kind: 'internal_transfer', type: 'income', account_id: 'rev' }),
  ];
  const facts = buildInsightFacts(
    {
      period: { label: 'oct', days: 30 },
      dayIndex: 15,
      isCurrent: true,
      remaining: 400,
      perDay: 40,
      payday: { daysLeft: 10 },
      average: 60,
      uncategorized: { count: 0 },
      flow: { income: 0, spent: 212.99, debtsPaid: 0, invested: 0, moved: { toSavings: 0 } },
    },
    { all, roleOf, linkedRoles: new Set(['daily', 'debts', 'home']), startDay: 26, month: '2026-10', dayIndex: 15, homeShare: 0.5 }
  );
  assert.deepEqual(facts.categorias.map((c) => [c.nombre, c.este_mes]), [['Restaurantes', 150], ['Casa', 50], ['Suscripciones', 12.99]]);
  assert.equal(facts.categorias[0]!.media_meses_anteriores, 40);
  assert.deepEqual(facts.recurrentes, [{ nombre: 'NETFLIX.COM', importe_habitual: 12.99, meses: 3 }]);
  assert.ok(!facts.comercios.some((c) => c.total === 300));
});
