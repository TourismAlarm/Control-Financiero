'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
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
  const { createAccount } = useAccounts();

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Account form data
  const [accountData, setAccountData] = useState({
    name: '',
    type: 'banco' as 'banco' | 'efectivo' | 'tarjeta',
    balance: 0,
  });

  const totalSteps = 3;

  // Map Spanish account types to English API types
  const accountTypeMap: Record<string, 'bank' | 'cash' | 'credit_card' | 'savings' | 'investment'> = {
    'banco': 'bank',
    'efectivo': 'cash',
    'tarjeta': 'credit_card'
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
        type: accountTypeMap[accountData.type] || 'bank',
        user_id: user?.id || '',
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
      // Skip onboarding update for now - will be handled server-side
      // const supabase = createClient();
      // await supabase
      //   .from('profiles')
      //   .update({ onboarding_completed: true })
      //   .eq('id', user?.id);

      // Redirect to dashboard
      router.push('/');
    } catch (err) {
      setError('Error al completar la configuración. Intenta de nuevo.');
      setIsLoading(false);
    }
  };

  // Step 0: Welcome
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

            <div className="mb-8 space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Tu cuenta está lista</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Hemos configurado automáticamente categorías predefinidas para tus ingresos y gastos.
                  Podrás personalizarlas más adelante desde la configuración.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">18</p>
                  <p className="text-xs text-gray-600">Categorías de gastos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">9</p>
                  <p className="text-xs text-gray-600">Categorías de ingresos</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setCurrentStep(1)}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-lg hover:shadow-xl"
            >
              Continuar
              <ArrowRight className="h-5 w-5" />
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
