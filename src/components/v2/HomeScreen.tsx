'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalToast } from '@/components/Toaster';
import { C, Card, Bar, Sheet, money, shortDate, Loading, ErrorBox } from './ui';

type Role = 'daily' | 'debts' | 'savings' | 'home';

interface Account {
  id: string;
  name: string;
  balance: number;
  role: Role | null;
  guessed: boolean;
  linked: boolean;
  lastSync: string | null;
}

interface Summary {
  month: string;
  isCurrent: boolean;
  startDay: number;
  period: { start: string; end: string; days: number; label: string };
  dayIndex: number;
  remaining: number | null;
  payday: { day: number; date: string; daysLeft: number } | null;
  perDay: number | null;
  accounts: Account[];
  rolesMigrated: boolean;
  flow: {
    income: number;
    spent: number;
    debtsPaid: number;
    invested: number;
    moved: { toDebts: number; toSavings: number; toHome: number; toRevolutUnknown: number };
    byAccount: { name: string; role: Role | null; amount: number; debts: number; total: number }[];
  };
  average: number | null;
  lastSync: string | null;
  topCategories: { id: string | null; name: string; amount: number }[];
  uncategorized: {
    count: number;
    first: { id: string; description: string | null; amount: number; date: string; account: string | null } | null;
  };
  expenseCategories: { id: string; name: string }[];
  nextPayment: { name: string; amount: number; date: string } | null;
}

const ROLE_ORDER: Role[] = ['daily', 'debts', 'savings', 'home'];
const ROLE_INFO: Record<Role, { label: string; hint: string; color: string }> = {
  daily: { label: 'Día a día', hint: 'Cobras la nómina y gastas', color: C.ink },
  debts: { label: 'Deudas', hint: 'Desde aquí se pagan las cuotas', color: C.amber },
  savings: { label: 'Ahorro', hint: 'Ahorro e inversión', color: C.green },
  home: { label: 'Casa', hint: 'Alquiler y gastos de casa, a medias', color: C.blue },
};

