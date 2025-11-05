'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DollarSign, Save, X } from 'lucide-react';
import { transactionInsertSchema, type TransactionInsert } from '@/lib/validations/schemas';
import { useTransactions } from '@/hooks/useTransactions';
import { useToast } from '@/hooks/use-toast';

/**
 * Unified Transaction Form Component
 * Handles both income and expense transaction creation/editing
 * Uses React Hook Form with Zod validation
 */

interface TransactionFormProps {
  type: 'income' | 'expense';
  transaction?: TransactionInsert & { id?: string };
  onSuccess?: () => void;
  onCancel?: () => void;
  accountId?: string;
  categoryId?: string;
}

export function TransactionForm({
  type,
  transaction,
  onSuccess,
  onCancel,
  accountId,
  categoryId,
}: TransactionFormProps) {
  const { createTransaction, updateTransaction, isCreating, isUpdating } = useTransactions();
  const { toast } = useToast();

  // Form data type with flexible amount field for input handling
  type FormData = Omit<z.infer<typeof transactionInsertSchema>, 'amount'> & { amount: string | number };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(transactionInsertSchema) as any,
    defaultValues: transaction || {
      type,
      amount: '' as any,
      description: '',
      date: new Date().toISOString().split('T')[0],
      account_id: accountId || null,
      category_id: categoryId || null,
      notes: '',
      tags: [],
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      console.log('💸 TransactionForm - Enviando datos:', data);

      // Convert amount to number
      const submitData = {
        ...data,
        amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount,
      };

      console.log('💸 TransactionForm - Datos procesados:', submitData);

      if (transaction?.id) {
        // Update existing transaction
        console.log('💸 TransactionForm - Actualizando transacción:', transaction.id);
        updateTransaction(
          { ...submitData, id: transaction.id } as any,
          {
            onSuccess: () => {
              console.log('✅ TransactionForm - Transacción actualizada exitosamente');
              toast(`${type === 'income' ? 'Ingreso' : 'Gasto'} actualizado correctamente`, 'success');
              reset();
              onSuccess?.();
            },
            onError: (error) => {
              console.error('❌ TransactionForm - Error al actualizar:', error);
              toast(`Error al actualizar: ${error.message}`, 'error');
            },
          }
        );
      } else {
        // Create new transaction
        console.log('💸 TransactionForm - Creando nueva transacción');
        createTransaction(submitData as any, {
          onSuccess: () => {
            console.log('✅ TransactionForm - Transacción creada exitosamente');
            toast(`${type === 'income' ? 'Ingreso' : 'Gasto'} añadido correctamente`, 'success');
            reset();
            onSuccess?.();
          },
          onError: (error) => {
            console.error('❌ TransactionForm - Error al crear:', error);
            toast(`Error al crear: ${error.message}`, 'error');
          },
        });
      }
    } catch (error: any) {
      console.error('❌ TransactionForm - Error en onSubmit:', error);
      toast(`Error: ${error.message || 'Error desconocido'}`, 'error');
    }
  });

  const isLoading = isCreating || isUpdating;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign
          className={`w-6 h-6 ${
            type === 'income' ? 'text-green-500' : 'text-red-500'
          }`}
        />
        <h3 className="text-lg font-semibold">
          {transaction?.id
            ? `Editar ${type === 'income' ? 'Ingreso' : 'Gasto'}`
            : `Nuevo ${type === 'income' ? 'Ingreso' : 'Gasto'}`}
        </h3>
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium mb-1"
        >
          Descripción *
        </label>
        <input
          {...register('description')}
          type="text"
          id="description"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={`Descripción del ${type === 'income' ? 'ingreso' : 'gasto'}`}
          disabled={isLoading}
        />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
        )}
      </div>

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
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="0.00"
          disabled={isLoading}
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
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isLoading}
        />
        {errors.date && (
          <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
        )}
      </div>

      {/* Notes (Optional) */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium mb-1">
          Notas (opcional)
        </label>
        <textarea
          {...register('notes')}
          id="notes"
          rows={3}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Notas adicionales..."
          disabled={isLoading}
        />
        {errors.notes && (
          <p className="text-red-500 text-sm mt-1">{errors.notes.message}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            type === 'income'
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Save className="w-4 h-4" />
          {isLoading
            ? 'Guardando...'
            : transaction?.id
            ? 'Actualizar'
            : 'Guardar'}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 border rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  );
}
