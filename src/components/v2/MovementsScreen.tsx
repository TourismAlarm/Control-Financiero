'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalToast } from '@/components/Toaster';
import { Sheet, money, Loading, ErrorBox } from './ui';
import { isRefundCategory, isSpecialCategory, isTransferCategory } from '@/lib/categorization/special-names';

interface Tx {
  id: string;
  date: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  counterparty?: string | null;
  kind?: 'regular' | 'internal_transfer' | 'investment' | 'debt_payment';
  account_id?: string | null;
  category_id?: string | null;
  category?: { id: string; name: string } | null;
}

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

type Filter = 'all' | 'expense' | 'income' | 'uncategorized';

const KIND_BADGE: Record<string, { label: string; bg: string; fg: string; short: string }> = {
  debt_payment: { label: 'Deuda', bg: '#ECEAE4', fg: '#3D414B', short: 'DEU' },
  investment: { label: 'Inversión', bg: '#E6ECFA', fg: '#2A46A0', short: 'INV' },
  internal_transfer: { label: 'Traspaso entre tus cuentas', bg: '#F4F3EF', fg: '#5B6070', short: '⇄' },
};

/** Nombre legible: ignora el campo que el banco enmascara con *** */
function displayName(t: Tx): string {
  const masked = (v?: string | null) => !v || /^[\s*•·xX0-9-]*$/.test(v);
  if (!masked(t.counterparty)) return t.counterparty!;
  const d = (t.description || '').replace(/[*•]{2,}[0-9]*/g, ' ').replace(/^[\s·-]+|[\s·-]+$/g, '').trim();
  return d || 'Movimiento bancario';
}

function dayHeading(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const label = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  if (d.toDateString() === today.toDateString()) return `Hoy · ${label}`;
  if (d.toDateString() === yesterday.toDateString()) return `Ayer · ${label}`;
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
}

