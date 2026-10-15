/**
 * Mes financiero: va del día de cobro de un mes al día antes del cobro del siguiente.
 * Con día 26, "Octubre" = 26 sep – 25 oct (el mes que pagas con la nómina del 26 sep).
 * Con día 1 es el mes natural. Lógica pura con fechas en texto (sin líos de zona horaria).
 */

export interface Period {
  month: string; // YYYY-MM (nombre del mes financiero)
  start: string; // YYYY-MM-DD, incluido
  end: string; // YYYY-MM-DD, incluido
  days: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m0: number, d: number) => {
  const dt = new Date(Date.UTC(y, m0, d));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
};
const daysIn = (y: number, m0: number) => new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
const toUtc = (d: string) => {
  const [y, m, dd] = d.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, dd);
};

export function normalizeStartDay(day: number | null | undefined): number {
  const n = Math.round(Number(day) || 1);
  return Math.min(31, Math.max(1, n));
}

/** Día de cobro dentro de un mes concreto (el 31 en febrero es el 28/29). */
function payDayIn(y: number, m0: number, startDay: number) {
  return Math.min(startDay, daysIn(y, m0));
}

export function periodOf(month: string, startDay = 1): Period {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const sd = normalizeStartDay(startDay);
  let start: string;
  let end: string;
  if (sd === 1) {
    start = iso(y, m - 1, 1);
    end = iso(y, m - 1, daysIn(y, m - 1));
  } else {
    // Date.UTC entiende el mes -1 como diciembre del año anterior
    start = iso(y, m - 2, payDayIn(y, m - 2, sd));
    end = iso(y, m - 1, payDayIn(y, m - 1, sd) - 1);
  }
  return { month, start, end, days: Math.round((toUtc(end) - toUtc(start)) / 86400000) + 1 };
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Mes financiero en el que cae una fecha. */
export function monthOfDate(date: string, startDay = 1): string {
  const month = date.substring(0, 7);
  const p = periodOf(month, startDay);
  if (date < p.start) return shiftMonth(month, -1);
  if (date > p.end) return shiftMonth(month, 1);
  return month;
}

/** Días transcurridos del periodo hasta `date` (1 = primer día). */
export function dayInPeriod(p: Period, date: string): number {
  if (date < p.start) return 0;
  if (date > p.end) return p.days;
  return Math.round((toUtc(date) - toUtc(p.start)) / 86400000) + 1;
}

/** Último día a comparar en otro periodo para ir "a la misma altura". */
export function sameHeight(p: Period, dayIndex: number): string {
  const d = new Date(toUtc(p.start) + (Math.min(dayIndex, p.days) - 1) * 86400000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Días que faltan desde `today` hasta `date` (mínimo 1). */
export function daysUntil(today: string, date: string): number {
  return Math.max(1, Math.round((toUtc(date) - toUtc(today)) / 86400000));
}

/** "26 sep – 25 oct" */
export function periodLabel(p: Period): string {
  const f = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' }).replace('.', '');
  return `${f(p.start)} – ${f(p.end)}`;
}
