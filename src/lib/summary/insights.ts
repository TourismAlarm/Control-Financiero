/**
 * Datos para los consejos del mes. Lógica pura: sin base de datos ni red.
 *
 * Resume el mes en unas pocas cifras y saca de ellas como mucho 3 consejos (reglas fijas, sin IA):
 *   ritmo        → lo gastado, lo que queda y los días hasta la nómina
 *   categorías   → este mes contra la media de los meses anteriores a la misma altura
 *   comercios    → dónde se va más dinero este mes
 *   recurrentes  → cargos que se repiten cada mes con importe parecido (suscripciones)
 *
 * Usa el mismo criterio de gasto que Inicio (computeFlow): los traspasos entre tus
 * cuentas y lo devuelto no cuentan, y de la conjunta solo cuenta tu parte.
 */
import type { AccountRole } from '@/lib/accounts/roles';
import { periodOf, sameHeight, shiftMonth } from '@/lib/period';
import { computeFlow, isSpending, shareOf, type FlowTx } from './flow';

export type InsightTx = FlowTx & { category?: { name: string } | null };

export interface InsightContext {
  all: InsightTx[];
  roleOf: (accountId: string | null) => AccountRole | null;
  linkedRoles: Set<AccountRole>;
  startDay: number;
  month: string;
  dayIndex: number;
  homeShare: number;
}

export interface InsightSummary {
  period: { label: string; days: number };
  dayIndex: number;
  isCurrent: boolean;
  remaining: number | null;
  perDay: number | null;
  payday: { daysLeft: number } | null;
  average: number | null;
  uncategorized: { count: number };
  flow: { income: number; spent: number; debtsPaid: number; invested: number; moved: { toSavings: number } };
}

export interface InsightFacts {
  mes: string;
  dia_del_mes: number;
  dias_del_mes: number;
  mes_en_curso: boolean;
  te_queda_en_cuenta_del_dia_a_dia: number | null;
  por_dia_hasta_nomina: number | null;
  dias_hasta_nomina: number | null;
  gastado: number;
  media_gastada_a_esta_altura: number | null;
  ingresos: number;
  cuotas_de_deudas: number;
  invertido: number;
  pasado_a_ahorro: number;
  movimientos_sin_categoria: number;
  categorias: { nombre: string; este_mes: number; media_meses_anteriores: number | null }[];
  comercios: { nombre: string; veces: number; total: number }[];
  recurrentes: { nombre: string; importe_habitual: number; meses: number }[];
}

const round = (n: number) => Math.round(n * 100) / 100;

const UNNAMED = 'Sin nombre';

/** Nombre legible del comercio (BBVA tapa partes con ***) */
export function merchantName(t: Pick<FlowTx, 'counterparty' | 'description'>): string {
  const cp = t.counterparty && !/^[\s*•·xX0-9-]*$/.test(t.counterparty) ? t.counterparty : '';
  const raw = cp || (t.description || '').replace(/[*•]{2,}[0-9]*/g, ' ');
  return raw.replace(/\s+/g, ' ').replace(/^[\s·-]+|[\s·-]+$/g, '').trim() || UNNAMED;
}

