'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, X, TrendingUp, TrendingDown, Save } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useGlobalToast } from '@/components/Toaster';

const LS_ACCOUNT = 'quickadd_last_account';
const LS_EXPENSE_CAT = 'quickadd_last_expense_cat';
const LS_INCOME_CAT = 'quickadd_last_income_cat';

interface QuickAddProps {
  externalOpen?: boolean;
  onExternalClose?: () => void;
}

export function QuickAdd({ externalOpen, onExternalClose }: QuickAddProps = {}) {
  const [open, setOpen] = useState(false);

  const isOpen = open || !!externalOpen;
  const handleClose = () => { setOpen(false); onExternalClose?.(); };
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const amountRef = useRef<HTMLInputElement>(null);
  const { createTransaction, isCreating } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { toast } = useGlobalToast();

  const filteredCategories = categories.filter(c => c.type === type);

  // Restore last used values from localStorage
  useEffect(() => {
    if (!isOpen) return;
    const lastAccount = localStorage.getItem(LS_ACCOUNT);
    const lastCat = localStorage.getItem(type === 'expense' ? LS_EXPENSE_CAT : LS_INCOME_CAT);
    if (lastAccount && accounts.find((a: any) => a.id === lastAccount)) setAccountId(lastAccount);
    else if (accounts.length > 0) setAccountId((accounts[0] as any).id ?? '');
    if (lastCat && filteredCategories.find((c: any) => c.id === lastCat)) setCategoryId(lastCat);
    else if (filteredCategories.length > 0) setCategoryId((filteredCategories[0] as any).id ?? '');
    // Focus amount input
    setTimeout(() => amountRef.current?.focus(), 50);
  }, [isOpen]);

  // Update category when type changes
  useEffect(() => {
    const lastCat = localStorage.getItem(type === 'expense' ? LS_EXPENSE_CAT : LS_INCOME_CAT);
    const cats = categories.filter(c => c.type === type);
    if (lastCat && cats.find((c: any) => c.id === lastCat)) setCategoryId(lastCat);
    else if (cats.length > 0) setCategoryId((cats[0] as any).id ?? '');
  }, [type, categories]);

  // Keyboard shortcut: N to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        setOpen(true);
      }
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || num <= 0) { toast('Introduce un importe válido', 'error'); return; }
    if (!accountId) { toast('Selecciona una cuenta', 'error'); return; }
    if (!categoryId) { toast('Selecciona una categoría', 'error'); return; }

    createTransaction({
      type,
      amount: num,
      description: description || (type === 'expense' ? 'Gasto' : 'Ingreso'),
      date: new Date().toISOString().split('T')[0],
      account_id: accountId,
      category_id: categoryId,
    } as any, {
      onSuccess: () => {
        toast(`${type === 'expense' ? 'Gasto' : 'Ingreso'} añadido correctamente`, 'success');
        localStorage.setItem(LS_ACCOUNT, accountId);
        localStorage.setItem(type === 'expense' ? LS_EXPENSE_CAT : LS_INCOME_CAT, categoryId);
        setAmount('');
        setDescription('');
        handleClose();
      },
      onError: (err: any) => toast(`Error: ${err.message}`, 'error'),
    });
  };

  return (
    <>
      {/* FAB button — hidden on mobile because the bottom nav has its own + button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex fixed bottom-6 right-6 z-40 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg items-center justify-center transition-all hover:scale-110 active:scale-95"
        title="Añadir transacción (N)"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
          <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="text-lg font-bold text-gray-900">Añadir transacción</h2>
              <button onClick={handleClose} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 pb-6 space-y-4">
              {/* Type toggle */}
              <div className="flex rounded-xl overflow-hidden border border-gray-200">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors ${
                    type === 'expense' ? 'bg-red-500 text-white' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <TrendingDown className="w-4 h-4" /> Gasto
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors ${
                    type === 'income' ? 'bg-green-500 text-white' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" /> Ingreso
                </button>
              </div>

              {/* Amount — big and prominent */}
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">€</span>
                <input
                  ref={amountRef}
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-10 pr-4 py-4 text-3xl font-bold border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                  inputMode="decimal"
                />
              </div>

              {/* Description */}
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Descripción (opcional)"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm"
              />

              {/* Account + Category side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Cuenta</label>
                  <select
                    value={accountId}
                    onChange={e => setAccountId(e.target.value)}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm bg-white"
                  >
                    {accounts.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm bg-white"
                  >
                    {filteredCategories.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isCreating || !amount}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-all ${
                  type === 'expense'
                    ? 'bg-red-500 hover:bg-red-600 disabled:bg-red-300'
                    : 'bg-green-500 hover:bg-green-600 disabled:bg-green-300'
                } disabled:cursor-not-allowed`}
              >
                <Save className="w-5 h-5" />
                {isCreating ? 'Guardando...' : `Guardar ${type === 'expense' ? 'gasto' : 'ingreso'}`}
              </button>

              <p className="text-center text-xs text-gray-400">Atajo de teclado: <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono">N</kbd></p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
