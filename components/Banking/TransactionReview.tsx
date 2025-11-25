'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Edit2, XCircle, Loader2 } from 'lucide-react';
import { ImportedTransaction } from '@/lib/types/banking';

const CATEGORIAS = [
  'Alimentación',
  'Transporte',
  'Vivienda',
  'Servicios',
  'Ocio',
  'Salud',
  'Educación',
  'Ropa',
  'Otros'
];

export default function TransactionReview({ onReviewComplete }: { onReviewComplete?: () => void }) {
  const [transactions, setTransactions] = useState<ImportedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategoria, setEditCategoria] = useState<string>('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const response = await fetch('/api/banking/transactions/list?reviewed=false&ignored=false');
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (transactionId: string, action: 'confirm' | 'ignore', categoria?: string) => {
    try {
      const response = await fetch('/api/banking/transactions/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: transactionId,
          action,
          categoria
        })
      });

      if (response.ok) {
        // Crear gasto si es confirm
        if (action === 'confirm') {
          await fetch('/api/banking/transactions/create-expense', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transaction_id: transactionId })
          });
        }

        // Remover de la lista
        setTransactions(prev => prev.filter(t => t.id !== transactionId));
        setEditingId(null);

        if (onReviewComplete) onReviewComplete();
      }
    } catch (error) {
      console.error('Error reviewing transaction:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-6 text-center">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          Todo revisado
        </h3>
        <p className="text-gray-600">
          No hay transacciones pendientes de revisar
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">
        Transacciones Pendientes ({transactions.length})
      </h3>

      <div className="space-y-3">
        {transactions.map((txn) => (
          <div
            key={txn.id}
            className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-gray-500">
                    {new Date(txn.fecha).toLocaleDateString('es-ES')}
                  </span>
                  {txn.es_ingreso && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      Ingreso
                    </span>
                  )}
                </div>
                <p className="font-semibold text-gray-800">{txn.concepto}</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {txn.monto.toFixed(2)} €
                </p>
              </div>
            </div>

            {editingId === txn.id ? (
              <div className="flex gap-2">
                <select
                  value={editCategoria}
                  onChange={(e) => setEditCategoria(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                >
                  {CATEGORIAS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleAction(txn.id, 'confirm', editCategoria)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm text-gray-600">Categoría sugerida:</span>
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                    {txn.categoria || 'Sin categoría'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(txn.id, 'confirm')}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Confirmar
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(txn.id);
                      setEditCategoria(txn.categoria || CATEGORIAS[0]);
                    }}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit2 size={18} />
                    Editar
                  </button>
                  <button
                    onClick={() => handleAction(txn.id, 'ignore')}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle size={18} />
                    Ignorar
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
