/**
 * Lógica pura de deudas: detectar pagos que se repiten cada mes, saber a qué
 * deuda pertenece un movimiento y repartir un pago entre capital e intereses.
 * Sin red ni base de datos, para poder probarla.
 */
import { normalizeText } from '@/lib/banking/transform';

export interface TxForDetection {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
  counterparty: string | null;
  account_id: string | null;
}

export interface DebtSuggestion {
  key: string;
  label: string; // cómo aparece en el banco (para bank_match)
  amount: number; // cuota típica
  day: number; // día del mes típico
  months: number; // meses distintos en que aparece
  accountId: string | null;
  payments: { date: string; amount: number }[];
}

/** Palabras que delatan una financiación: con ellas bastan 2 meses. */
const DEBT_WORDS = [
  'prestamo', 'cuota', 'financ', 'credito', 'hipoteca', 'aplazado', 'plazos',
  'cofidis', 'cetelem', 'oney', 'sequra', 'klarna', 'aplazame', 'santander consumer',
  'bbva consumer', 'caixabank payments', 'wizink', 'carrefour pass', 'younited', 'moneyman',
];

/** Gastos recurrentes que no son deudas (suscripciones, suministros). */
const NOT_DEBT_WORDS = [
  'netflix', 'spotify', 'amazon prime', 'hbo', 'disney', 'apple.com', 'google', 'youtube',
  'movistar', 'vodafone', 'orange', 'digi', 'masmovil', 'yoigo', 'endesa', 'iberdrola',
  'naturgy', 'holaluz', 'aigues', 'agua', 'gimnas', 'gym', 'basic fit', 'alquiler', 'comunidad',
  'seguro', 'mapfre', 'mutua', 'allianz', 'axa', 'linea directa',
];

const MIN_AMOUNT = 25;

/** Clave estable para agrupar pagos al mismo sitio, aunque cambie el número de recibo. */
export function merchantKey(counterparty: string | null, description: string): string {
  const base = normalizeText(counterparty?.trim() || description)
    .replace(/[0-9]+/g, ' ')
    .replace(/[^a-z\s.&]/g, ' ')
    .replace(/\b(sa|sl|slu|s\.a|s\.l|gmbh|ltd|bv|b\.v|recibo|pago|transferencia|cargo|adeudo|sepa|bizum)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return base.split(' ').slice(0, 3).join(' ');
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function detectRecurringDebts(
  txs: TxForDetection[],
  opts: { exclude: Set<string>; existingMatches: string[] }
): DebtSuggestion[] {
  const groups = new Map<string, TxForDetection[]>();
  for (const tx of txs) {
    if (tx.amount < MIN_AMOUNT) continue;
    const key = merchantKey(tx.counterparty, tx.description);
    if (key.length < 3) continue;
    const list = groups.get(key) || [];
    list.push(tx);
    groups.set(key, list);
  }

  const existing = opts.existingMatches.map((m) => normalizeText(m)).filter((m) => m.length >= 3);
  const suggestions: DebtSuggestion[] = [];

  for (const [key, list] of groups) {
    if (opts.exclude.has(key)) continue;
    const text = normalizeText(list.map((t) => `${t.counterparty ?? ''} ${t.description}`).join(' '));
    if (existing.some((m) => text.includes(m))) continue;
    if (NOT_DEBT_WORDS.some((w) => text.includes(w))) continue;

    // Un pago por mes: si hay varios en un mes, nos quedamos con el más cercano a la mediana
    const amounts = list.map((t) => t.amount);
    const med = median(amounts);
    const byMonth = new Map<string, TxForDetection>();
    for (const t of list) {
      const month = t.date.substring(0, 7);
      const prev = byMonth.get(month);
      if (!prev || Math.abs(t.amount - med) < Math.abs(prev.amount - med)) byMonth.set(month, t);
    }
    const monthly = [...byMonth.values()].sort((a, b) => a.date.localeCompare(b.date));

    const looksLikeDebt = DEBT_WORDS.some((w) => text.includes(w));
    const minMonths = looksLikeDebt ? 2 : 3;
    if (monthly.length < minMonths) continue;

    // Importe estable: todos a ±10 % de la mediana
    const monthlyMed = median(monthly.map((t) => t.amount));
    if (!monthly.every((t) => Math.abs(t.amount - monthlyMed) <= monthlyMed * 0.1)) continue;

    const days = monthly.map((t) => parseInt(t.date.substring(8, 10), 10));
    const last = monthly[monthly.length - 1]!;
    const label = (last.counterparty?.trim() || key).toUpperCase().substring(0, 60);

    suggestions.push({
      key,
      label,
      amount: Math.round(monthlyMed * 100) / 100,
      day: Math.round(median(days)),
      months: monthly.length,
      accountId: last.account_id,
      payments: monthly
        .slice()
        .reverse()
        .map((t) => ({ date: t.date, amount: t.amount })),
    });
  }

  return suggestions.sort((a, b) => b.amount - a.amount);
}

export interface LoanForMatching {
  id: string;
  bank_match: string | null;
  contact_name: string;
}

/** ¿A qué deuda pertenece este movimiento? Por el texto "cómo aparece en el banco". */
export function matchLoan(text: string, loans: LoanForMatching[]): string | null {
  const haystack = normalizeText(text);
  for (const loan of loans) {
    const pattern = normalizeText(loan.bank_match || '');
    if (pattern.length >= 3 && haystack.includes(pattern)) return loan.id;
  }
  return null;
}

/** Reparte un pago entre intereses del mes y capital. Sin interés conocido, todo es capital. */
export function splitPayment(amount: number, outstanding: number, annualRatePct: number) {
  const interest =
    annualRatePct > 0 ? Math.min(amount, Math.round(outstanding * (annualRatePct / 100 / 12) * 100) / 100) : 0;
  const principal = Math.round((amount - interest) * 100) / 100;
  return { principal, interest };
}
