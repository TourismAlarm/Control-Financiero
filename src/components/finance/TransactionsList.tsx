'use client';

import { useState } from 'react';
import { Edit2, Trash2, Calendar, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { useTransactions, formatCurrency } from '@/hooks/useTransactions';
import { useToast } from '@/hooks/use-toast';
import { TransactionForm } from './TransactionForm';
import type { Transaction } from '@/lib/validations/schemas';
// @ts-ignore - JS module
import useLoans from '@/hooks/useLoans';
import {
  detectLoanTransaction,
  findLoanByName,
  findPaymentIndexByAmountAndDate,
  getLoanDeletionWarning,
  canBeSyncedWithLoan,
  // @ts-ignore - JS module
} from '@/lib/loanSync';

/**
 * Transactions List Component
 * Displays transactions with filtering, sorting, and CRUD operations
 */

interface TransactionsListProps {
  type?: 'income' | 'expense' | 'all';
  month?: string;
  onEdit?: (transaction: Transaction) => void;
  limit?: number;
  showFilters?: boolean;
  financialMonthStartDay?: number;
}

export function TransactionsList({
  type = 'all',
  month,
  onEdit,
  limit,
  showFilters = true,
  financialMonthStartDay = 1,
}: TransactionsListProps) {
  const {
    transactions,
    isLoading,
    deleteTransaction,
    isDeleting,
    calculateTotals,
  } = useTransactions(month, financialMonthStartDay);
  const { toast } = useToast();
  const { loans, deletePayment } = useLoans();

  const [filterType, setFilterType] = useState<'income' | 'expense' | 'all'>(type);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Filter transactions
  let filteredTransactions = transactions;
  if (filterType !== 'all') {
    filteredTransactions = filteredTransactions.filter((t: Transaction) => t.type === filterType);
  }

  // Sort transactions
  filteredTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === 'date') {
      const aDate = a.date ? new Date(a.date).getTime() : 0;
      const bDate = b.date ? new Date(b.date).getTime() : 0;
      return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
    } else {
      const aAmount = Number(a.amount);
      const bAmount = Number(b.amount);
      return sortOrder === 'asc' ? aAmount - bAmount : bAmount - aAmount;
    }
  });

  // Apply limit if specified
  if (limit) {
    filteredTransactions = filteredTransactions.slice(0, limit);
  }

  const handleDelete = async (id: string, description: string, transaction: Transaction) => {
    try {
      // Verificar si la transacción está relacionada con un préstamo
      const isLoanRelated = canBeSyncedWithLoan(transaction);

      if (isLoanRelated) {
        const loanInfo = detectLoanTransaction(transaction);

        if (loanInfo) {
          // Encontrar el préstamo correspondiente
          const relatedLoan = findLoanByName(loans, (loanInfo as any).loanName);

          if (relatedLoan) {
            // Generar mensaje de advertencia personalizado
            const warningMessage = getLoanDeletionWarning(loanInfo);

            // Confirmar con el usuario
            if (confirm(warningMessage)) {
              // Eliminar la transacción
              deleteTransaction(id, {
                onSuccess: async () => {
                  // Intentar eliminar el pago del préstamo también
                  try {
                    let paymentIndex = -1;

                    // Buscar el índice del pago
                    if ((loanInfo as any).type === 'cuota' && (loanInfo as any).paymentNumber) {
                      // Buscar por número de pago primero
                      paymentIndex = (relatedLoan as any).pagos_realizados?.findIndex(
                        (p: any) => p.numero_pago === (loanInfo as any).paymentNumber
                      ) ?? -1;
                    }

                    // Si no se encontró por número, buscar por monto y fecha
                    if (paymentIndex === -1) {
                      paymentIndex = findPaymentIndexByAmountAndDate(
                        relatedLoan,
                        transaction.amount,
                        typeof transaction.date === 'string' ? transaction.date : transaction.date?.toISOString() || new Date().toISOString()
                      );
                    }

                    // Si se encontró el pago, eliminarlo
                    if (paymentIndex >= 0) {
                      await deletePayment((relatedLoan as any).id, paymentIndex);
                      toast('✅ Transacción y pago del préstamo eliminados correctamente', 'success');
                    } else {
                      toast('⚠️ Transacción eliminada, pero no se encontró el pago correspondiente en el préstamo', 'success');
                    }
                  } catch (loanError) {
                    console.error('Error deleting loan payment:', loanError);
                    toast('⚠️ Transacción eliminada, pero hubo un error al eliminar el pago del préstamo', 'success');
                  }
                },
                onError: (error) => {
                  toast(`Error al eliminar: ${error.message}`, 'error');
                },
              });
            }
            return; // Salir porque ya manejamos el caso con préstamo
          }
        }
      }

      // Caso normal: transacción sin relación con préstamos
      if (confirm(`¿Estás seguro de eliminar "${description}"?`)) {
        deleteTransaction(id, {
          onSuccess: () => {
            toast('Transacción eliminada correctamente', 'success');
          },
          onError: (error) => {
            toast(`Error al eliminar: ${error.message}`, 'error');
          },
        });
      }
    } catch (error) {
      console.error('Error in handleDelete:', error);
      toast('Error al procesar la eliminación', 'error');
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormType(transaction.type);
    setIsFormOpen(true);
    if (onEdit) {
      onEdit(transaction);
    }
  };

  const handleNewTransaction = (transactionType: 'income' | 'expense') => {
    setEditingTransaction(null);
    setFormType(transactionType);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingTransaction(null);
    toast('Transacción guardada correctamente', 'success');
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingTransaction(null);
  };

  const totals = calculateTotals();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Action Buttons */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Transacciones</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleNewTransaction('income')}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            Nuevo Ingreso
          </button>
          <button
            onClick={() => handleNewTransaction('expense')}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <TrendingDown className="w-4 h-4" />
            Nuevo Gasto
          </button>
        </div>
      </div>

      {/* Transaction Form Modal */}
      {isFormOpen && (
        <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-blue-500">
          <TransactionForm
            type={formType}
            transaction={editingTransaction ? { ...editingTransaction, id: String(editingTransaction.id) } : undefined}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="all">Todos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Gastos</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium mb-1">Ordenar por</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="date">Fecha</option>
              <option value="amount">Monto</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium mb-1">Orden</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="desc">Descendente</option>
              <option value="asc">Ascendente</option>
            </select>
          </div>
        </div>
      )}

      {/* Summary */}
      {filterType === 'all' && (
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600">Ingresos</p>
            <p className="text-lg font-semibold text-green-600">
              {totals.incomeFormatted}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Gastos</p>
            <p className="text-lg font-semibold text-red-600">
              {totals.expensesFormatted}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Balance</p>
            <p
              className={`text-lg font-semibold ${
                totals.balance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {totals.balanceFormatted}
            </p>
          </div>
        </div>
      )}

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No hay transacciones para mostrar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTransactions.map((transaction: Transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
            >
              {/* Left side - Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium">{transaction.description}</h4>
                  {transaction.tags && transaction.tags.length > 0 && (
                    <div className="flex gap-1">
                      {transaction.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {transaction.date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(transaction.date).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  )}

                  {transaction.notes && (
                    <span className="flex items-center gap-1 text-gray-500">
                      <FileText className="w-4 h-4" />
                      {transaction.notes.slice(0, 50)}
                      {transaction.notes.length > 50 ? '...' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Right side - Amount and Actions */}
              <div className="flex items-center gap-4">
                <span
                  className={`text-lg font-semibold ${
                    transaction.type === 'income'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(transaction)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() =>
                      handleDelete(String(transaction.id!), transaction.description || '', transaction)
                    }
                    disabled={isDeleting}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show More */}
      {limit && filteredTransactions.length === limit && (
        <div className="text-center">
          <button className="text-blue-600 hover:underline">
            Ver todas las transacciones ({transactions.length})
          </button>
        </div>
      )}
    </div>
  );
}
