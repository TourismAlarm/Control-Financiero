'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRightLeft, Save, X } from 'lucide-react';
import { transferInsertSchema, type Account } from '@/lib/validations/schemas';
import { useTransfers } from '@/hooks/useTransfers';
import { useAccounts, formatCurrency } from '@/hooks/useAccounts';
import { useToast } from '@/hooks/use-toast';

// Client-side schema without user_id (added server-side from session)
const transferClientSchema = transferInsertSchema.omit({ user_id: true }).extend({
  from_account_id: z.string().uuid({ message: 'Debes seleccionar la cuenta de origen' }),
  to_account_id: z.string().uuid({ message: 'Debes seleccionar la cuenta de destino' }),
});

/**
 * Transfer Form Component
 * Handles transferring money between accounts
 * Uses React Hook Form with Zod validation
 */

interface TransferFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  fromAccountId?: string;
  toAccountId?: string;
}

export function TransferForm({
  onSuccess,
  onCancel,
  fromAccountId,
  toAccountId,
}: TransferFormProps) {
  const { createTransfer, isCreating } = useTransfers();
  const { accounts, isLoading: accountsLoading } = useAccounts();
  const { toast } = useToast();

  // Filter out inactive accounts
  const activeAccounts = accounts.filter((acc: Account) => acc.is_active);

  // Form data type with flexible amount field for input handling
  type FormData = Omit<z.infer<typeof transferClientSchema>, 'amount'> & { amount: string | number };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(transferClientSchema) as any,
    defaultValues: {
      amount: '' as any,
      description: '',
      date: new Date().toISOString().split('T')[0],
      from_account_id: fromAccountId || '',
      to_account_id: toAccountId || '',
    },
  });

  const fromAccount = watch('from_account_id');
  const toAccount = watch('to_account_id');

  const onSubmit = handleSubmit(async (data) => {
    try {
      console.log('💱 TransferForm - Enviando datos:', data);

      // Validation: Accounts must be different
      if (data.from_account_id === data.to_account_id) {
        toast('Las cuentas de origen y destino deben ser diferentes', 'error');
        return;
      }

      // Convert amount to number
      const submitData = {
        ...data,
        amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount,
      };

      console.log('💱 TransferForm - Datos procesados:', submitData);

      createTransfer(submitData as any, {
        onSuccess: () => {
          console.log('✅ TransferForm - Transferencia creada exitosamente');
          toast('Transferencia realizada correctamente', 'success');
          reset();
          onSuccess?.();
        },
        onError: (error) => {
          console.error('❌ TransferForm - Error al crear:', error);
          toast(`Error al crear transferencia: ${error.message}`, 'error');
        },
      });
    } catch (error: any) {
      console.error('❌ TransferForm - Error en onSubmit:', error);
      toast(`Error: ${error.message || 'Error desconocido'}`, 'error');
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <ArrowRightLeft className="w-6 h-6 text-blue-500" />
        <h3 className="text-lg font-semibold">Nueva Transferencia</h3>
      </div>

      {/* From Account */}
      <div>
        <label htmlFor="from_account_id" className="block text-sm font-medium mb-1">
          Cuenta de Origen *
        </label>
        <select
          {...register('from_account_id')}
          id="from_account_id"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          disabled={isCreating || accountsLoading}
        >
          <option value="">Selecciona cuenta de origen</option>
          {activeAccounts.map((account: any) => (
            <option
              key={account.id}
              value={account.id}
              disabled={account.id === toAccount}
            >
              {account.name} - {formatCurrency(account.balance)}
            </option>
          ))}
        </select>
        {errors.from_account_id && (
          <p className="text-red-500 text-sm mt-1">{errors.from_account_id.message}</p>
        )}
      </div>

      {/* To Account */}
      <div>
        <label htmlFor="to_account_id" className="block text-sm font-medium mb-1">
          Cuenta de Destino *
        </label>
        <select
          {...register('to_account_id')}
          id="to_account_id"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          disabled={isCreating || accountsLoading}
        >
          <option value="">Selecciona cuenta de destino</option>
          {activeAccounts.map((account: any) => (
            <option
              key={account.id}
              value={account.id}
              disabled={account.id === fromAccount}
            >
              {account.name} - {formatCurrency(account.balance)}
            </option>
          ))}
        </select>
        {errors.to_account_id && (
          <p className="text-red-500 text-sm mt-1">{errors.to_account_id.message}</p>
        )}
      </div>

      {/* Visual indicator of transfer direction */}
      {fromAccount && toAccount && fromAccount !== toAccount && (
        <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
            {activeAccounts.find((a: Account) => a.id === fromAccount)?.name}
          </span>
          <ArrowRightLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
            {activeAccounts.find((a: Account) => a.id === toAccount)?.name}
          </span>
        </div>
      )}

      {/* Amount */}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium mb-1">
          Monto (€) *
        </label>
        <input
          {...register('amount', { valueAsNumber: false })}
          type="number"
          step="0.01"
          id="amount"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="0.00"
          disabled={isCreating}
        />
        {errors.amount && (
          <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
        )}
      </div>

      {/* Date */}
      <div>
        <label htmlFor="date" className="block text-sm font-medium mb-1">
          Fecha *
        </label>
        <input
          {...register('date')}
          type="date"
          id="date"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          disabled={isCreating}
        />
        {errors.date && (
          <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
        )}
      </div>

      {/* Description (Optional) */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Descripción (opcional)
        </label>
        <input
          {...register('description')}
          type="text"
          id="description"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="Descripción de la transferencia"
          disabled={isCreating}
        />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={isCreating}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {isCreating ? 'Guardando...' : 'Realizar Transferencia'}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isCreating}
            className="px-4 py-2 border rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Info box */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          💡 <strong>Nota:</strong> Las transferencias no cuentan como ingresos o gastos.
          Solo mueven dinero entre tus cuentas.
        </p>
      </div>
    </form>
  );
}
