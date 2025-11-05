'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useQuery } from '@tanstack/react-query';

/**
 * Test Page - Verify NextAuth + Google ID + Supabase Integration
 *
 * This page tests:
 * 1. NextAuth session with Google OAuth
 * 2. Google ID as user_id in database
 * 3. Creating transactions with correct user_id
 * 4. API routes working correctly
 */

export default function TestPage() {
  const { data: session, status } = useSession();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const {
    transactions,
    isLoading: transactionsLoading,
    createTransactionAsync,
    isCreating
  } = useTransactions();

  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    description: '',
    category_id: '',
  });

  const [result, setResult] = useState<any>(null);

  // Fetch user from database to verify Google ID
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['test-user', session?.user?.id],
    queryFn: async () => {
      const response = await fetch('/api/test/user');
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    },
    enabled: !!session?.user?.id,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const transaction = await createTransactionAsync({
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        category_id: formData.category_id || null,
        date: new Date().toISOString().split('T')[0],
      });

      setResult({
        success: true,
        data: transaction,
        message: '✅ Transacción creada correctamente',
      });

      // Reset form
      setFormData({
        type: 'expense',
        amount: '',
        description: '',
        category_id: '',
      });
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
        message: '❌ Error al crear transacción',
      });
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Cargando sesión...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No autenticado</h1>
          <a href="/auth/signin" className="text-blue-500 hover:underline">
            Iniciar sesión con Google
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🧪 Página de Prueba - NextAuth + Supabase</h1>

        {/* Session Info */}
        <section className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📝 Información de Sesión</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>
              <strong>Status:</strong> {status}
            </div>
            <div>
              <strong>Email:</strong> {session?.user?.email}
            </div>
            <div>
              <strong>Name:</strong> {session?.user?.name}
            </div>
            <div className="bg-yellow-50 p-2 rounded">
              <strong>Google ID (user_id):</strong> {session?.user?.id}
            </div>
          </div>
        </section>

        {/* User in Database */}
        <section className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">👤 Usuario en Base de Datos</h2>
          {userLoading ? (
            <p>Cargando...</p>
          ) : userData ? (
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs">
              {JSON.stringify(userData, null, 2)}
            </pre>
          ) : (
            <p className="text-red-500">❌ Usuario no encontrado en la BD</p>
          )}
        </section>

        {/* Categories */}
        <section className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🏷️ Categorías Disponibles</h2>
          {categoriesLoading ? (
            <p>Cargando categorías...</p>
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <div key={cat.id} className="bg-gray-100 p-2 rounded text-sm">
                  <span className="font-semibold">{cat.name}</span>
                  <span className="text-gray-500 ml-2">({cat.type})</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-yellow-600">⚠️ No hay categorías. Crea algunas primero.</p>
          )}
        </section>

        {/* Create Transaction Form */}
        <section className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">➕ Crear Transacción de Prueba</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full border rounded p-2"
              >
                <option value="expense">Gasto</option>
                <option value="income">Ingreso</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Monto (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full border rounded p-2"
                placeholder="10.50"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border rounded p-2"
                placeholder="Café con amigos"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Categoría (opcional)</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full border rounded p-2"
              >
                <option value="">Sin categoría</option>
                {categories
                  .filter((cat) => cat.type === formData.type)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
            >
              {isCreating ? 'Creando...' : 'Crear Transacción'}
            </button>
          </form>

          {/* Result */}
          {result && (
            <div
              className={`mt-4 p-4 rounded ${
                result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}
            >
              <p className="font-semibold mb-2">{result.message}</p>
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(result.success ? result.data : result.error, null, 2)}
              </pre>
            </div>
          )}
        </section>

        {/* Transactions List */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">📊 Transacciones</h2>
          {transactionsLoading ? (
            <p>Cargando transacciones...</p>
          ) : transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.slice(0, 10).map((t: any) => (
                <div key={t.id} className="border-l-4 border-blue-500 bg-gray-50 p-3 rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{t.description}</p>
                      <p className="text-sm text-gray-600">
                        {t.type === 'income' ? '💰' : '💸'} {t.type} • {t.date}
                      </p>
                    </div>
                    <p className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'income' ? '+' : '-'}€{t.amount}
                    </p>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 font-mono">
                    ID: {t.id} | user_id: {t.user_id}
                  </div>
                </div>
              ))}
              {transactions.length > 10 && (
                <p className="text-sm text-gray-500 text-center mt-4">
                  ... y {transactions.length - 10} más
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No hay transacciones. Crea una arriba para probar.</p>
          )}
        </section>
      </div>
    </div>
  );
}