export function MovementsScreen({
  month,
  initialFilter = 'all',
  onAdd,
}: {
  month: string;
  initialFilter?: Filter;
  onAdd: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useGlobalToast();
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [query, setQuery] = useState('');
  const [showInternal, setShowInternal] = useState(false);
  const [editing, setEditing] = useState<Tx | null>(null);
  const [learn, setLearn] = useState(true);

  const txQuery = useQuery<Tx[]>({
    queryKey: ['transactions', 'v2', month],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?period=${month}&include_internal=1`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'No se pudieron cargar los movimientos');
      return body;
    },
  });
  const catQuery = useQuery<Category[]>({
    queryKey: ['categories', 'v2'],
    queryFn: async () => (await fetch('/api/categories')).json(),
  });
  const accQuery = useQuery<{ id: string; name: string }[]>({
    queryKey: ['accounts', 'v2'],
    queryFn: async () => (await fetch('/api/accounts')).json(),
  });

  const accountName = (id?: string | null) =>
    (Array.isArray(accQuery.data) ? accQuery.data : []).find((a) => a.id === id)?.name?.replace(/ ···\d+$/, '') || null;

  const all = txQuery.data || [];
  const internalCount = all.filter((t) => t.kind === 'internal_transfer').length;
  const uncategorizedCount = all.filter((t) => (t.kind ?? 'regular') === 'regular' && !t.category_id).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((t) => {
      const kind = t.kind ?? 'regular';
      if (kind === 'internal_transfer' && !showInternal) return false;
      if (filter === 'expense' && t.type !== 'expense') return false;
      if (filter === 'income' && t.type !== 'income') return false;
      if (filter === 'uncategorized' && !(kind === 'regular' && !t.category_id)) return false;
      if (q && !`${t.description} ${t.counterparty ?? ''} ${t.category?.name ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, filter, query, showInternal]);

  const groups = useMemo(() => {
    const map = new Map<string, Tx[]>();
    for (const t of visible) {
      const key = String(t.date).substring(0, 10);
      map.set(key, [...(map.get(key) || []), t]);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [visible]);

  const categorize = async (categoryId: string) => {
    if (!editing) return;
    const res = await fetch('/api/categorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editing.id, category_id: categoryId, learn }),
    });
    const body = await res.json();
    setEditing(null);
    if (!res.ok) return toast(body.error || 'No se pudo guardar', 'error');
    const what = body.kind === 'internal_transfer' ? 'Traspaso: ya no cuenta como gasto ni ingreso' : 'Hecho';
    toast(
      body.alsoUpdated
        ? `${what} · ${body.alsoUpdated} más del mismo comercio`
        : body.learned
          ? `${what} · la próxima vez lo hago solo`
          : what,
      'success'
    );
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
  };

  const chip = (id: Filter, label: string, warn = false) => {
    const active = filter === id;
    const cls = active
      ? 'bg-[#15171C] text-white border-[#15171C] font-semibold'
      : warn
        ? 'bg-[#FDF0E1] text-[#7A3B00] border-[#E8C9A6] font-semibold'
        : 'bg-white text-[#15171C] border-[#D9D6CE]';
    return (
      <button key={id} onClick={() => setFilter(id)} className={`h-10 px-3.5 rounded-full border text-sm ${cls}`}>
        {label}
      </button>
    );
  };

  const ofType = (Array.isArray(catQuery.data) ? catQuery.data : []).filter((c) => c.type === (editing?.type ?? 'expense'));
  const categories = ofType.filter((c) => !isSpecialCategory(c.name));
  const specials = ofType
    .filter((c) => isSpecialCategory(c.name))
    .sort((a, b) => Number(isTransferCategory(b.name)) - Number(isTransferCategory(a.name)));
  const editable = (kind: string) => kind === 'regular' || kind === 'internal_transfer';

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Movimientos</h1>
        <button aria-label="Añadir movimiento a mano" onClick={onAdd} className="w-11 h-11 rounded-xl bg-[#15171C] text-white flex items-center justify-center">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>

      <label className="flex items-center gap-2 bg-white border border-[#E4E2DC] rounded-xl px-3 h-11">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B6070" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <span className="sr-only">Buscar</span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar comercio o concepto" className="flex-1 bg-transparent outline-none text-[15px]" />
      </label>

      <div className="flex gap-1.5 flex-wrap">
        {chip('all', 'Todos')}
        {chip('expense', 'Gastos')}
        {chip('income', 'Ingresos')}
        {uncategorizedCount > 0 && chip('uncategorized', `Sin categoría · ${uncategorizedCount}`, true)}
      </div>

      {txQuery.isLoading ? (
        <Loading />
      ) : txQuery.error ? (
        <ErrorBox text={(txQuery.error as Error).message} />
      ) : groups.length === 0 ? (
        <p className="text-sm text-[#5B6070] py-8 text-center">No hay movimientos con este filtro.</p>
      ) : (
        groups.map(([date, items]) => (
          <section key={date} className="flex flex-col gap-1.5">
            <h2 className="text-[13px] font-semibold text-[#5B6070] px-0.5 py-1 first-letter:uppercase">{dayHeading(date)}</h2>
            <div className="bg-white rounded-2xl divide-y divide-[#EFEDE8]">
              {items.map((t) => {
                const kind = t.kind ?? 'regular';
                const badge = KIND_BADGE[kind];
                const needsCategory = kind === 'regular' && !t.category_id;
                const catName = t.category?.name;
                const refund = t.type === 'income' && isRefundCategory(catName);
                const sub = badge ? badge.label : needsCategory ? 'Toca para categorizar' : refund ? 'Devolución · resta del gasto' : catName;
                const acc = accountName(t.account_id);
                return (
                  <button
                    key={t.id}
                    onClick={() => editable(kind) && setEditing(t)}
                    disabled={!editable(kind)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 text-left ${kind === 'internal_transfer' ? 'opacity-60' : ''}`}
                  >
                    <span
                      aria-hidden="true"
                      className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-[13px] font-bold"
                      style={
                        badge
                          ? { background: badge.bg, color: badge.fg }
                          : needsCategory
                            ? { background: '#FDF0E1', color: '#7A3B00' }
                            : { background: t.type === 'income' ? '#E3F1EA' : '#ECEAE4', color: t.type === 'income' ? '#17694A' : '#3D414B' }
                      }
                    >
                      {badge ? badge.short : needsCategory ? '?' : (catName || '·').substring(0, 3).toUpperCase()}
                    </span>
                    <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="text-[15px] font-medium truncate">{displayName(t)}</span>
                      <span className={`text-xs truncate ${needsCategory ? 'text-[#7A3B00] font-semibold' : 'text-[#5B6070]'}`}>
                        {sub}{acc && !needsCategory ? ` · ${acc}` : ''}
                      </span>
                    </span>
                    <span className={`text-[15px] font-semibold tabular-nums shrink-0 ${t.type === 'income' ? 'text-[#17694A]' : ''}`}>
                      {t.type === 'income' ? '+' : '-'}{money(t.amount, true)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))
      )}

      {internalCount > 0 && (
        <button
          onClick={() => setShowInternal(!showInternal)}
          className="flex justify-between items-center border border-dashed border-[#C9C6BD] rounded-2xl px-3.5 py-3 text-sm text-[#3D414B]"
        >
          <span>
            {showInternal
              ? 'Mostrando traspasos entre tus cuentas'
              : `${internalCount} ${internalCount === 1 ? 'traspaso' : 'traspasos'} entre tus cuentas ocultos`}
          </span>
          <span className="font-semibold text-[#15171C]">{showInternal ? 'Ocultar' : 'Mostrar'}</span>
        </button>
      )}

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title="Categoría">
        {editing && (
          <div className="flex flex-col gap-3.5">
            <div className="bg-white rounded-xl px-3.5 py-3 flex justify-between gap-3">
              <span className="text-sm font-medium truncate">{displayName(editing)}</span>
              <span className="text-sm font-semibold tabular-nums shrink-0">{money(editing.amount, true)}</span>
            </div>
            <label className="flex items-center gap-3 bg-white rounded-xl px-3.5 py-3 text-sm">
              <input type="checkbox" checked={learn} onChange={(e) => setLearn(e.target.checked)} className="w-5 h-5 accent-[#15171C]" />
              Aplicar siempre a este comercio
            </label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => categorize(c.id)}
                  className={`h-12 rounded-xl border text-sm px-3 text-left ${editing.category_id === c.id ? 'border-[#15171C] border-2 font-semibold bg-white' : 'border-[#D9D6CE] bg-white'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            {specials.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold text-[#5B6070] px-0.5">
                  {editing.type === 'income' ? 'No es un ingreso de verdad' : 'No es un gasto de verdad'}
                </span>
                {specials.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => categorize(c.id)}
                    className={`rounded-xl border border-dashed px-3.5 py-2.5 text-left flex flex-col gap-0.5 ${editing.category_id === c.id ? 'border-[#15171C] border-2 bg-white' : 'border-[#C9C6BD] bg-[#F4F3EF]'}`}
                  >
                    <span className="text-sm font-semibold">{c.name}</span>
                    <span className="text-xs text-[#5B6070]">
                      {isTransferCategory(c.name)
                        ? 'Dinero de una cuenta tuya a otra. No cuenta como gasto ni ingreso.'
                        : 'Te devuelven algo que pagaste. Anula ese gasto (mismo importe en esta cuenta) o resta del gasto del mes. No se aplica solo a este contacto.'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