/** Clave para agrupar el mismo comercio aunque cambien números o fechas en el concepto */
export function merchantKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[0-9]+/g, ' ')
    .replace(/[^a-z ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface Spend {
  t: InsightTx;
  amount: number;
}

/** Gasto real de un conjunto de movimientos, con el mismo criterio que Inicio */
export function realSpending(txs: InsightTx[], ctx: Pick<InsightContext, 'roleOf' | 'linkedRoles' | 'homeShare'>): Spend[] {
  const flow = computeFlow(txs, ctx.roleOf, ctx.linkedRoles, ctx.homeShare);
  const skip = new Set([...flow.transferIds, ...flow.refundedIds]);
  return txs
    .filter((t) => isSpending(t) && !(t.id && skip.has(t.id)))
    .map((t) => ({
      t,
      amount: (Number(t.amount) - (t.id ? flow.refundedBy[t.id] || 0 : 0)) * shareOf(t, ctx.roleOf, ctx.homeShare),
    }))
    .filter((s) => s.amount > 0);
}

const categoryOf = (t: InsightTx) => ((t.kind || 'regular') === 'debt_payment' ? 'Cuotas de deudas' : t.category?.name || 'Sin categoría');

function sumBy<K>(items: Spend[], keyOf: (s: Spend) => K): Map<K, number> {
  const m = new Map<K, number>();
  for (const s of items) m.set(keyOf(s), (m.get(keyOf(s)) || 0) + s.amount);
  return m;
}

export function buildInsightFacts(summary: InsightSummary, ctx: InsightContext): InsightFacts {
  const period = periodOf(ctx.month, ctx.startDay);
  const inPeriod = (p: { start: string; end: string }, until = p.end) =>
    ctx.all.filter((t) => t.date >= p.start && t.date <= until && t.date <= p.end);

  const current = realSpending(inPeriod(period), ctx);

  // Meses anteriores (hasta 3), solo los que tienen movimientos
  const previous = [1, 2, 3]
    .map((i) => periodOf(shiftMonth(ctx.month, -i), ctx.startDay))
    .filter((p) => inPeriod(p).length > 0);

  // Categorías: este mes contra la media de los anteriores a la misma altura
  const nowByCat = sumBy(current, (s) => categoryOf(s.t));
  const prevByCat = previous.map((p) => sumBy(realSpending(inPeriod(p, sameHeight(p, ctx.dayIndex)), ctx), (s) => categoryOf(s.t)));
  const categorias = [...nowByCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([nombre, amount]) => ({
      nombre,
      este_mes: round(amount),
      media_meses_anteriores: prevByCat.length ? round(prevByCat.reduce((s, m) => s + (m.get(nombre) || 0), 0) / prevByCat.length) : null,
    }));

  // Comercios donde más se va este mes (sin cuotas de deudas: ya salen aparte)
  const regular = current.filter((s) => (s.t.kind || 'regular') === 'regular');
  const merchants = new Map<string, { nombre: string; veces: number; total: number }>();
  for (const s of regular) {
    const nombre = merchantName(s.t);
    if (nombre === UNNAMED) continue;
    const key = merchantKey(nombre) || nombre;
    const m = merchants.get(key) || { nombre, veces: 0, total: 0 };
    m.veces += 1;
    m.total += s.amount;
    merchants.set(key, m);
  }
  const comercios = [...merchants.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)
    .map((m) => ({ ...m, total: round(m.total) }));

  // Recurrentes: en todos los meses anteriores con datos (mínimo 2), 1-2 cargos al mes, importe parecido
  const recurrentes: InsightFacts['recurrentes'] = [];
  if (previous.length >= 2) {
    const perMonth = previous.map((p) => {
      const m = new Map<string, { nombre: string; amounts: number[] }>();
      for (const s of realSpending(inPeriod(p), ctx)) {
        if ((s.t.kind || 'regular') !== 'regular') continue;
        const nombre = merchantName(s.t);
        if (nombre === UNNAMED) continue;
        const key = merchantKey(nombre) || nombre;
        const e = m.get(key) || { nombre, amounts: [] };
        e.amounts.push(s.amount);
        m.set(key, e);
      }
      return m;
    });
    for (const [key, first] of perMonth[0]!) {
      const months = perMonth.map((m) => m.get(key)).filter((e): e is { nombre: string; amounts: number[] } => !!e);
      if (months.length !== perMonth.length || months.some((e) => e.amounts.length > 2)) continue;
      const amounts = months.flatMap((e) => e.amounts).sort((a, b) => a - b);
      const median = amounts[Math.floor(amounts.length / 2)]!;
      if (median <= 0 || amounts[amounts.length - 1]! - amounts[0]! > median * 0.2) continue;
      const perMonthTotal = months.reduce((s, e) => s + e.amounts.reduce((a, b) => a + b, 0), 0) / months.length;
      recurrentes.push({ nombre: first.nombre, importe_habitual: round(perMonthTotal), meses: months.length });
    }
    recurrentes.sort((a, b) => b.importe_habitual - a.importe_habitual).splice(8);
  }

  return {
    mes: summary.period.label,
    dia_del_mes: summary.dayIndex,
    dias_del_mes: summary.period.days,
    mes_en_curso: summary.isCurrent,
    te_queda_en_cuenta_del_dia_a_dia: summary.remaining,
    por_dia_hasta_nomina: summary.perDay,
    dias_hasta_nomina: summary.payday?.daysLeft ?? null,
    gastado: summary.flow.spent,
    media_gastada_a_esta_altura: summary.average,
    ingresos: summary.flow.income,
    cuotas_de_deudas: summary.flow.debtsPaid,
    invertido: summary.flow.invested,
    pasado_a_ahorro: summary.flow.moved.toSavings,
    movimientos_sin_categoria: summary.uncategorized.count,
    categorias,
    comercios,
    recurrentes,
  };
}

// ── Consejos: reglas fijas sobre las cifras de arriba (sin IA, gratis) ──────────────

export type TipKind = 'alerta' | 'idea' | 'bien';
export interface Tip {
  tipo: TipKind;
  texto: string;
}

const eur = (n: number) => `${Math.round(n).toLocaleString('es-ES')} €`;

/** Umbrales: por debajo de esto no merece la pena avisar */
const PACE_MARGIN = 0.15; // ±15 % sobre tu media
const CATEGORY_MIN_DIFF = 30; // € más que tu media
const CATEGORY_MIN_RATIO = 1.3; // y al menos un 30 % más
const RECURRING_MIN = 15; // €/mes en cargos fijos
const MERCHANT_MIN_VISITS = 5;
const UNCATEGORIZED_MIN = 5;
const MAX_TIPS = 3;

export function tipsFromFacts(f: InsightFacts): Tip[] {
  const when = f.mes_en_curso ? ' a estas alturas del mes' : '';
  const alerts: Tip[] = [];
  const ideas: Tip[] = [];
  const good: Tip[] = [];

  // 1. Ritmo contra tu media
  const avg = f.media_gastada_a_esta_altura;
  if (avg && avg > 0 && f.gastado > 0) {
    const ratio = f.gastado / avg;
    if (ratio > 1 + PACE_MARGIN) {
      alerts.push({ tipo: 'alerta', texto: `Llevas ${eur(f.gastado)} gastados, ${eur(f.gastado - avg)} más que tu media${when} (+${Math.round((ratio - 1) * 100)} %).` });
    } else if (ratio < 1 - PACE_MARGIN) {
      good.push({ tipo: 'bien', texto: `Vas ${eur(avg - f.gastado)} por debajo de tu media${when}. Si sigues así, ese dinero puede ir a ahorro.` });
    }
  }

  // 2. La categoría que más se ha disparado
  const jump = f.categorias
    .filter((c) => c.media_meses_anteriores !== null && c.nombre !== 'Cuotas de deudas' && c.nombre !== 'Sin categoría')
    .map((c) => ({ ...c, diff: c.este_mes - (c.media_meses_anteriores || 0) }))
    .filter((c) => c.diff >= CATEGORY_MIN_DIFF && c.este_mes >= (c.media_meses_anteriores || 0) * CATEGORY_MIN_RATIO)
    .sort((a, b) => b.diff - a.diff)[0];
  if (jump) {
    alerts.push({ tipo: 'alerta', texto: `En ${jump.nombre} llevas ${eur(jump.este_mes)}, ${eur(jump.diff)} más que tu media${when}.` });
  }

  // 3. Cargos fijos que se repiten cada mes
  const fixedTotal = f.recurrentes.reduce((s, r) => s + r.importe_habitual, 0);
  if (f.recurrentes.length > 0 && fixedTotal >= RECURRING_MIN) {
    const names = f.recurrentes.slice(0, 3).map((r) => r.nombre).join(', ');
    const more = f.recurrentes.length > 3 ? ` y ${f.recurrentes.length - 3} más` : '';
    ideas.push({
      tipo: 'idea',
      texto: `Tienes ${f.recurrentes.length === 1 ? '1 cargo fijo' : `${f.recurrentes.length} cargos fijos`} (${names}${more}) que suman ${eur(fixedTotal)}/mes. ¿Los usas todos?`,
    });
  }

  // 4. Un comercio al que vas mucho
  const top = [...f.comercios].sort((a, b) => b.veces - a.veces)[0];
  if (top && top.veces >= MERCHANT_MIN_VISITS) {
    ideas.push({ tipo: 'idea', texto: `Has pagado ${top.veces} veces en ${top.nombre} este mes: ${eur(top.total)} en total.` });
  }

  // 5. Datos incompletos
  if (f.movimientos_sin_categoria >= UNCATEGORIZED_MIN) {
    ideas.push({ tipo: 'idea', texto: `Tienes ${f.movimientos_sin_categoria} movimientos sin categoría. Ponles una y estos avisos serán más fiables.` });
  }

  return [...alerts, ...ideas, ...good].slice(0, MAX_TIPS);
}
