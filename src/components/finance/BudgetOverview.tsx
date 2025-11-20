'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  TrendingDown,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle,
  Calendar,
  Target,
} from 'lucide-react';
import { useBudgets } from '@/hooks/useBudgets';
import { budgetInsertSchema, type BudgetInsert, type Budget } from '@/lib/validations/schemas';

/**
 * Budget Overview Component
 * Allows users to view, create, edit, and manage budgets
 */

type FormData = Omit<BudgetInsert, 'amount'> & { amount: string | number };

interface BudgetOverviewProps {
  selectedMonth?: string;
  financialMonthStartDay?: number;
}

export function BudgetOverview({ selectedMonth: initialMonth, financialMonthStartDay = 1 }: BudgetOverviewProps = {}) {
  // financialMonthStartDay is available for future use when budgets need to align with custom financial months
  console.log('BudgetOverview - Financial month start day:', financialMonthStartDay);

  const {
    budgets,
    isLoading,
    createBudget,
    updateBudget,
    deleteBudget,
    isCreating,
    isUpdating,
    isDeleting,
    getBudgetUsage,
    isOverBudget,
    getTotalBudget,
  } = useBudgets();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (initialMonth) return initialMonth;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(budgetInsertSchema) as any,
    defaultValues: editingBudget || {
      category_id: '',
      amount: '',
      month: parseInt(selectedMonth.split('-')[1] || '1'),
      year: parseInt(selectedMonth.split('-')[0] || new Date().getFullYear().toString()),
    },
  });

  const totalBudget = getTotalBudget(selectedMonth);

  const onSubmit = handleSubmit(async (data) => {
    try {
      console.log('🎯 BudgetOverview - Enviando datos:', data);

      const submitData = {
        ...data,
        amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount,
      };

      console.log('🎯 BudgetOverview - Datos procesados:', submitData);

      if (editingBudget?.id) {
        console.log('🎯 BudgetOverview - Actualizando presupuesto:', editingBudget.id);
        updateBudget({ ...submitData, id: editingBudget.id } as any, {
          onSuccess: () => {
            console.log('✅ BudgetOverview - Presupuesto actualizado exitosamente');
            alert('Presupuesto actualizado exitosamente');
            reset();
            setIsFormOpen(false);
            setEditingBudget(null);
          },
          onError: (error: any) => {
            console.error('❌ BudgetOverview - Error al actualizar:', error);
            alert(`Error al actualizar el presupuesto: ${error.message || 'Error desconocido'}`);
          }
        });
      } else {
        console.log('🎯 BudgetOverview - Creando nuevo presupuesto');
        createBudget(submitData as any, {
          onSuccess: () => {
            console.log('✅ BudgetOverview - Presupuesto creado exitosamente');
            alert('Presupuesto creado exitosamente');
            reset();
            setIsFormOpen(false);
            setEditingBudget(null);
          },
          onError: (error: any) => {
            console.error('❌ BudgetOverview - Error al crear:', error);
            alert(`Error al crear el presupuesto: ${error.message || 'Error desconocido'}`);
          }
        });
      }
    } catch (error: any) {
      console.error('❌ BudgetOverview - Error en onSubmit:', error);
      alert(`Error: ${error.message || 'Error desconocido'}`);
    }
  });

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    reset({
      category_id: budget.category_id,
      amount: budget.amount,
      month: budget.month,
      year: budget.year,
      alert_threshold: budget.alert_threshold,
    });
    setIsFormOpen(true);
  };

  const handleDelete = (budgetId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este presupuesto?')) {
      deleteBudget(budgetId);
    }
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingBudget(null);
    reset();
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Month Selector */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg shadow-lg p-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-6 h-6" />
              <h2 className="text-2xl font-bold">Presupuestos</h2>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-200" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-purple-700/50 text-white px-3 py-1 rounded-lg border border-purple-500 focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
            {totalBudget && (
              <div className="mt-3">
                <p className="text-purple-100 text-sm">Presupuesto Total</p>
                <p className="text-2xl font-bold">{totalBudget.totalFormatted}</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-purple-50 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nuevo Presupuesto
          </button>
        </div>
      </div>

      {/* Budget Form */}
      {isFormOpen && (
        <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-purple-500">
          <h3 className="text-lg font-semibold mb-4">
            {editingBudget ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
          </h3>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría *
                </label>
                <input
                  type="text"
                  {...register('category_id')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Ej: Comida, Transporte, Ocio"
                />
                {errors.category_id && (
                  <p className="text-red-500 text-xs mt-1">{errors.category_id.message}</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Presupuestado *
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('amount')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="0.00"
                />
                {errors.amount && (
                  <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>
                )}
              </div>

              {/* Month */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mes *
                </label>
                <input
                  type="month"
                  {...register('month')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {errors.month && (
                  <p className="text-red-500 text-xs mt-1">{errors.month.message}</p>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isCreating || isUpdating}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating || isUpdating ? 'Guardando...' : editingBudget ? 'Actualizar' : 'Crear'}
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

      {/* Budgets List */}
      {budgets.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <p className="text-yellow-800 font-medium mb-2">No tienes presupuestos configurados</p>
          <p className="text-yellow-600 text-sm mb-4">
            Crea tu primer presupuesto para controlar tus gastos
          </p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Crear Primer Presupuesto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets
            .filter((b) => {
              const [year, month] = selectedMonth.split('-').map(Number);
              return b.month === month && b.year === year;
            })
            .map((budget) => {
              const usage = budget.id ? getBudgetUsage(budget.id) : null;
              const isOver = budget.id ? isOverBudget(budget.id) : false;
              const percentageUsed = usage ? (usage.spent / usage.budgeted) * 100 : 0;

              return (
                <div
                  key={budget.id}
                  className={`bg-white rounded-lg shadow p-5 border-l-4 transition-all hover:shadow-lg ${
                    isOver
                      ? 'border-red-500'
                      : percentageUsed >= 80
                      ? 'border-yellow-500'
                      : 'border-green-500'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-2 rounded-lg ${
                          isOver
                            ? 'bg-red-100'
                            : percentageUsed >= 80
                            ? 'bg-yellow-100'
                            : 'bg-green-100'
                        }`}
                      >
                        <TrendingDown
                          className={`w-5 h-5 ${
                            isOver
                              ? 'text-red-600'
                              : percentageUsed >= 80
                              ? 'text-yellow-600'
                              : 'text-green-600'
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Categoría {budget.category_id}</h3>
                        <p className="text-xs text-gray-500">Mes {budget.month}/{budget.year}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(budget)}
                        className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                        title="Editar presupuesto"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => budget.id && handleDelete(budget.id)}
                        disabled={isDeleting}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        title="Eliminar presupuesto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Budget Amount */}
                  <div className="mb-3">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-xs text-gray-500">Presupuesto</span>
                      <span className="text-sm font-semibold text-gray-900">
                        €{budget.amount.toFixed(2)}
                      </span>
                    </div>
                    {usage && (
                      <>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-xs text-gray-500">Gastado</span>
                          <span
                            className={`text-sm font-semibold ${
                              isOver ? 'text-red-600' : 'text-gray-900'
                            }`}
                          >
                            €{usage.spent.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-gray-500">Restante</span>
                          <span
                            className={`text-sm font-semibold ${
                              isOver ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            €{(usage.budgeted - usage.spent).toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {usage && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-600">
                          {percentageUsed.toFixed(1)}% usado
                        </span>
                        {isOver ? (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        ) : percentageUsed >= 80 ? (
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all ${
                            isOver
                              ? 'bg-red-600'
                              : percentageUsed >= 80
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
        </div>
      )}

      {budgets.filter((b) => {
        const [year, month] = selectedMonth.split('-').map(Number);
        return b.month === month && b.year === year;
      }).length === 0 && budgets.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <Calendar className="w-10 h-10 text-blue-600 mx-auto mb-2" />
          <p className="text-blue-800 font-medium">No hay presupuestos para este mes</p>
          <p className="text-blue-600 text-sm mt-1">
            Selecciona otro mes o crea un nuevo presupuesto
          </p>
        </div>
      )}
    </div>
  );
}
