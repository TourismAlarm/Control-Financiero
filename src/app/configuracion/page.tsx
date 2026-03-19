'use client';

import { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Settings, Calendar, Globe, User, Save, ArrowLeft, Trash2, AlertTriangle } from 'lucide-react';

export default function ConfiguracionPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { profile, isLoading, updateProfile, isUpdating } = useProfile();

  const [formData, setFormData] = useState({
    full_name: '',
    currency: 'EUR',
    financial_month_start_day: 1,
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [clearConfirm, setClearConfirm] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [clearMessage, setClearMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load profile data when available
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        currency: profile.currency || 'EUR',
        financial_month_start_day: profile.financial_month_start_day || 1,
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      updateProfile(formData, {
        onSuccess: () => {
          setMessage({ type: 'success', text: '✅ Configuración guardada correctamente' });
          setTimeout(() => setMessage(null), 3000);
        },
        onError: (error: Error) => {
          setMessage({ type: 'error', text: `❌ Error: ${error.message}` });
          setTimeout(() => setMessage(null), 5000);
        },
      });
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleClearData = async () => {
    if (clearConfirm !== 'BORRAR') return;

    setIsClearing(true);
    setClearMessage(null);

    try {
      const response = await fetch('/api/admin/clear-data', { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        setClearMessage({ type: 'error', text: `❌ Error: ${data.error}` });
      } else {
        setClearMessage({ type: 'success', text: `✅ ${data.message}` });
        setClearConfirm('');
      }
    } catch {
      setClearMessage({ type: 'error', text: '❌ Error de conexión. Inténtalo de nuevo.' });
    } finally {
      setIsClearing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-solid border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          {/* Back Button */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-4 group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Volver al Dashboard</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <Settings className="text-blue-600 dark:text-blue-400" size={32} />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Configuración
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Personaliza tu experiencia en Control Financiero
          </p>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl border-2 ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-2 border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <User className="text-gray-600 dark:text-gray-400" size={24} />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Información Personal
              </h2>
            </div>

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Tu nombre"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={session?.user?.email || ''}
                  disabled
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  El email no se puede cambiar
                </p>
              </div>
            </div>
          </div>

          {/* Financial Settings Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-2 border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="text-gray-600 dark:text-gray-400" size={24} />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Configuración Financiera
              </h2>
            </div>

            <div className="space-y-6">
              {/* Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Moneda
                </label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all appearance-none"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="MXN">MXN ($)</option>
                  </select>
                </div>
              </div>

              {/* Financial Month Start Day */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Día de Inicio del Mes Financiero
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.financial_month_start_day}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (value >= 1 && value <= 31) {
                      setFormData({ ...formData, financial_month_start_day: value });
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
                />
                <div className="mt-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-400 mb-2">
                    <strong>¿Qué es esto?</strong>
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                    Si cobras el día {formData.financial_month_start_day} de cada mes, tus transacciones se agruparán de forma que el dinero que cobras esté en el mes correcto.
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>Ejemplo:</strong> Si cobras el 26, las transacciones del 26 Nov - 25 Dic se mostrarán como &quot;Diciembre&quot;.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Zona de Peligro */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-2 border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
              <h2 className="text-xl font-bold text-red-700 dark:text-red-400">
                Zona de Peligro
              </h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Acciones irreversibles. Úsalas con precaución.
            </p>

            {/* Borrar datos de prueba */}
            <div className="border-2 border-red-200 dark:border-red-800 rounded-xl p-5">
              <div className="flex items-start gap-3 mb-3">
                <Trash2 className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" size={20} />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Borrar todos los datos financieros
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Elimina todas las transacciones, cuentas, presupuestos, préstamos, metas de ahorro
                    y reglas recurrentes. Las categorías del sistema se mantienen. Tu cuenta permanece intacta.
                  </p>
                </div>
              </div>

              {clearMessage && (
                <div
                  className={`mb-4 p-3 rounded-lg text-sm ${
                    clearMessage.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                      : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                  }`}
                >
                  {clearMessage.text}
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Escribe <span className="font-mono font-bold text-red-600 dark:text-red-400">BORRAR</span> para confirmar:
                </p>
                <input
                  type="text"
                  value={clearConfirm}
                  onChange={(e) => setClearConfirm(e.target.value)}
                  placeholder="Escribe BORRAR para confirmar"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-red-200 dark:border-red-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-red-500 focus:ring-4 focus:ring-red-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={handleClearData}
                  disabled={clearConfirm !== 'BORRAR' || isClearing}
                  className={`
                    flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all
                    ${clearConfirm === 'BORRAR' && !isClearing
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    }
                  `}
                >
                  <Trash2 size={16} />
                  {isClearing ? 'Borrando datos...' : 'Borrar todos los datos'}
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isUpdating}
              className={`
                flex items-center gap-2 px-8 py-3 rounded-xl font-semibold
                transition-all duration-300 shadow-lg hover:shadow-xl
                ${isUpdating
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transform hover:scale-105'
                }
              `}
            >
              <Save size={20} />
              {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
