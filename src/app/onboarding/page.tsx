'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useCategories } from '@/hooks/useCategories';
import { useAccounts } from '@/hooks/useAccounts';
import {
  Loader2,
  CheckCircle2,
  Wallet,
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  Sparkles
} from 'lucide-react';

const DEFAULT_CATEGORIES = [
  { name: 'Comida', type: 'expense', icon: 'Utensils', color: '#ef4444' },
  { name: 'Transporte', type: 'expense', icon: 'Car', color: '#f59e0b' },
  { name: 'Ocio', type: 'expense', icon: 'Coffee', color: '#8b5cf6' },
  { name: 'Salud', type: 'expense', icon: 'Heart', color: '#ec4899' },
  { name: 'Vivienda', type: 'expense', icon: 'Home', color: '#3b82f6' },
  { name: 'Compras', type: 'expense', icon: 'ShoppingBag', color: '#10b981' },
  { name: 'Servicios', type: 'expense', icon: 'Briefcase', color: '#6366f1' },
  { name: 'Otros gastos', type: 'expense', icon: 'Gift', color: '#64748b' },
  { name: 'Salario', type: 'income', icon: 'TrendingUp', color: '#22c55e' },
  { name: 'Inversiones', type: 'income', icon: 'Wallet', color: '#14b8a6' },
  { name: 'Otros ingresos', type: 'income', icon: 'Gift', color: '#06b6d4' },
];

