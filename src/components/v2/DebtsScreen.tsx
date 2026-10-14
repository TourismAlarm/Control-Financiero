'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalToast } from '@/components/Toaster';
import { C, Card, Bar, Sheet, Field, inputClass, primaryButton, money, shortDate, Loading, ErrorBox } from './ui';

interface Loan {
  id: string;
  name: string;
  lender: string | null;
  status: 'active' | 'paid' | 'cancelled';
  outstanding: number;
  original: number;
  paid: number;
  monthly_payment: number | null;
  payment_day: number | null;
  interest_rate: number;
  account_id: string | null;
  due_date: string | null;
  end_date: string | null;
  end_is_estimate: boolean;
  progress: number;
  months_left: number | null;
  to_pay: number | null;
  interest_left: number | null;
  last_payment: { date: string; amount: number } | null;
  paid_this_month: boolean;
  late: boolean;
}

interface Suggestion {
  key: string;
  label: string;
  amount: number;
  day: number;
  months: number;
  accountId: string | null;
  payments: { date: string; amount: number }[];
}

interface DebtsData {
  migrated: boolean;
  detail?: string;
  loans: Loan[];
  suggestions: Suggestion[];
  accounts: { id: string; name: string; role: string | null }[];
  debtsAccount: { id: string; name: string; balance: number } | null;
  pendingThisMonth: number;
}

interface FormState {
  id?: string;
  name: string;
  lender: string;
  original: string;
  outstanding: string;
  monthly_payment: string;
  payment_day: string;
  due_month: string; // YYYY-MM
  interest_rate: string;
  account_id: string;
  fromSuggestion?: Suggestion;
}

const emptyForm: FormState = {
  name: '',
  lender: '',
  original: '',
  outstanding: '',
  monthly_payment: '',
  payment_day: '',
  due_month: '',
  interest_rate: '',
  account_id: '',
};

/** "1.234,56" o "1234.56" → 1234.56 */
const num = (v: string) => {
  const clean = v.replace(/[^\d.,-]/g, '');
  const normalized = clean.includes(',')
    ? clean.replace(/\./g, '').replace(',', '.')
    : /^-?\d{1,3}(\.\d{3})+$/.test(clean)
      ? clean.replace(/\./g, '') // "6.000" son seis mil, no seis
      : clean;
  return parseFloat(normalized);
};
const toInput = (n: number | null | undefined) => (n ? String(n).replace('.', ',') : '');

function monthYear(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(`${iso.substring(0, 10)}T12:00:00`).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
}

function monthsUntil(month: string): number {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const now = new Date();
  return Math.max(0, (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()) + 1);
}

/** Lo que el formulario puede calcular mientras escribes */
function preview(f: FormState): string | null {
  const outstanding = num(f.outstanding);
  const monthly = num(f.monthly_payment);
  if (!(outstanding > 0) || !(monthly > 0)) return null;
  const months = f.due_month ? monthsUntil(f.due_month) : Math.ceil(outstanding / monthly);
  const parts = [`${months} ${months === 1 ? 'cuota' : 'cuotas'}`];
  if (!f.due_month) {
    const end = new Date();
    end.setMonth(end.getMonth() + months);
    parts.push(`acabas en ${end.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`);
  }
  const toPay = months * monthly;
  if (f.due_month && toPay > outstanding) parts.push(`${money(toPay - outstanding)} de intereses`);
  return `Te quedan ${parts.join(' · ')}`;
}

