'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, X, Save, Tag } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { useGlobalToast } from '@/components/Toaster';
import { categoryInsertSchema, type CategoryInsert } from '@/lib/validations/schemas';

/**
 * Categories Manager Component
 * Allows users to manage their income and expense categories
 * Features:
 * - View all categories separated by type
 * - Create new categories
 * - Edit existing categories
 * - Delete custom categories (system categories cannot be deleted)
 */

// Client-side schema without user_id (added server-side from session)
// Make is_system explicitly required for the form
const categoryClientSchema = categoryInsertSchema.omit({ user_id: true, is_system: true }).extend({
  is_system: z.boolean(),
});

type FormData = z.infer<typeof categoryClientSchema>;

interface CategoryFormProps {
  type: 'income' | 'expense';
  category?: CategoryInsert & { id?: string; is_system?: boolean };
  onSuccess: () => void;
  onCancel: () => void;
}

function CategoryForm({ type, category, onSuccess, onCancel }: CategoryFormProps) {
  const { create, update, isCreating, isUpdating } = useCategories();
  const { toast } = useGlobalToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(categoryClientSchema),
    defaultValues: category
      ? {
          name: category.name,
          type: category.type,
          icon: category.icon || '',
          color: category.color || '#6B7280',
          is_system: category.is_system || false,
        }
      : {
          name: '',
          type,
          icon: '',
          color: '#6B7280',
          is_system: false,
        },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (category?.id) {
        await update({ ...data, id: category.id });
        toast('Categoría actualizada correctamente', 'success');
      } else {
        await create(data);
        toast('Categoría creada correctamente', 'success');
      }
      onSuccess();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast(`Error: ${errorMessage}`, 'error');
    }
  });

  const isLoading = isCreating || isUpdating;

  return (
    <form onSubmit={onSubmit} className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div className="flex items-center gap-2">
        <Tag className="w-5 h-5 text-blue-500" />
        <h4 className="font-semibold">
          {category?.id ? 'Editar Categoría' : 'Nueva Categoría'}
        </h4>
      </div>

      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Nombre *
        </label>
        <input
          {...register('name')}
          type="text"
          id="name"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Ej: Alimentación, Salario, etc."
          disabled={isLoading}
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      {/* Icon (Optional) */}
      <div>
        <label htmlFor="icon" className="block text-sm font-medium mb-1">
          Emoji/Icono (opcional)
        </label>
        <input
          {...register('icon')}
          type="text"
          id="icon"
          maxLength={2}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="🍔 🚗 🏠 💼"
          disabled={isLoading}
        />
        <p className="text-xs text-gray-500 mt-1">
          Agrega un emoji para identificar visualmente la categoría
        </p>
      </div>

      {/* Color */}
      <div>
        <label htmlFor="color" className="block text-sm font-medium mb-1">
          Color
        </label>
        <div className="flex gap-2 items-center">
          <input
            {...register('color')}
            type="color"
            id="color"
            className="h-10 w-20 border rounded cursor-pointer"
            disabled={isLoading}
          />
          <span className="text-sm text-gray-600">
            Selecciona un color para la categoría
          </span>
        </div>
      </div>

      {/* Type (Read-only, shown for confirmation) */}
      <div>
        <label className="block text-sm font-medium mb-1">Tipo</label>
        <div
          className={`px-3 py-2 border rounded-lg ${
            type === 'income' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}
        >
          <span className="font-medium">
            {type === 'income' ? '💰 Ingreso' : '💸 Gasto'}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {isLoading ? 'Guardando...' : category?.id ? 'Actualizar' : 'Crear'}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 border rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}

export function CategoriesManager() {
  const { expenseCategories, incomeCategories, isLoading, delete: deleteCategory } =
    useCategories();
  const { toast, showConfirm } = useGlobalToast();

  const [editingCategory, setEditingCategory] = useState<(CategoryInsert & { id?: string; is_system?: boolean }) | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);

  const handleDelete = (id: string, name: string, isSystem: boolean) => {
    if (isSystem) {
      toast('No se pueden eliminar categorías del sistema', 'error');
      return;
    }

    showConfirm(`¿Eliminar la categoría "${name}"?`, async () => {
      try {
        await deleteCategory(id);
        toast('Categoría eliminada correctamente', 'success');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        toast(`Error al eliminar: ${errorMessage}`, 'error');
      }
    });
  };

  const handleFormSuccess = () => {
    setEditingCategory(null);
    setShowExpenseForm(false);
    setShowIncomeForm(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gestionar Categorías</h2>
      </div>

      {/* Expense Categories */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-red-500">💸</span>
            Categorías de Gastos
          </h3>
          <button
            onClick={() => {
              setShowExpenseForm(!showExpenseForm);
              setShowIncomeForm(false);
              setEditingCategory(null);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva Categoría
          </button>
        </div>

        {showExpenseForm && !editingCategory && (
          <CategoryForm
            type="expense"
            onSuccess={handleFormSuccess}
            onCancel={() => setShowExpenseForm(false)}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {expenseCategories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
              style={{ borderLeftColor: category.color || '#EF4444', borderLeftWidth: '4px' }}
            >
              <div className="flex items-center gap-3">
                {category.icon && <span className="text-2xl">{category.icon}</span>}
                <div>
                  <p className="font-medium">{category.name}</p>
                  {category.is_system && (
                    <span className="text-xs text-gray-500">Sistema</span>
                  )}
                </div>
              </div>

              {!category.is_system && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingCategory(category);
                      setShowExpenseForm(false);
                      setShowIncomeForm(false);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4 text-blue-500" />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id, category.name, category.is_system)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {expenseCategories.length === 0 && (
            <div className="col-span-2 text-center py-8 text-gray-500">
              No hay categorías de gastos. Crea una para comenzar.
            </div>
          )}
        </div>

        {editingCategory && editingCategory.type === 'expense' && (
          <CategoryForm
            type="expense"
            category={editingCategory}
            onSuccess={handleFormSuccess}
            onCancel={() => setEditingCategory(null)}
          />
        )}
      </div>

      {/* Income Categories */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-green-500">💰</span>
            Categorías de Ingresos
          </h3>
          <button
            onClick={() => {
              setShowIncomeForm(!showIncomeForm);
              setShowExpenseForm(false);
              setEditingCategory(null);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva Categoría
          </button>
        </div>

        {showIncomeForm && !editingCategory && (
          <CategoryForm
            type="income"
            onSuccess={handleFormSuccess}
            onCancel={() => setShowIncomeForm(false)}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {incomeCategories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
              style={{ borderLeftColor: category.color || '#10B981', borderLeftWidth: '4px' }}
            >
              <div className="flex items-center gap-3">
                {category.icon && <span className="text-2xl">{category.icon}</span>}
                <div>
                  <p className="font-medium">{category.name}</p>
                  {category.is_system && (
                    <span className="text-xs text-gray-500">Sistema</span>
                  )}
                </div>
              </div>

              {!category.is_system && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingCategory(category);
                      setShowExpenseForm(false);
                      setShowIncomeForm(false);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4 text-blue-500" />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id, category.name, category.is_system)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {incomeCategories.length === 0 && (
            <div className="col-span-2 text-center py-8 text-gray-500">
              No hay categorías de ingresos. Crea una para comenzar.
            </div>
          )}
        </div>

        {editingCategory && editingCategory.type === 'income' && (
          <CategoryForm
            type="income"
            category={editingCategory}
            onSuccess={handleFormSuccess}
            onCancel={() => setEditingCategory(null)}
          />
        )}
      </div>
    </div>
  );
}
