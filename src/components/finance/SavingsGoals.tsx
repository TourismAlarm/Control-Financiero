'use client';

import { useGlobalToast } from '@/components/Toaster';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle,
  Wallet,
} from 'lucide-react';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import {
  savingsGoalInsertSchema,
  type SavingsGoalInsert,
  type SavingsGoal,
} from '@/lib/validations/schemas';

/**
 * Savings Goals Component
 * Allows users to view, create, edit, and track savings goals
 */

type FormData = Omit<SavingsGoalInsert, 'target_amount' | 'current_amount'> & {
  target_amount: string | number;
  current_amount: string | number;
};

type AddMoneyFormData = {
  amount: string | number;
};

export function SavingsGoals() {
  const {
    savingsGoals,
    isLoading,
    createSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    addToGoal,
    isCreating,
    isUpdating,
    isDeleting,
    isAdding,
    getGoalProgress,
    getTotalSavings,
    getUpcomingDeadlines,
  } = useSavingsGoals();
  const { toast, showConfirm } = useGlobalToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [addingToGoalId, setAddingToGoalId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(savingsGoalInsertSchema) as any,
    defaultValues: editingGoal || {
      name: '',
      target_amount: '',
      current_amount: 0,
      description: '',
      is_completed: false,
    },
  });

  const {
    register: registerAddMoney,
    handleSubmit: handleSubmitAddMoney,
    formState: { errors: addMoneyErrors },
    reset: resetAddMoney,
  } = useForm<AddMoneyFormData>();

  const totalSavings = getTotalSavings();
  const upcomingDeadlines = getUpcomingDeadlines();

  const onSubmit = handleSubmit(async (data) => {
    try {

      const submitData = {
        ...data,
        target_amount:
          typeof data.target_amount === 'string' ? parseFloat(data.target_amount) : data.target_amount,
        current_amount:
          typeof data.current_amount === 'string' ? parseFloat(data.current_amount) : data.current_amount,
      };

      if (editingGoal?.id) {
        updateSavingsGoal({ ...submitData, id: editingGoal.id } as any, {
          onSuccess: () => {
            toast('Meta actualizada correctamente', 'success');
            reset();
            setIsFormOpen(false);
            setEditingGoal(null);
          },
          onError: (error: any) => {
            console.error('❌ SavingsGoals - Error al actualizar:', error);
            toast(`Error al actualizar: ${error.message || 'Error desconocido'}`, 'error');
          }
        });
      } else {
        createSavingsGoal(submitData as any, {
          onSuccess: () => {
            toast('Meta creada correctamente', 'success');
            reset();
            setIsFormOpen(false);
            setEditingGoal(null);
          },
          onError: (error: any) => {
            console.error('❌ SavingsGoals - Error al crear:', error);
            toast(`Error al crear: ${error.message || 'Error desconocido'}`, 'error');
          }
        });
      }
    } catch (error: any) {
      console.error('❌ SavingsGoals - Error en onSubmit:', error);
      toast(`Error: ${error.message || 'Error desconocido'}`, 'error');
    }
  });

  const onAddMoney = handleSubmitAddMoney(async (data) => {
    if (!addingToGoalId) return;

    try {
      const amount = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount;
      addToGoal({ goalId: addingToGoalId, amount }, {
        onSuccess: () => {
          toast(`Añadidos ${amount}€ a la meta correctamente`, 'success');
          resetAddMoney();
          setAddingToGoalId(null);
        },
        onError: (error: any) => {
          console.error('❌ SavingsGoals - Error al añadir dinero:', error);
          toast(`Error al añadir dinero: ${error.message || 'Error desconocido'}`, 'error');
        }
      });
    } catch (error: any) {
      console.error('❌ SavingsGoals - Error en onAddMoney:', error);
      toast(`Error: ${error.message || 'Error desconocido'}`, 'error');
    }
  });

  const handleEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    reset({
      name: goal.name,
      target_amount: goal.target_amount,
      current_amount: goal.current_amount,
      target_date: goal.target_date ? new Date(goal.target_date).toISOString().split('T')[0] : undefined,
      description: goal.description || undefined,
      icon: goal.icon || undefined,
      color: goal.color || undefined,
      is_completed: goal.is_completed,
    });
    setIsFormOpen(true);
  };

  const handleDelete = (goalId: string) => {
    showConfirm('¿Eliminar esta meta de ahorro?', () => deleteSavingsGoal(goalId));
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingGoal(null);
    reset();
  };

  const filteredGoals =
    filterStatus === 'all'
      ? savingsGoals
      : filterStatus === 'active'
      ? savingsGoals.filter((g) => !g.is_completed)
      : savingsGoals.filter((g) => g.is_completed);

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
      {/* Header with Total Savings */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-xl">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Metas de Ahorro</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500">Total Ahorrado</p>
                <p className="text-2xl font-bold text-gray-900">{totalSavings.totalFormatted}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Metas Activas</p>
                <p className="text-2xl font-bold text-gray-900">{totalSavings.activeCount}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-green-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nueva Meta
          </button>
        </div>
      </div>

      {/* Upcoming Deadlines Alert */}
      {upcomingDeadlines.length > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-900 mb-1">Fechas Límite Próximas</h3>
              <div className="space-y-1">
                {upcomingDeadlines.slice(0, 3).map((goal) => (
                  <p key={goal.id} className="text-sm text-orange-700">
                    <span className="font-medium">{goal.name}</span> - Vence{' '}
                    {goal.target_date &&
                      new Date(goal.target_date).toLocaleDateString('es-ES', {
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
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-base font-bold text-gray-900 mb-4">
            {editingGoal ? 'Editar Meta de Ahorro' : 'Nueva Meta de Ahorro'}
          </h3>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la Meta *
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ej: Vacaciones, Nuevo móvil, Fondo emergencia"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              {/* Target Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad Objetivo *
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('target_amount')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0.00"
                />
                {errors.target_amount && (
                  <p className="text-red-500 text-xs mt-1">{errors.target_amount.message}</p>
                )}
              </div>

              {/* Current Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad Actual
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('current_amount')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0.00"
                />
                {errors.current_amount && (
                  <p className="text-red-500 text-xs mt-1">{errors.current_amount.message}</p>
                )}
              </div>

              {/* Target Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Objetivo (opcional)
                </label>
                <input
                  type="date"
                  {...register('target_date')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                {errors.target_date && (
                  <p className="text-red-500 text-xs mt-1">{errors.target_date.message}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción (opcional)
              </label>
              <textarea
                {...register('description')}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="¿Para qué es esta meta?"
              />
              {errors.description && (
                <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isCreating || isUpdating}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating || isUpdating ? 'Guardando...' : editingGoal ? 'Actualizar' : 'Crear'}
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
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 font-medium transition-colors ${
            filterStatus === 'all'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Todas ({savingsGoals.length})
        </button>
        <button
          onClick={() => setFilterStatus('active')}
          className={`px-4 py-2 font-medium transition-colors ${
            filterStatus === 'active'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Activas ({savingsGoals.filter((g) => !g.is_completed).length})
        </button>
        <button
          onClick={() => setFilterStatus('completed')}
          className={`px-4 py-2 font-medium transition-colors ${
            filterStatus === 'completed'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Completadas ({savingsGoals.filter((g) => g.is_completed).length})
        </button>
      </div>

      {/* Goals List */}
      {filteredGoals.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-10 border border-gray-100 text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold mb-1">
            No tienes metas de ahorro{' '}
            {filterStatus !== 'all' && `${filterStatus === 'active' ? 'activas' : 'completadas'}`}
          </p>
          <p className="text-gray-500 text-sm mb-4">Define tus objetivos y empieza a ahorrar</p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-green-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Crear Primera Meta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGoals.map((goal) => {
            const progress = goal.id ? getGoalProgress(goal.id) : null;
            if (!progress) return null;

            return (
              <div
                key={goal.id}
                className={`bg-white rounded-xl shadow-lg p-5 border-l-4 transition-all hover:shadow-xl ${
                  goal.is_completed ? 'border-purple-500' : 'border-green-500'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-lg ${
                        goal.is_completed ? 'bg-purple-100' : 'bg-green-100'
                      }`}
                    >
                      {goal.is_completed ? (
                        <CheckCircle className="w-5 h-5 text-purple-600" />
                      ) : (
                        <Target className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{goal.name}</h3>
                      {goal.target_date && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(goal.target_date).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!goal.is_completed && (
                      <button
                        onClick={() => goal.id && setAddingToGoalId(goal.id)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Añadir dinero"
                      >
                        <Wallet className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(goal)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Editar meta"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => goal.id && handleDelete(goal.id)}
                      disabled={isDeleting}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      title="Eliminar meta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs text-gray-500">Progreso</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {progress.percentageFormatted}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        goal.is_completed
                          ? 'bg-purple-500'
                          : progress.percentage >= 80
                          ? 'bg-green-500'
                          : progress.percentage >= 50
                          ? 'bg-blue-500'
                          : 'bg-yellow-500'
                      }`}
                      style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{progress.currentFormatted}</span>
                    <span>{progress.targetFormatted}</span>
                  </div>
                  {!goal.is_completed && (
                    <p className="text-xs text-gray-500 mt-1">
                      Faltan {progress.remainingFormatted}
                    </p>
                  )}
                </div>

                {/* Description */}
                {goal.description && (
                  <p className="text-xs text-gray-600 mb-2">{goal.description}</p>
                )}

                {goal.is_completed && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-purple-600 font-medium flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Meta completada
                    </p>
                  </div>
                )}

                {/* Add Money Form */}
                {addingToGoalId === goal.id && (
                  <form
                    onSubmit={onAddMoney}
                    className="mt-3 pt-3 border-t border-gray-200 space-y-2"
                  >
                    <input
                      type="number"
                      step="0.01"
                      {...registerAddMoney('amount', {
                        required: 'Cantidad requerida',
                        min: { value: 0.01, message: 'Mínimo 0.01' },
                      })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Cantidad a añadir"
                    />
                    {addMoneyErrors.amount && (
                      <p className="text-red-500 text-xs">{addMoneyErrors.amount.message}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isAdding}
                        className="flex-1 bg-green-600 text-white px-3 py-1.5 text-sm rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                      >
                        {isAdding ? 'Añadiendo...' : 'Añadir'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddingToGoalId(null);
                          resetAddMoney();
                        }}
                        className="flex-1 bg-gray-200 text-gray-700 px-3 py-1.5 text-sm rounded-lg font-medium hover:bg-gray-300 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
