'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalToast } from '@/components/Toaster';
import { C, Card, Bar, money, shortDate, Loading, ErrorBox } from './ui';

interface Summary {
  month: string;
  isCurrent: boolean;
  dayOfMonth: number;
  daysInMonth: number;
  spent: number;
  income: number;
  invested: number;
  debts: number;
  average: number | null;
  balance: number | null;
  lastSync: string | null;
  topCategories: { id: string | null; name: string; amount: number }[];
  uncategorized: {
    count: number;
    first: { id: string; description: string | null; amount: number; date: string; account: string | null } | null;
  };
  expenseCategories: { id: string; name: string }[];
  nextPayment: { name: string; amount: number; date: string } | null;
}

function syncLabel(iso: string | null): string {
  if (!iso) return 'Sin banco conectado';
  const d = new Date(iso);
  const today = new Date();
  const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === today.toDateString() ? `Actualizado hoy ${time}` : `Actualizado ${shortDate(iso.substring(0, 10))}`;
}

export function HomeScreen({ month, onGoto }: { month: string; onGoto: (tab: 'movements' | 'debts', filter?: string) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useGlobalToast();
  const [picking, setPicking] = useState(false);

  const { data, isLoading, error } = useQuery<Summary>({
    queryKey: ['summary', month],
    queryFn: async () => {
      const res = await fetch(`/api/summary?month=${month}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'No se pudo cargar el resumen');
      return body;
    },
  });

  const categorize = async (txId: string, categoryId: string) => {
    setPicking(false);
    const res = await fetch('/api/categorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: txId, category_id: categoryId, learn: true }),
    });
    const body = await res.json();
    if (!res.ok) {
      toast(body.error || 'No se pudo guardar', 'error');
      return;
    }
    toast(body.alsoUpdated ? `Hecho · ${body.alsoUpdated} más del mismo comercio` : 'Hecho · la próxima vez lo hago solo', 'success');
    queryClient.invalidateQueries({ queryKey: ['summary'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorBox text={(error as Error)?.message || 'Error'} />;

  const diff = data.average !== null ? data.average - data.spent : null;
  const maxCat = Math.max(1, ...data.topCategories.map((c) => c.amount));
  const first = data.uncategorized.first;
  // Atajos: las categorías donde más gastas este mes; el resto en "Otra…"
  const quick = data.topCategories.filter((c) => c.id).slice(0, 2) as { id: string; name: string }[];

  return (
    <div className="flex flex-col gap-4">
      <div className="text-[13px] text-[#5B6070] -mt-1">{syncLabel(data.lastSync)}</div>

      <Card tone="dark" className="!p-5 flex flex-col gap-3.5 !rounded-[20px]">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-[#C9CCD4]">{data.isCurrent ? 'Has gastado este mes' : 'Gastaste este mes'}</span>
          <span className="text-[40px] leading-tight font-bold tracking-tight tabular-nums">{money(data.spent)}</span>
          <span className="text-sm text-[#C9CCD4]">
            {diff === null
              ? 'Aún no hay meses anteriores para comparar'
              : diff >= 0
                ? `${money(diff)} menos que tu media${data.isCurrent ? ' a estas alturas' : ''}`
                : `${money(-diff)} más que tu media${data.isCurrent ? ' a estas alturas' : ''}`}
          </span>
        </div>
        <Bar value={data.dayOfMonth / data.daysInMonth} color="#6FD3A4" track="#3A3E48" height={8} />
        <div className="flex justify-between text-[13px] text-[#C9CCD4]">
          <span>Día {data.dayOfMonth} de {data.daysInMonth}</span>
          {data.balance !== null && <span>Saldo en bancos: {money(data.balance)}</span>}
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <Card className="!p-3 flex flex-col gap-1">
          <span className="text-xs text-[#5B6070]">Ingresos</span>
          <span className="text-[17px] font-semibold tabular-nums" style={{ color: C.green }}>+{money(data.income)}</span>
        </Card>
        <Card className="!p-3 flex flex-col gap-1">
          <span className="text-xs text-[#5B6070]">Invertido</span>
          <span className="text-[17px] font-semibold tabular-nums">{money(data.invested)}</span>
        </Card>
        <button onClick={() => onGoto('debts')} className="bg-white rounded-2xl p-3 flex flex-col gap-1 text-left">
          <span className="text-xs text-[#5B6070]">Deudas</span>
          <span className="text-[17px] font-semibold tabular-nums">{money(data.debts)}</span>
        </button>
      </div>

      {first && (
        <Card tone="amber" className="flex flex-col gap-2.5">
          <div className="flex justify-between items-center">
            <span className="text-[15px] font-semibold text-[#7A3B00]">
              {data.uncategorized.count === 1 ? '1 movimiento sin categoría' : `${data.uncategorized.count} movimientos sin categoría`}
            </span>
            <button onClick={() => onGoto('movements', 'uncategorized')} className="text-sm font-semibold text-[#7A3B00] underline-offset-2 hover:underline">
              Revisar
            </button>
          </div>
          <div className="flex justify-between items-center bg-white rounded-xl px-3 py-2.5">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm font-medium truncate">{first.description}</span>
              <span className="text-xs text-[#5B6070]">{shortDate(first.date)}{first.account ? ` · ${first.account}` : ''}</span>
            </div>
            <span className="text-sm font-semibold tabular-nums shrink-0">-{money(first.amount, true)}</span>
          </div>
          {!picking ? (
            <div className="flex gap-1.5 flex-wrap">
              {quick.map((c) => (
                <button key={c.id} onClick={() => categorize(first.id, c.id)} className="h-9 px-3 rounded-full border border-[#E8C9A6] bg-white text-[13px]">
                  {c.name}
                </button>
              ))}
              <button onClick={() => setPicking(true)} className="h-9 px-3 rounded-full border border-[#E8C9A6] bg-white text-[13px]">
                {quick.length ? 'Otra…' : 'Elegir categoría'}
              </button>
            </div>
          ) : (
            <select
              autoFocus
              defaultValue=""
              onChange={(e) => e.target.value && categorize(first.id, e.target.value)}
              className="h-11 rounded-xl border border-[#E8C9A6] bg-white px-3 text-sm"
              aria-label="Categoría"
            >
              <option value="" disabled>Elige categoría</option>
              {data.expenseCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </Card>
      )}

      <Card className="flex flex-col gap-3">
        <span className="text-[15px] font-semibold">En qué se va</span>
        {data.topCategories.length === 0 ? (
          <span className="text-sm text-[#5B6070]">Aún no hay gastos este mes.</span>
        ) : (
          <div className="flex flex-col gap-2.5">
            {data.topCategories.map((c) => (
              <div key={c.name} className="flex flex-col gap-1">
                <div className="flex justify-between text-sm">
                  <span>{c.name}</span>
                  <span className="font-semibold tabular-nums">{money(c.amount)}</span>
                </div>
                <Bar value={c.amount / maxCat} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {data.nextPayment && (
        <button onClick={() => onGoto('debts')} className="bg-white rounded-2xl px-4 py-3.5 flex justify-between items-center text-left">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-[#5B6070]">Próximo pago</span>
            <span className="text-[15px] font-semibold">{data.nextPayment.name} · {shortDate(data.nextPayment.date)}</span>
          </div>
          <span className="text-[15px] font-semibold tabular-nums">{money(data.nextPayment.amount)}</span>
        </button>
      )}
    </div>
  );
}