export function DebtsScreen() {
  const queryClient = useQueryClient();
  const { toast, showConfirm } = useGlobalToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error } = useQuery<DebtsData>({
    queryKey: ['debts'],
    queryFn: async () => {
      const res = await fetch('/api/debts');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'No se pudieron cargar las deudas');
      return body;
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['debts'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const dismiss = async (s: Suggestion) => {
    await fetch('/api/debts/dismiss', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: s.key }) });
    refresh();
  };

  const save = async () => {
    if (!form) return;
    const isEdit = Boolean(form.id);
    const original = form.original ? num(form.original) : null;
    const outstanding = num(form.outstanding);
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      lender: form.lender.trim(),
      outstanding,
      monthly_payment: num(form.monthly_payment),
      payment_day: form.payment_day ? parseInt(form.payment_day, 10) : null,
      due_date: form.due_month || null,
      interest_rate: form.interest_rate ? num(form.interest_rate) : null,
      account_id: form.account_id || null,
    };
    if (original !== null) payload.original = original;
    if (isEdit) payload.id = form.id;

    if (!payload.name) return toast('Ponle un nombre: para qué es la deuda', 'warning');
    if (String(payload.lender).length < 3) return toast('Di quién te la cobra (p. ej. Cofidis)', 'warning');
    if (!(outstanding > 0) && !(isEdit && outstanding === 0)) return toast('Pon cuánto te queda por pagar', 'warning');
    if (!(Number(payload.monthly_payment) > 0)) return toast('Pon la cuota de cada mes', 'warning');
    if (original !== null && original < outstanding) return toast('El importe original no puede ser menor que lo que queda', 'warning');

    setSaving(true);
    try {
      const res = await fetch('/api/debts', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'No se pudo guardar');
      toast(isEdit ? 'Deuda actualizada' : `Deuda guardada${body.linked ? ` · ${body.linked} pagos anteriores enlazados` : ''}`, 'success');
      setForm(null);
      refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = (loan: Loan) => {
    showConfirm(`¿Borrar "${loan.name}"? Sus pagos vuelven a contar como gasto normal.`, async () => {
      await fetch(`/api/debts?id=${loan.id}`, { method: 'DELETE' });
      setForm(null);
      refresh();
    });
  };

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox text={(error as Error).message} />;
  if (!data?.migrated) {
    return (
      <ErrorBox
        text={`La base de datos no tiene aún las columnas de deudas (migración 012).${data?.detail ? ` Detalle: ${data.detail}` : ''}`}
      />
    );
  }

  const active = data.loans.filter((l) => l.status === 'active');
  const paid = data.loans.filter((l) => l.status === 'paid');
  const totalLeft = active.reduce((s, l) => s + l.outstanding, 0);
  const totalOriginal = active.reduce((s, l) => s + l.original, 0);
  const totalMonthly = active.reduce((s, l) => s + (l.monthly_payment || 0), 0);
  const lastEnd = active.map((l) => l.end_date).filter(Boolean).sort().pop() || null;
  const accountName = (id: string | null) => data.accounts.find((a) => a.id === id)?.name;
  const defaultAccount = data.debtsAccount?.id || '';
  const covered = data.debtsAccount ? data.debtsAccount.balance - data.pendingThisMonth : null;

  const openNew = () => setForm({ ...emptyForm, account_id: defaultAccount });
  const openEdit = (loan: Loan) =>
    setForm({
      id: loan.id,
      name: loan.name,
      lender: loan.lender || '',
      original: toInput(loan.original),
      outstanding: String(loan.outstanding).replace('.', ','),
      monthly_payment: toInput(loan.monthly_payment),
      payment_day: loan.payment_day ? String(loan.payment_day) : '',
      due_month: loan.due_date ? loan.due_date.substring(0, 7) : '',
      interest_rate: loan.interest_rate ? toInput(loan.interest_rate) : '',
      account_id: loan.account_id || '',
    });

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Deudas</h1>
        <button aria-label="Añadir deuda" onClick={openNew} className="w-11 h-11 rounded-xl bg-[#15171C] text-white flex items-center justify-center">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>

      <Card className="flex flex-col gap-3 !p-5">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-[#5B6070]">Te queda por pagar</span>
          <span className="text-4xl font-bold tracking-tight tabular-nums">{money(totalLeft)}</span>
          <span className="text-sm text-[#5B6070]">
            {active.length === 0
              ? 'Sin deudas activas'
              : `${money(totalMonthly)} al mes${lastEnd ? ` · libre de deudas en ${monthYear(lastEnd)}` : ''}`}
          </span>
        </div>
        {totalOriginal > totalLeft && (
          <div className="flex flex-col gap-1.5">
            <Bar value={1 - totalLeft / totalOriginal} color={C.green} height={8} />
            <span className="text-[13px] text-[#5B6070]">
              Llevas pagado {money(totalOriginal - totalLeft)} de {money(totalOriginal)} ({Math.round((1 - totalLeft / totalOriginal) * 100)} %)
            </span>
          </div>
        )}
      </Card>

      {data.debtsAccount && active.length > 0 && (
        data.pendingThisMonth === 0 ? (
          <div className="flex items-center gap-2 rounded-2xl bg-[#E3F1EA] px-4 py-3 text-sm text-[#0F4A33]">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
            Todas las cuotas de este mes están pagadas
          </div>
        ) : (
          <div className={`flex flex-col gap-0.5 rounded-2xl px-4 py-3 text-sm ${covered !== null && covered >= 0 ? 'bg-[#E3F1EA] text-[#0F4A33]' : 'bg-[#FDF0E1] text-[#7A3B00]'}`}>
            <span className="font-semibold">
              {covered !== null && covered >= 0
                ? `${data.debtsAccount.name} cubre las cuotas que faltan`
                : `Faltan ${money(-(covered ?? 0), true)} en ${data.debtsAccount.name}`}
            </span>
            <span>
              Quedan {money(data.pendingThisMonth, true)} en cuotas este mes · saldo {money(data.debtsAccount.balance, true)}
              {covered !== null && covered < 0 ? ' · pásalo desde tu cuenta del día a día' : ''}
            </span>
          </div>
        )
      )}

      {data.suggestions.map((s) => (
        <Card key={s.key} tone="blue" className="flex flex-col gap-2.5">
          <div className="flex gap-2.5 items-start">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
            <div className="flex flex-col gap-0.5 text-[#1E3478]">
              <span className="text-[15px] font-semibold">Pago que se repite cada mes</span>
              <span className="text-sm">
                {s.label} · {money(s.amount, true)} · día {s.day}
                {accountName(s.accountId) ? ` · ${accountName(s.accountId)}` : ''}. ¿Es una deuda?
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setForm({
                  ...emptyForm,
                  name: s.label.charAt(0) + s.label.slice(1).toLowerCase(),
                  lender: s.label,
                  monthly_payment: toInput(s.amount),
                  payment_day: String(s.day),
                  account_id: s.accountId || defaultAccount,
                  fromSuggestion: s,
                })
              }
              className="flex-1 h-11 rounded-xl bg-[#2A46A0] text-white text-sm font-semibold"
            >
              Sí, añadir
            </button>
            <button onClick={() => dismiss(s)} className="flex-1 h-11 rounded-xl border border-[#B9C6EC] bg-white text-[#1E3478] text-sm font-semibold">
              No, ignorar
            </button>
          </div>
        </Card>
      ))}

      {active.length === 0 && data.suggestions.length === 0 && (
        <Card>
          <p className="text-sm text-[#5B6070]">
            Añade tus deudas con el +. Cuando el banco tenga unos meses de movimientos, también te propondré los pagos que se repiten.
          </p>
        </Card>
      )}

      {active.map((loan) => (
        <button key={loan.id} onClick={() => openEdit(loan)} className="text-left bg-white rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex justify-between items-baseline gap-3">
            <div className="flex flex-col min-w-0">
              <span className="text-base font-semibold truncate">{loan.name}</span>
              {loan.lender && loan.lender.toLowerCase() !== loan.name.toLowerCase() && (
                <span className="text-xs text-[#5B6070] truncate">{loan.lender}</span>
              )}
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="text-base font-bold tabular-nums">{money(loan.outstanding)}</span>
              <span className="text-xs text-[#5B6070]">pendiente</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Bar value={loan.progress} color={C.green} height={8} />
            <span className="text-[13px] text-[#5B6070]">
              {loan.paid > 0
                ? `Pagado ${money(loan.paid)} de ${money(loan.original)} · ${Math.round(loan.progress * 100)} %`
                : `De ${money(loan.original)} · edítala y pon el importe original para ver el progreso real`}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[13px]">
            <div className="flex flex-col gap-0.5">
              <span className="text-[#5B6070]">Cuota</span>
              <span className="font-semibold tabular-nums">{loan.monthly_payment ? money(loan.monthly_payment) : '—'}</span>
              {loan.payment_day ? <span className="text-[#5B6070]">día {loan.payment_day}</span> : null}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[#5B6070]">Termina</span>
              <span className="font-semibold">{loan.end_date ? `${loan.end_is_estimate ? '≈ ' : ''}${monthYear(loan.end_date)}` : '—'}</span>
              {loan.months_left ? <span className="text-[#5B6070]">{loan.months_left} {loan.months_left === 1 ? 'cuota' : 'cuotas'}</span> : null}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[#5B6070]">Intereses</span>
              <span className="font-semibold tabular-nums">
                {loan.interest_left !== null && !loan.end_is_estimate ? money(loan.interest_left) : loan.interest_rate ? `${toInput(loan.interest_rate)} %` : '—'}
              </span>
              <span className="text-[#5B6070]">
                {loan.interest_left !== null && !loan.end_is_estimate ? 'por pagar' : loan.interest_rate ? 'TIN' : 'sin datos'}
              </span>
            </div>
          </div>

          {loan.late ? (
            <div className="flex items-center gap-2 rounded-xl bg-[#FDF0E1] px-3 py-2.5 text-[13px] text-[#7A3B00]">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 8v5M12 16.5v.5" /><circle cx="12" cy="12" r="9" /></svg>
              El pago del día {loan.payment_day} aún no ha aparecido
            </div>
          ) : loan.paid_this_month && loan.last_payment ? (
            <div className="flex items-center gap-2 rounded-xl bg-[#E3F1EA] px-3 py-2.5 text-[13px] text-[#0F4A33]">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
              Pagada este mes · {shortDate(loan.last_payment.date)} · {money(loan.last_payment.amount, true)}
            </div>
          ) : loan.payment_day ? (
            <span className="text-[13px] text-[#5B6070]">
              Se cobra el día {loan.payment_day}{accountName(loan.account_id) ? ` en ${accountName(loan.account_id)}` : ''}
            </span>
          ) : null}
        </button>
      ))}

      {paid.length > 0 && (
        <Card className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Pagadas</span>
          {paid.map((l) => (
            <span key={l.id} className="text-sm text-[#5B6070]">✓ {l.name}</span>
          ))}
        </Card>
      )}

      <Sheet open={form !== null} onClose={() => setForm(null)} title={form?.id ? 'Editar deuda' : 'Nueva deuda'}>
        {form && (
          <div className="flex flex-col gap-3.5">
            {form.fromSuggestion && (
              <div className="rounded-xl bg-[#E6ECFA] px-3.5 py-3 text-sm text-[#1E3478]">
                Cuota y día sacados de tu banco. Completa lo que falta y guarda.
              </div>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Para qué es">
                <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Moto, coche…" />
              </Field>
              <Field label="Quién te lo cobra">
                <input className={inputClass} value={form.lender} onChange={(e) => setForm({ ...form, lender: e.target.value })} placeholder="Cofidis…" />
              </Field>
            </div>
            <span className="text-xs text-[#5B6070] -mt-2">
              Escríbelo como sale en el banco: así sé qué pagos son de esta deuda y la voy bajando sola.
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Importe original">
                <input className={inputClass} inputMode="decimal" value={form.original} onChange={(e) => setForm({ ...form, original: e.target.value })} placeholder="€ que pediste" />
              </Field>
              <Field label="Te queda">
                <input className={inputClass} inputMode="decimal" value={form.outstanding} onChange={(e) => setForm({ ...form, outstanding: e.target.value })} placeholder="€ pendiente" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Cuota al mes">
                <input className={inputClass} inputMode="decimal" value={form.monthly_payment} onChange={(e) => setForm({ ...form, monthly_payment: e.target.value })} placeholder="€" />
              </Field>
              <Field label="Día de cobro">
                <input className={inputClass} inputMode="numeric" value={form.payment_day} onChange={(e) => setForm({ ...form, payment_day: e.target.value.replace(/\D/g, '').slice(0, 2) })} placeholder="1–31" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Termina">
                <input className={inputClass} type="month" value={form.due_month} onChange={(e) => setForm({ ...form, due_month: e.target.value })} />
              </Field>
              <Field label="Interés (TIN %)">
                <input className={inputClass} inputMode="decimal" value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} placeholder="Opcional" />
              </Field>
            </div>

            {data.accounts.length > 1 && (
              <Field label="Se paga desde">
                <select className={inputClass} value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}>
                  <option value="">Sin indicar</option>
                  {data.accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}{a.role === 'debts' ? ' (deudas)' : ''}</option>
                  ))}
                </select>
              </Field>
            )}

            {preview(form) && <div className="rounded-xl bg-white px-3.5 py-3 text-sm">{preview(form)}</div>}

            {form.fromSuggestion && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-[#3D414B]">Pagos ya encontrados</span>
                <div className="bg-white rounded-xl divide-y divide-[#EFEDE8]">
                  {form.fromSuggestion.payments.slice(0, 4).map((p) => (
                    <div key={p.date} className="flex justify-between px-3.5 py-2.5 text-sm">
                      <span>{shortDate(p.date)}</span>
                      <span className="font-semibold tabular-nums">{money(p.amount, true)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button className={primaryButton} disabled={saving} onClick={save}>
              {saving ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Guardar deuda'}
            </button>
            {form.id && (
              <button
                onClick={() => {
                  const loan = data.loans.find((l) => l.id === form.id);
                  if (loan) remove(loan);
                }}
                className="h-11 text-sm font-semibold text-[#9B1C1C]"
              >
                Borrar deuda
              </button>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