function Dot({ color }: { color: string }) {
  return <span aria-hidden="true" className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: color }} />;
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
  const [roleFor, setRoleFor] = useState<Account | null>(null);

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

  const setRole = async (account: Account, role: Role | null) => {
    setRoleFor(null);
    const res = await fetch('/api/accounts/role', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: account.id, role }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(body.error || 'No se pudo guardar', 'error');
      return;
    }
    toast(role ? `${account.name} · ${ROLE_INFO[role].label}` : `${account.name} · sin papel`, 'success');
    queryClient.invalidateQueries({ queryKey: ['summary'] });
    queryClient.invalidateQueries({ queryKey: ['debts'] });
  };

  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorBox text={(error as Error)?.message || 'Error'} />;

  const { flow } = data;
  const diff = data.average !== null ? data.average - flow.spent : null;
  const comparison =
    diff === null
      ? null
      : diff >= 0
        ? `${money(diff)} menos que tu media`
        : `${money(-diff)} más que tu media`;
  const maxCat = Math.max(1, ...data.topCategories.map((c) => c.amount));
  const first = data.uncategorized.first;
  // Atajos: las categorías donde más gastas este mes; el resto en "Otra…"
  const quick = data.topCategories.filter((c) => c.id).slice(0, 2) as { id: string; name: string }[];

  const daily = data.accounts.filter((a) => a.role === 'daily');
  const dailyName = daily.length === 1 ? daily[0]!.name : 'el día a día';
  const accounts = [...data.accounts].sort(
    (a, b) => (a.role ? ROLE_ORDER.indexOf(a.role) : 9) - (b.role ? ROLE_ORDER.indexOf(b.role) : 9)
  );
  const anyGuessed = accounts.some((a) => a.guessed);
  const unassigned = accounts.some((a) => !a.role);

  // Traspasos entre tus cuentas: no son gasto, solo para saber dónde está el dinero
  const linkedRole = (r: Role) => data.accounts.some((a) => a.role === r && a.linked);
  const bothRevolutLinked = linkedRole('debts') && linkedRole('home');
  const { moved } = flow;
  const movedRows: { role: Role | 'unknown'; label: string; value: number; sub?: string }[] = [
    { role: 'debts' as const, label: 'A Revolut (deudas)', value: moved.toDebts },
    { role: 'savings' as const, label: 'A ahorro', value: moved.toSavings, sub: flow.invested > 0 ? `${money(flow.invested)} invertido` : undefined },
    { role: 'home' as const, label: 'A la conjunta', value: moved.toHome },
    ...(moved.toRevolutUnknown > 0
      ? [{
          role: 'unknown' as const,
          label: 'A Revolut',
          value: moved.toRevolutUnknown,
          sub: bothRevolutLinked ? 'No sé si fue a la de deudas o a la conjunta' : 'Conecta tus dos Revolut y lo separo',
        }]
      : []),
  ].filter((r) => r.value !== 0);
  const movedTotal = movedRows.reduce((s, r) => s + r.value, 0);
  const maxAccount = Math.max(1, ...flow.byAccount.map((a) => a.amount));
  const accountColor = (r: Role | null) => (r ? ROLE_INFO[r].color : C.muted);

  return (
    <div className="flex flex-col gap-4">
      <div className="text-[13px] text-[#5B6070] -mt-1">{syncLabel(data.lastSync)}</div>

      {data.isCurrent ? (
        <Card tone="dark" className="!p-5 flex flex-col gap-3 !rounded-[20px]">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-[#C9CCD4]">Te queda en {dailyName}</span>
            <span className="text-[40px] leading-tight font-bold tracking-tight tabular-nums">{money(data.remaining)}</span>
            <span className="text-sm text-[#C9CCD4]">
              {data.remaining === null
                ? 'Toca abajo la cuenta donde cobras y márcala como “Día a día”'
                : data.payday && data.perDay !== null
                  ? `≈ ${money(data.perDay)} al día hasta la nómina (${shortDate(data.payday.date)}, en ${data.payday.daysLeft} ${data.payday.daysLeft === 1 ? 'día' : 'días'})`
                  : 'Cuando entre una nómina sabré cuánto te toca por día'}
            </span>
          </div>
          <div className="h-px bg-[#3A3E48]" />
          <div className="flex justify-between items-baseline gap-3 text-sm">
            <span className="text-[#C9CCD4]">Gastado este mes</span>
            <span className="font-semibold tabular-nums">{money(flow.spent)}</span>
          </div>
          <span className="text-[13px] text-[#C9CCD4] -mt-2">
            Entró {money(flow.income)}{comparison ? ` · ${comparison} a estas alturas` : ''}
          </span>
        </Card>
      ) : (
        <Card tone="dark" className="!p-5 flex flex-col gap-1 !rounded-[20px]">
          <span className="text-sm text-[#C9CCD4]">Gastaste ese mes</span>
          <span className="text-[40px] leading-tight font-bold tracking-tight tabular-nums">{money(flow.spent)}</span>
          <span className="text-sm text-[#C9CCD4]">
            Entró {money(flow.income)}{comparison ? ` · ${comparison}` : ''}
          </span>
        </Card>
      )}

      <section className="flex flex-col gap-2" aria-label="Tus cuentas">
        <div className="flex justify-between items-baseline">
          <h2 className="text-[15px] font-semibold">Tus cuentas</h2>
          <span className="text-[13px] text-[#5B6070]">saldo actual</span>
        </div>
        {accounts.length === 0 ? (
          <Card><p className="text-sm text-[#5B6070]">Conecta tus bancos en Ajustes y aquí verás el saldo de cada cuenta.</p></Card>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {accounts.map((a) => (
              <button
                key={a.id}
                onClick={() => setRoleFor(a)}
                className={`rounded-2xl p-3.5 flex flex-col gap-1 text-left ${a.role ? 'bg-white' : 'bg-[#FDF0E1]'}`}
                aria-label={`${a.name}: ${money(a.balance)}. ${a.role ? ROLE_INFO[a.role].label : 'Sin papel'}. Cambiar papel`}
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: a.role ? ROLE_INFO[a.role].color : C.amber }}>
                  <Dot color={a.role ? ROLE_INFO[a.role].color : C.amber} />
                  {a.role ? ROLE_INFO[a.role].label : '¿Para qué es?'}
                </span>
                <span className="text-[19px] font-bold tabular-nums">{money(a.balance)}</span>
                <span className="text-xs text-[#5B6070] truncate">{a.name}{a.linked ? '' : ' · manual'}</span>
              </button>
            ))}
          </div>
        )}
        {!data.rolesMigrated ? (
          <span className="text-xs text-[#7A3B00]">Para guardar el papel de cada cuenta falta aplicar la migración 013 en Supabase.</span>
        ) : unassigned ? (
          <span className="text-xs text-[#5B6070]">Toca las cuentas sin papel para decirme para qué las usas.</span>
        ) : anyGuessed ? (
          <span className="text-xs text-[#5B6070]">Papeles deducidos por el nombre del banco. Toca una cuenta si alguno no es correcto.</span>
        ) : null}
      </section>

      <Card className="flex flex-col gap-3">
        <div className="flex justify-between items-baseline">
          <span className="flex flex-col">
            <span className="text-[15px] font-semibold">Gasto por cuenta</span>
            {data.startDay > 1 && <span className="text-xs text-[#5B6070]">{data.period.label}</span>}
          </span>
          <span className="text-[15px] font-semibold tabular-nums">{money(flow.spent)}</span>
        </div>
        {flow.byAccount.length === 0 ? (
          <span className="text-sm text-[#5B6070]">Aún no hay gastos este mes.</span>
        ) : (
          <div className="flex flex-col gap-3">
            {flow.byAccount.map((a) => (
              <button key={a.name} onClick={() => onGoto('movements')} className="text-left flex flex-col gap-1 w-full">
                <div className="flex justify-between text-sm gap-3">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Dot color={accountColor(a.role)} />
                    <span className="truncate">{a.role ? ROLE_INFO[a.role].label : a.name}</span>
                    <span className="text-xs text-[#5B6070] truncate">{a.role ? a.name : ''}</span>
                  </span>
                  <span className="font-semibold tabular-nums shrink-0">{money(a.amount)}</span>
                </div>
                <Bar value={a.amount / maxAccount} color={accountColor(a.role)} />
                {a.role === 'home' && a.total !== a.amount && (
                  <span className="text-xs text-[#5B6070]">Tu mitad · entre los dos {money(a.total)}</span>
                )}
                {a.debts > 0 && <span className="text-xs text-[#5B6070]">{money(a.debts)} son cuotas de deudas</span>}
              </button>
            ))}
          </div>
        )}
      </Card>

      {movedRows.length > 0 && (
        <Card className="flex flex-col gap-2.5">
          <div className="flex justify-between items-baseline">
            <span className="flex flex-col">
              <span className="text-[15px] font-semibold">Movido entre tus cuentas</span>
              <span className="text-xs text-[#5B6070]">Traspasos: no cuentan como gasto</span>
            </span>
            <span className="text-[15px] font-semibold tabular-nums">{money(movedTotal)}</span>
          </div>
          {movedRows.map((r) => (
            <div key={r.label} className="flex flex-col gap-0.5">
              <div className="flex justify-between text-sm gap-3">
                <span className="flex items-center gap-1.5"><Dot color={r.role === 'unknown' ? C.muted : ROLE_INFO[r.role].color} />{r.label}</span>
                <span className="font-semibold tabular-nums">{money(r.value)}</span>
              </div>
              {r.sub && <span className="text-xs text-[#5B6070]">{r.sub}</span>}
            </div>
          ))}
        </Card>
      )}

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
        <span className="text-[15px] font-semibold">En qué se va tu dinero</span>
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
            <span className="text-xs text-[#5B6070]">Próxima cuota</span>
            <span className="text-[15px] font-semibold">{data.nextPayment.name} · {shortDate(data.nextPayment.date)}</span>
          </div>
          <span className="text-[15px] font-semibold tabular-nums">{money(data.nextPayment.amount)}</span>
        </button>
      )}

      <Sheet open={roleFor !== null} onClose={() => setRoleFor(null)} title={roleFor ? `¿Para qué usas ${roleFor.name}?` : ''}>
        {roleFor && (
          <div className="flex flex-col gap-2">
            {ROLE_ORDER.map((r) => {
              const active = roleFor.role === r;
              const taken = data.accounts.find((a) => a.role === r && a.id !== roleFor.id && !a.guessed);
              return (
                <button
                  key={r}
                  onClick={() => setRole(roleFor, r)}
                  aria-pressed={active}
                  className={`rounded-2xl px-4 py-3 flex items-center gap-3 text-left border-2 ${active ? 'border-[#15171C] bg-white' : 'border-transparent bg-white'}`}
                >
                  <Dot color={ROLE_INFO[r].color} />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">{ROLE_INFO[r].label}</span>
                    <span className="text-[13px] text-[#5B6070]">
                      {ROLE_INFO[r].hint}
                      {taken ? ` · ahora es ${taken.name}` : ''}
                    </span>
                  </span>
                </button>
              );
            })}
            <button onClick={() => setRole(roleFor, null)} className="h-11 text-sm font-semibold text-[#5B6070]">
              Ninguno de estos
            </button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
