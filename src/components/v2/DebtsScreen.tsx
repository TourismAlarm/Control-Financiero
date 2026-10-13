'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalToast } from '@/components/Toaster';
import { C, Card, Bar, Sheet, Field, inputClass, primaryButton, money, shortDate, Loading, ErrorBox } from './ui';

interface Loan {
  id: string;
  name: string;
  bank_match: string | null;
  status: 'active' | 'paid' | 'cancelled';
  outstanding: number;
  principal: number;
  monthly_payment: number | null;
  payment_day: number | null;
  interest_rate: number;
  progress: number;
  months_left: number | null;
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
  loans: Loan[];
  suggestions: Suggestion[];
  accounts: { id: string; name: string }[];
}

interface FormState {
  id?: string;
  name: string;
  bank_match: string;
  monthly_payment: string;
  payment_day: string;
  outstanding: string;
  interest_rate: string;
  account_id: string | null;
  fromSuggestion?: Suggestion;
}

const emptyForm: FormState = { name: '', bank_match: '', monthly_payment: '', payment_day: '', outstanding: '', interest_rate: '', account_id: null };

const num = (v: string) => parseFloat(v.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''));

function freeDate(months: number | null): string | null {
  if (!months) return null;
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
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
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      bank_match: form.bank_match.trim(),
      monthly_payment: num(form.monthly_payment),
      payment_day: form.payment_day ? parseInt(form.payment_day, 10) : null,
      outstanding: num(form.outstanding),
    };
    if (!isEdit) {
      payload.interest_rate = form.interest_rate ? num(form.interest_rate) : 0;
      payload.account_id = form.account_id;
    } else {
      payload.id = form.id;
    }
    if (!payload.name || String(payload.bank_match).length < 3 || !(Number(payload.monthly_payment) > 0) || !(Number(payload.outstanding) >= 0)) {
      toast('Rellena nombre, texto del banco, cuota y cuánto queda', 'warning');
      return;
    }
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
    return <ErrorBox text="Falta un paso: pega supabase/migrations/012_deudas_y_reglas.sql en el SQL Editor de Supabase." />;
  }

  const active = data.loans.filter((l) => l.status === 'active');
  const paid = data.loans.filter((l) => l.status === 'paid');
  const totalLeft = active.reduce((s, l) => s + l.outstanding, 0);
  const totalMonthly = active.reduce((s, l) => s + (l.monthly_payment || 0), 0);
  const free = freeDate(Math.max(0, ...active.map((l) => l.months_left || 0)));
  const accountName = (id: string | null) => data.accounts.find((a) => a.id === id)?.name;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Deudas</h1>
        <button
          aria-label="Añadir deuda"
          onClick={() => setForm({ ...emptyForm })}
          className="w-11 h-11 rounded-xl bg-[#15171C] text-white flex items-center justify-center"
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>

      <Card className="flex flex-col gap-1.5 !p-5">
        <span className="text-sm text-[#5B6070]">Te queda por pagar</span>
        <span className="text-4xl font-bold tracking-tight tabular-nums">{money(totalLeft)}</span>
        <span className="text-sm text-[#5B6070]">
          {active.length === 0
            ? 'Sin deudas activas'
            : `${money(totalMonthly)} al mes${free ? ` · libre de deudas en ${free}` : ''}`}
        </span>
      </Card>

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
                  bank_match: s.label,
                  monthly_payment: String(s.amount).replace('.', ','),
                  payment_day: String(s.day),
                  account_id: s.accountId,
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
            Cuando el banco tenga unos meses de movimientos, aquí te propondré los pagos que se repiten. También puedes añadir una deuda con el +.
          </p>
        </Card>
      )}

      {active.map((loan) => (
        <button
          key={loan.id}
          onClick={() =>
            setForm({
              id: loan.id,
              name: loan.name,
              bank_match: loan.bank_match || '',
              monthly_payment: loan.monthly_payment ? String(loan.monthly_payment).replace('.', ',') : '',
              payment_day: loan.payment_day ? String(loan.payment_day) : '',
              outstanding: String(loan.outstanding).replace('.', ','),
              interest_rate: String(loan.interest_rate),
              account_id: null,
            })
          }
          className="text-left bg-white rounded-2xl p-4 flex flex-col gap-3"
        >
          <div className="flex justify-between items-baseline gap-3">
            <span className="text-base font-semibold">{loan.name}</span>
            <span className="text-base font-bold tabular-nums">{money(loan.outstanding)}</span>
          </div>
          <Bar value={loan.progress} color={C.green} height={8} />
          <div className="flex justify-between text-[13px] text-[#5B6070]">
            <span>{Math.round(loan.progress * 100)} % pagado desde que la apuntaste</span>
            {loan.monthly_payment ? <span>{money(loan.monthly_payment)}/mes</span> : null}
          </div>
          {loan.late ? (
            <div className="flex items-center gap-2 rounded-xl bg-[#FDF0E1] px-3 py-2.5 text-[13px] text-[#7A3B00]">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 8v5M12 16.5v.5" /><circle cx="12" cy="12" r="9" /></svg>
              El pago del día {loan.payment_day} aún no ha aparecido
            </div>
          ) : loan.paid_this_month && loan.last_payment ? (
            <div className="flex items-center gap-2 rounded-xl bg-[#E3F1EA] px-3 py-2.5 text-[13px] text-[#0F4A33]">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
              Pago de este mes detectado · {shortDate(loan.last_payment.date)} · {money(loan.last_payment.amount, true)}
            </div>
          ) : loan.payment_day ? (
            <span className="text-[13px] text-[#5B6070]">Próximo cobro: día {loan.payment_day}</span>
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

      <Sheet open={form !== null} onClose={() => setForm(null)} title={form?.id ? 'Editar deuda' : 'Añadir deuda'}>
        {form && (
          <div className="flex flex-col gap-3.5">
            {form.fromSuggestion && (
              <div className="rounded-xl bg-[#E6ECFA] px-3.5 py-3 text-sm text-[#1E3478]">
                Rellenado con los pagos que hemos visto en tu banco. Revisa y guarda.
              </div>
            )}
            <Field label="Nombre">
              <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Préstamo coche" />
            </Field>
            <Field label="Cómo aparece en el banco" hint="Cada pago con este texto se apunta solo a esta deuda.">
              <input className={inputClass} value={form.bank_match} onChange={(e) => setForm({ ...form, bank_match: e.target.value })} placeholder="Ej. COFIDIS" />
            </Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Cuota">
                <input className={inputClass} inputMode="decimal" value={form.monthly_payment} onChange={(e) => setForm({ ...form, monthly_payment: e.target.value })} placeholder="€" />
              </Field>
              <Field label="Día de cobro">
                <input className={inputClass} inputMode="numeric" value={form.payment_day} onChange={(e) => setForm({ ...form, payment_day: e.target.value })} placeholder="1–31" />
              </Field>
            </div>
            <Field label="Cuánto te queda por pagar" hint={form.id ? undefined : 'El único dato que el banco no sabe. Míralo en el contrato o en la app del prestamista.'}>
              <input className={`${inputClass} !border-2 !border-[#15171C]`} inputMode="decimal" value={form.outstanding} onChange={(e) => setForm({ ...form, outstanding: e.target.value })} placeholder="€" />
            </Field>
            {!form.id && (
              <details className="rounded-xl bg-white px-3.5 py-3">
                <summary className="text-sm font-semibold text-[#3D414B] cursor-pointer">Interés anual (opcional)</summary>
                <div className="pt-3">
                  <input className={inputClass} inputMode="decimal" value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} placeholder="% TIN — si lo pones, separo capital e intereses" />
                </div>
              </details>
            )}
            {form.fromSuggestion && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-[#3D414B]">Ya detectados</span>
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
