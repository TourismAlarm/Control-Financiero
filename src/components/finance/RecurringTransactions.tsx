'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Repeat,
  Plus,
  Edit2,
  Trash2,
  Play,
  Pause,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertCircle,
  Clock,
  DollarSign,
} from 'lucide-react';
import { useRecurringRules } from '@/hooks/useRecurringRules';
import {
  recurringRuleInsertSchema,
  type RecurringRuleInsert,
  type RecurringRule,
} from '@/lib/validations/schemas';

/**
 * Recurring Transactions Component
 * Allows users to view, create, edit, and manage recurring transaction rules
 */

type FormData = Omit<RecurringRuleInsert, 'amount'> & { amount: string | number };

export function RecurringTransactions() {
  const {
    recurringRules,
    isLoading,
    createRecurringRule,
    updateRecurringRule,
    deleteRecurringRule,
    toggleRecurringRule,
    isCreating,
    isUpdating,
    isDeleting,
    isToggling,
    getUpcomingRules,
    calculateMonthlyImpact,
    FREQUENCY_LABELS,
  } = useRecurringRules();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(recurringRuleInsertSchema) as any,
    defaultValues: editingRule || {
      type: 'expense',
      amount: '',
      description: '',
      frequency: 'monthly',
      start_date: new Date().toISOString().split('T')[0],
      next_occurrence: new Date().toISOString().split('T')[0],
      is_active: true,
    },
  });

  const upcomingRules = getUpcomingRules();
  const monthlyImpact = calculateMonthlyImpact();

  const onSubmit = handleSubmit(async (data) => {
    try {
      console.log('📝 RecurringTransactions - Enviando datos:', data);

      const submitData = {
        ...data,
        amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount,
      };

      console.log('📝 RecurringTransactions - Datos procesados:', submitData);

      if (editingRule?.id) {
        console.log('📝 RecurringTransactions - Actualizando regla:', editingRule.id);
        updateRecurringRule({ ...submitData, id: editingRule.id } as any, {
          onSuccess: () => {
            console.log('✅ RecurringTransactions - Regla actualizada exitosamente');
            alert('Regla actualizada exitosamente');
            reset();
            setIsFormOpen(false);
            setEditingRule(null);
          },
          onError: (error: any) => {
            console.error('❌ RecurringTransactions - Error al actualizar:', error);
            alert(`Error al actualizar la regla: ${error.message || 'Error desconocido'}`);
          }
        });
      } else {
        console.log('📝 RecurringTransactions - Creando nueva regla');
        createRecurringRule(submitData as any, {
          onSuccess: () => {
            console.log('✅ RecurringTransactions - Regla creada exitosamente');
            alert('Regla creada exitosamente');
            reset();
            setIsFormOpen(false);
            setEditingRule(null);
          },
          onError: (error: any) => {
            console.error('❌ RecurringTransactions - Error al crear:', error);
            alert(`Error al crear la regla: ${error.message || 'Error desconocido'}`);
          }
        });
      }
    } catch (error: any) {
      console.error('❌ RecurringTransactions - Error en onSubmit:', error);
      alert(`Error: ${error.message || 'Error desconocido'}`);
    }
  });

  const handleEdit = (rule: RecurringRule) => {
    setEditingRule(rule);
    reset({
      type: rule.type,
      amount: rule.amount,
      description: rule.description,
      frequency: rule.frequency,
      start_date: rule.start_date ? new Date(rule.start_date).toISOString().split('T')[0] : undefined,
      end_date: rule.end_date ? new Date(rule.end_date).toISOString().split('T')[0] : undefined,
      next_occurrence: new Date(rule.next_occurrence).toISOString().split('T')[0],
      is_active: rule.is_active,
      account_id: rule.account_id || undefined,
      category_id: rule.category_id || undefined,
    });
    setIsFormOpen(true);
  };

  const handleDelete = (ruleId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta regla recurrente?')) {
      deleteRecurringRule(ruleId);
    }
  };

  const handleToggle = (ruleId: string) => {
    toggleRecurringRule(ruleId);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingRule(null);
    reset();
  };

  const filteredRules =
    filterType === 'all' ? recurringRules : recurringRules.filter((r) => r.type === filterType);

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
      {/* Header with Monthly Impact */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-lg shadow-lg p-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Repeat className="w-6 h-6" />
              <h2 className="text-2xl font-bold">Transacciones Recurrentes</h2>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div>
                <p className="text-indigo-200 text-xs">Ingresos/Mes</p>
                <p className="text-lg font-semibold">{monthlyImpact.incomeFormatted}</p>
              </div>
              <div>
                <p className="text-indigo-200 text-xs">Gastos/Mes</p>
                <p className="text-lg font-semibold">{monthlyImpact.expensesFormatted}</p>
              </div>
              <div>
                <p className="text-indigo-200 text-xs">Balance/Mes</p>
                <p className={`text-lg font-semibold ${monthlyImpact.balance >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {monthlyImpact.balanceFormatted}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nueva Regla
          </button>
        </div>
      </div>

      {/* Upcoming Rules Alert */}
      {upcomingRules.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Próximas Transacciones</h3>
              <div className="space-y-1">
                {upcomingRules.slice(0, 3).map((rule) => (
                  <p key={rule.id} className="text-sm text-blue-700">
                    <span className="font-medium">{rule.description}</span> -{' '}
                    {new Date(rule.next_occurrence).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {isFormOpen && (
        <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-indigo-500">
          <h3 className="text-lg font-semibold mb-4">
            {editingRule ? 'Editar Regla Recurrente' : 'Nueva Regla Recurrente'}
          </h3>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                <select
                  {...register('type')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="income">Ingreso</option>
                  <option value="expense">Gasto</option>
                </select>
                {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('amount')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00"
                />
                {errors.amount && (
                  <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción *
                </label>
                <input
                  type="text"
                  {...register('description')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: Suscripción Netflix, Salario mensual"
                />
                {errors.description && (
                  <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
                )}
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frecuencia *
                </label>
                <select
                  {...register('frequency')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">Quincenal</option>
                  <option value="monthly">Mensual</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="yearly">Anual</option>
                </select>
                {errors.frequency && (
                  <p className="text-red-500 text-xs mt-1">{errors.frequency.message}</p>
                )}
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Inicio *
                </label>
                <input
                  type="date"
                  {...register('start_date')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.start_date && (
                  <p className="text-red-500 text-xs mt-1">{errors.start_date.message}</p>
                )}
              </div>

              {/* Next Occurrence */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Próxima Ejecución *
                </label>
                <input
                  type="date"
                  {...register('next_occurrence')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.next_occurrence && (
                  <p className="text-red-500 text-xs mt-1">{errors.next_occurrence.message}</p>
                )}
              </div>

              {/* End Date (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Fin (opcional)
                </label>
                <input
                  type="date"
                  {...register('end_date')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.end_date && (
                  <p className="text-red-500 text-xs mt-1">{errors.end_date.message}</p>
                )}
              </div>
            </div>

            {/* Is Active */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('is_active')}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label className="text-sm text-gray-700">Regla activa</label>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isCreating || isUpdating}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating || isUpdating ? 'Guardando...' : editingRule ? 'Actualizar' : 'Crear'}
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

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 font-medium transition-colors ${
            filterType === 'all'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Todas ({recurringRules.length})
        </button>
        <button
          onClick={() => setFilterType('income')}
          className={`px-4 py-2 font-medium transition-colors ${
            filterType === 'income'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Ingresos ({recurringRules.filter((r) => r.type === 'income').length})
        </button>
        <button
          onClick={() => setFilterType('expense')}
          className={`px-4 py-2 font-medium transition-colors ${
            filterType === 'expense'
              ? 'border-b-2 border-red-600 text-red-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Gastos ({recurringRules.filter((r) => r.type === 'expense').length})
        </button>
      </div>

      {/* Rules List */}
      {filteredRules.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <p className="text-yellow-800 font-medium mb-2">
            No tienes reglas recurrentes{' '}
            {filterType !== 'all' && `de tipo ${filterType === 'income' ? 'ingreso' : 'gasto'}`}
          </p>
          <p className="text-yellow-600 text-sm mb-4">
            Automatiza tus transacciones creando reglas recurrentes
          </p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Crear Primera Regla
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRules.map((rule) => {
            const Icon = rule.type === 'income' ? TrendingUp : TrendingDown;
            const isIncome = rule.type === 'income';

            return (
              <div
                key={rule.id}
                className={`bg-white rounded-lg shadow p-5 border-l-4 transition-all hover:shadow-lg ${
                  rule.is_active
                    ? isIncome
                      ? 'border-green-500'
                      : 'border-red-500'
                    : 'border-gray-300 opacity-60'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-lg ${
                        rule.is_active
                          ? isIncome
                            ? 'bg-green-100'
                            : 'bg-red-100'
                          : 'bg-gray-100'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          rule.is_active
                            ? isIncome
                              ? 'text-green-600'
                              : 'text-red-600'
                            : 'text-gray-400'
                        }`}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{rule.description}</h3>
                      <p className="text-xs text-gray-500">
                        {FREQUENCY_LABELS[rule.frequency as keyof typeof FREQUENCY_LABELS]}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleToggle(rule.id)}
                      disabled={isToggling}
                      className={`p-1.5 rounded transition-colors ${
                        rule.is_active
                          ? 'text-orange-600 hover:bg-orange-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={rule.is_active ? 'Pausar' : 'Activar'}
                    >
                      {rule.is_active ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(rule)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      title="Editar regla"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      disabled={isDeleting}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      title="Eliminar regla"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div className="mb-3">
                  <p className={`text-2xl font-bold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                    €{rule.amount.toFixed(2)}
                  </p>
                </div>

                {/* Dates */}
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      Próxima:{' '}
                      {new Date(rule.next_occurrence).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  {rule.end_date && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>
                        Termina:{' '}
                        {new Date(rule.end_date).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {!rule.is_active && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 italic">Regla pausada</p>
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
