'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Wallet,
  CreditCard,
  Landmark,
  PiggyBank,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  Eye,
  EyeOff,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { accountInsertSchema, type AccountInsert, type Account } from '@/lib/validations/schemas';
import { useGlobalToast } from '@/components/Toaster';

// Client-side schema without user_id (added server-side from session)
const accountClientSchema = accountInsertSchema.omit({ user_id: true });

/**
 * Accounts Manager Component
 * Allows users to view, create, edit, and delete bank accounts
 */

const ACCOUNT_TYPE_ICONS = {
  bank: Wallet,
  cash: Landmark,
  savings: PiggyBank,
  credit_card: CreditCard,
  investment: TrendingUp,
} as const;

const ACCOUNT_TYPE_LABELS = {
  bank: 'Cuenta Bancaria',
  cash: 'Efectivo',
  savings: 'Cuenta de Ahorro',
  credit_card: 'Tarjeta de Crédito',
  investment: 'Inversión',
} as const;

type FormData = Omit<AccountInsert, 'balance'> & { balance: string | number };

export function AccountsManager() {
  const {
    accounts,
    isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
    isCreating,
    isUpdating,
    isDeleting,
    getTotalBalance,
    getBalanceByType,
  } = useAccounts();
  const { toast } = useGlobalToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [balancesVisible, setBalancesVisible] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(accountClientSchema) as any,
    defaultValues: editingAccount || {
      name: '',
      type: 'bank',
      balance: 0,
      currency: 'EUR',
      is_active: true,
    },
  });

  const totalBalance = getTotalBalance();
  const balanceByType = getBalanceByType();

  const onSubmit = handleSubmit(
    async (data) => {
      const submitData = {
        ...data,
        balance: typeof data.balance === 'string' ? parseFloat(data.balance) : data.balance,
      };

      if (editingAccount?.id) {
        updateAccount({ ...submitData, id: editingAccount.id } as any, {
          onSuccess: () => {
            toast('Cuenta actualizada correctamente', 'success');
            reset();
            setIsFormOpen(false);
            setEditingAccount(null);
          },
          onError: (error: any) => {
            toast(`Error al actualizar la cuenta: ${error.message || 'Error desconocido'}`, 'error');
          }
        });
      } else {
        createAccount(submitData as any, {
          onSuccess: () => {
            toast('Cuenta creada correctamente', 'success');
            reset();
            setIsFormOpen(false);
          },
          onError: (error: any) => {
            toast(`Error al crear la cuenta: ${error.message || 'Error desconocido'}`, 'error');
          }
        });
      }
    },
    (errors) => {
      const messages = Object.values(errors).map((e: any) => e.message).join(', ');
      toast(`Corrige los errores: ${messages}`, 'error');
    }
  );

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    reset({
      name: account.name,
      type: account.type,
      balance: account.balance,
      currency: account.currency,
      is_active: account.is_active,
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (accountId: string) => {
    setConfirmDeleteId(accountId);
  };

  const handleDeleteConfirm = (accountId: string) => {
    deleteAccount(accountId, {
      onSuccess: () => {
        toast('Cuenta eliminada correctamente', 'success');
      },
      onError: (error: any) => {
        toast(`Error al eliminar la cuenta: ${error.message || 'Error desconocido'}`, 'error');
      }
    } as any);
    setConfirmDeleteId(null);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingAccount(null);
    reset();
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header with Total Balance */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Mis Cuentas</h2>
              <button
                onClick={() => setBalancesVisible(!balancesVisible)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title={balancesVisible ? 'Ocultar saldos' : 'Mostrar saldos'}
              >
                {balancesVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Balance Total</p>
              <p className="text-3xl font-bold text-gray-900">
                {balancesVisible ? totalBalance.totalFormatted : '•••••'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nueva Cuenta
          </button>
        </div>

        {/* Balance by Type */}
        {balanceByType.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {balanceByType.map((item) => {
              const Icon = ACCOUNT_TYPE_ICONS[item.type as keyof typeof ACCOUNT_TYPE_ICONS] || Landmark;
              return (
                <div key={item.type} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-gray-500" />
                    <p className="text-xs text-gray-500 font-medium">
                      {ACCOUNT_TYPE_LABELS[item.type as keyof typeof ACCOUNT_TYPE_LABELS]}
                    </p>
                  </div>
                  <p className="text-base font-bold text-gray-900">
                    {balancesVisible ? item.balanceFormatted : '•••••'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Account Form */}
      {isFormOpen && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-base font-bold text-gray-900 mb-4">
            {editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}
          </h3>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Account Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la Cuenta *
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: BBVA Cuenta Corriente"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Cuenta *
                </label>
                <select
                  {...register('type')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bank">Cuenta Bancaria</option>
                  <option value="cash">Efectivo</option>
                  <option value="savings">Cuenta de Ahorro</option>
                  <option value="credit_card">Tarjeta de Crédito</option>
                  <option value="investment">Inversión</option>
                </select>
                {errors.type && (
                  <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>
                )}
              </div>

              {/* Balance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Saldo Actual *
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('balance')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
                {errors.balance && (
                  <p className="text-red-500 text-xs mt-1">{errors.balance.message}</p>
                )}
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Moneda *
                </label>
                <select
                  {...register('currency')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
                {errors.currency && (
                  <p className="text-red-500 text-xs mt-1">{errors.currency.message}</p>
                )}
              </div>
            </div>

            {/* Is Active */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('is_active')}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="text-sm text-gray-700">Cuenta activa</label>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isCreating || isUpdating}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating || isUpdating ? 'Guardando...' : editingAccount ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-10 border border-gray-100 text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold mb-1">No tienes cuentas registradas</p>
          <p className="text-gray-500 text-sm mb-4">Comienza añadiendo tu primera cuenta bancaria</p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Añadir Primera Cuenta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account: Account) => {
            const Icon = ACCOUNT_TYPE_ICONS[account.type as keyof typeof ACCOUNT_TYPE_ICONS] || Landmark;
            const isNegative = account.balance < 0;
            const isPendingDelete = confirmDeleteId === account.id;

            return (
              <div
                key={account.id}
                className={`bg-white rounded-xl shadow-lg p-5 border-l-4 transition-all hover:shadow-xl ${
                  account.is_active
                    ? isNegative
                      ? 'border-red-500'
                      : 'border-blue-500'
                    : 'border-gray-300 opacity-60'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${account.is_active ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <Icon className={`w-5 h-5 ${account.is_active ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{account.name}</h3>
                      <p className="text-xs text-gray-500">
                        {ACCOUNT_TYPE_LABELS[account.type as keyof typeof ACCOUNT_TYPE_LABELS]}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(account)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Editar cuenta"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => account.id && handleDeleteClick(account.id)}
                      disabled={isDeleting}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      title="Eliminar cuenta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mb-2">
                  <p className="text-xs text-gray-500 mb-1">Saldo</p>
                  <p className={`text-2xl font-bold ${isNegative ? 'text-red-600' : 'text-gray-900'}`}>
                    {balancesVisible
                      ? `${isNegative ? '-' : ''}${account.currency === 'EUR' ? '€' : account.currency === 'USD' ? '$' : '£'}${Math.abs(account.balance).toFixed(2)}`
                      : '•••••'}
                  </p>
                </div>

                {/* Inline delete confirmation */}
                {isPendingDelete && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-sm text-red-700 font-medium mb-2">
                      ¿Eliminar esta cuenta?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => account.id && handleDeleteConfirm(account.id)}
                        disabled={isDeleting}
                        className="flex-1 text-xs bg-red-600 text-white px-3 py-1.5 rounded font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="flex-1 text-xs bg-gray-200 text-gray-700 px-3 py-1.5 rounded font-medium hover:bg-gray-300 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {!account.is_active && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500 italic">Cuenta inactiva</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