const TUTORIAL_STEPS = [
  {
    title: 'Registra tus transacciones',
    description: 'Añade ingresos y gastos fácilmente desde la página principal. Cada transacción se asigna a una categoría para mejor organización.',
    icon: Wallet,
  },
  {
    title: 'Controla tu presupuesto',
    description: 'Establece presupuestos mensuales para cada categoría y recibe alertas cuando estés cerca del límite.',
    icon: TrendingUp,
  },
  {
    title: 'Alcanza tus metas',
    description: 'Define objetivos de ahorro y visualiza tu progreso. El sistema te ayudará a alcanzar tus metas financieras.',
    icon: Sparkles,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const { create: createCategory } = useCategories();
  const { createAccount } = useAccounts();

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 2: Account form data
  const [accountData, setAccountData] = useState({
    name: '',
    type: 'banco' as 'banco' | 'efectivo' | 'tarjeta',
    balance: 0,
  });

  const totalSteps = 3;

  const handleCreateDefaultCategories = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Create all default categories
      for (const category of DEFAULT_CATEGORIES) {
        await createCategory({
          name: category.name,
          type: category.type as 'income' | 'expense',
          icon: category.icon,
          color: category.color,
        });
      }
      setCurrentStep(1);
    } catch (err) {
      setError('Error al crear las categorías. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!accountData.name.trim()) {
      setError('El nombre de la cuenta es requerido');
      setIsLoading(false);
      return;
    }

    try {
      await createAccount({
        name: accountData.name,
        type: accountData.type,
        balance: accountData.balance,
        currency: 'EUR',
        is_active: true,
      });
      setCurrentStep(2);
    } catch (err) {
      setError('Error al crear la cuenta. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishOnboarding = async () => {
    setIsLoading(true);

    try {
      // Update user profile to mark onboarding as complete
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user?.id);

      // Redirect to dashboard
      router.push('/');
    } catch (err) {
      setError('Error al completar la configuración. Intenta de nuevo.');
      setIsLoading(false);
    }
  };

  // Step 0: Welcome + Categories
  if (currentStep === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 py-8">
        <div className="max-w-2xl w-full">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Paso 1 de {totalSteps}</span>
              <span className="text-sm font-medium text-gray-600">33%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all" style={{ width: '33%' }}></div>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">¡Bienvenido a Control Financiero!</h1>
              <p className="text-gray-600">Vamos a configurar tu cuenta en 3 simples pasos</p>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Categorías predefinidas</h2>
              <p className="text-gray-600 mb-6">
                Crearemos estas categorías para organizar tus transacciones. Podrás añadir más después.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {DEFAULT_CATEGORIES.map((category, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: category.color + '20' }}>
                      <span className="text-lg" style={{ color: category.color }}>
                        {category.icon === 'Utensils' && '🍴'}
                        {category.icon === 'Car' && '🚗'}
                        {category.icon === 'Coffee' && '☕'}
                        {category.icon === 'Heart' && '❤️'}
                        {category.icon === 'Home' && '🏠'}
                        {category.icon === 'ShoppingBag' && '🛍️'}
                        {category.icon === 'Briefcase' && '💼'}
                        {category.icon === 'Gift' && '🎁'}
                        {category.icon === 'TrendingUp' && '📈'}
                        {category.icon === 'Wallet' && '💰'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{category.name}</p>
                      <p className="text-xs text-gray-500">{category.type === 'income' ? 'Ingreso' : 'Gasto'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreateDefaultCategories}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creando categorías...
                </>
              ) : (
                <>
                  Continuar
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Create first account
  if (currentStep === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 py-8">
        <div className="max-w-2xl w-full">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Paso 2 de {totalSteps}</span>
              <span className="text-sm font-medium text-gray-600">66%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all" style={{ width: '66%' }}></div>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl mb-4 shadow-lg">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Crea tu primera cuenta</h1>
              <p className="text-gray-600">Añade una cuenta bancaria, tarjeta o efectivo</p>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-6">
              {/* Account Name */}
              <div>
                <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la cuenta *
                </label>
                <input
                  id="accountName"
                  type="text"
                  required
                  value={accountData.name}
                  onChange={(e) => setAccountData({ ...accountData, name: e.target.value })}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Ej: Cuenta Corriente, Efectivo, Tarjeta Visa"
                />
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de cuenta *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setAccountData({ ...accountData, type: 'banco' })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      accountData.type === 'banco'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">🏦</div>
                      <p className="text-sm font-medium text-gray-900">Banco</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountData({ ...accountData, type: 'efectivo' })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      accountData.type === 'efectivo'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">💵</div>
                      <p className="text-sm font-medium text-gray-900">Efectivo</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountData({ ...accountData, type: 'tarjeta' })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      accountData.type === 'tarjeta'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">💳</div>
                      <p className="text-sm font-medium text-gray-900">Tarjeta</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Initial Balance */}
              <div>
                <label htmlFor="balance" className="block text-sm font-medium text-gray-700 mb-2">
                  Saldo inicial
                </label>
                <div className="relative">
                  <input
                    id="balance"
                    type="number"
                    step="0.01"
                    value={accountData.balance}
                    onChange={(e) => setAccountData({ ...accountData, balance: parseFloat(e.target.value) || 0 })}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="0.00"
                  />
                  <span className="absolute right-4 top-3 text-gray-500">EUR</span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Puedes dejarlo en 0 si prefieres
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(0)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-all"
                >
                  <ArrowLeft className="h-5 w-5" />
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creando cuenta...
                    </>
                  ) : (
                    <>
                      Continuar
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Tutorial
  if (currentStep === 2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 py-8">
        <div className="max-w-2xl w-full">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Paso 3 de {totalSteps}</span>
              <span className="text-sm font-medium text-gray-600">100%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all" style={{ width: '100%' }}></div>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl mb-4 shadow-lg">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">¡Todo listo!</h1>
              <p className="text-gray-600">Aquí tienes un resumen de las funciones principales</p>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-6 mb-8">
              {TUTORIAL_STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={index} className="flex gap-4 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <Icon className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>💡 Consejo:</strong> Empieza registrando tus gastos del día a día para tener una visión clara de tus finanzas.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-all"
              >
                <ArrowLeft className="h-5 w-5" />
                Atrás
              </button>
              <button
                onClick={handleFinishOnboarding}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    Comenzar a usar la app
                    <CheckCircle2 className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
