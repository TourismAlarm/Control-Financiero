'use client';

import { useState } from 'react';
import { ArrowRightLeft, Plus, Trash2, Calendar } from 'lucide-react';
import { useTransfers } from '@/hooks/useTransfers';
import { TransferForm } from './TransferForm';
import { formatCurrency } from '@/hooks/useAccounts';
import { type Transfer } from '@/lib/validations/schemas';

/**
 * Transfer Manager Component
 * Allows users to view and create transfers between accounts
 */

export function TransferManager() {
  const { transfers, isLoading, deleteTransfer, isDeleting } = useTransfers();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleFormSuccess = () => {
    setIsFormOpen(false);
  };

  const handleDelete = (transferId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta transferencia?')) {
      deleteTransfer(transferId);
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Transferencias
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestiona las transferencias entre tus cuentas
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva Transferencia
        </button>
      </div>

      {/* Transfer Form */}
      {isFormOpen && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-2 border-gray-200 dark:border-gray-700">
          <TransferForm
            onSuccess={handleFormSuccess}
            onCancel={() => setIsFormOpen(false)}
          />
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <ArrowRightLeft className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
              Las transferencias no cuentan como ingresos o gastos
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              Solo mueven dinero entre tus cuentas sin afectar tu balance total.
            </p>
          </div>
        </div>
      </div>

      {/* Transfers List */}
      <div className="space-y-4">
        {transfers.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center border-2 border-gray-200 dark:border-gray-700">
            <ArrowRightLeft className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No hay transferencias
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Crea tu primera transferencia para mover dinero entre cuentas
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {transfers.map((transfer: Transfer & { from_account?: any; to_account?: any }) => (
              <div
                key={transfer.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Transfer Direction */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {transfer.from_account?.name || 'Cuenta desconocida'}
                        </span>
                        <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {transfer.to_account?.name || 'Cuenta desconocida'}
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="mb-2">
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(Number(transfer.amount))}
                      </span>
                    </div>

                    {/* Description */}
                    {transfer.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {transfer.description}
                      </p>
                    )}

                    {/* Date */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {transfer.date && formatDate(transfer.date)}
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => transfer.id && handleDelete(transfer.id)}
                    disabled={isDeleting}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                    title="Eliminar transferencia"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {transfers.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total de transferencias
              </p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {transfers.length}
              </p>
            </div>
            <ArrowRightLeft className="w-12 h-12 text-blue-300 dark:text-blue-700" />
          </div>
        </div>
      )}
    </div>
  );
}
