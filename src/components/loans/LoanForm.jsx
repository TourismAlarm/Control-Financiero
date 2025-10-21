'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Formulario para agregar o editar un préstamo
 */
export default function LoanForm({ loan = null, onSubmit, onCancel, darkMode = false }) {
  const isEdit = !!loan;

  const [formData, setFormData] = useState({
    name: '',
    type: 'personal',
    initial_amount: '',
    current_balance: '',
    interest_rate: '',
    monthly_payment: '',
    total_months: '',
    paid_months: '0',
    start_date: new Date().toISOString().split('T')[0],
    payment_day: '1',
    bank: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Cargar datos si es edición
  useEffect(() => {
    if (loan) {
      setFormData({
        name: loan.name || '',
        type: loan.type || 'personal',
        initial_amount: loan.initial_amount?.toString() || '',
        current_balance: loan.current_balance?.toString() || '',
        interest_rate: loan.interest_rate?.toString() || '',
        monthly_payment: loan.monthly_payment?.toString() || '',
        total_months: loan.total_months?.toString() || '',
        paid_months: loan.paid_months?.toString() || '0',
        start_date: loan.start_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        payment_day: loan.payment_day?.toString() || '1',
        bank: loan.bank || '',
        notes: loan.notes || '',
      });
    }
  }, [loan]);

  // Validar formulario
  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!formData.initial_amount || parseFloat(formData.initial_amount) <= 0) {
      newErrors.initial_amount = 'El monto inicial debe ser mayor a 0';
    }

    if (!formData.monthly_payment || parseFloat(formData.monthly_payment) <= 0) {
      newErrors.monthly_payment = 'La cuota mensual debe ser mayor a 0';
    }

    if (formData.interest_rate && (parseFloat(formData.interest_rate) < 0 || parseFloat(formData.interest_rate) > 100)) {
      newErrors.interest_rate = 'La tasa debe estar entre 0 y 100';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'La fecha de inicio es requerida';
    }

    const paymentDay = parseInt(formData.payment_day);
    if (paymentDay < 1 || paymentDay > 31) {
      newErrors.payment_day = 'El día de pago debe estar entre 1 y 31';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      // Si no se proporciona saldo actual, usar el monto inicial
      const dataToSubmit = {
        ...formData,
        current_balance: formData.current_balance || formData.initial_amount,
      };

      await onSubmit(dataToSubmit);
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: error.message || 'Error al guardar el préstamo' });
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambios en inputs
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo cuando el usuario escribe
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const inputClass = `
    w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 focus:outline-none
    ${darkMode
      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500/20'
      : 'bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500/20'
    }
  `;

  const labelClass = `block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`;
  const errorClass = 'text-red-500 text-xs mt-1';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`
          max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl
          ${darkMode ? 'bg-gray-800' : 'bg-white'}
        `}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {isEdit ? 'Editar Préstamo' : 'Agregar Préstamo'}
          </h2>
          <button
            onClick={onCancel}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nombre y Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nombre *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ej: Préstamo personal"
                className={inputClass}
              />
              {errors.name && <p className={errorClass}>{errors.name}</p>}
            </div>

            <div>
              <label className={labelClass}>Tipo *</label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className={inputClass}
              >
                <option value="personal">Personal</option>
                <option value="hipoteca">Hipoteca</option>
                <option value="coche">Coche</option>
                <option value="tarjeta_credito">Tarjeta de crédito</option>
                <option value="estudiante">Estudiante</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>

          {/* Montos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Monto inicial * (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.initial_amount}
                onChange={(e) => handleChange('initial_amount', e.target.value)}
                placeholder="10000"
                className={inputClass}
              />
              {errors.initial_amount && <p className={errorClass}>{errors.initial_amount}</p>}
            </div>

            <div>
              <label className={labelClass}>Saldo actual (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.current_balance}
                onChange={(e) => handleChange('current_balance', e.target.value)}
                placeholder={formData.initial_amount || "Opcional"}
                className={inputClass}
              />
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Dejar vacío si es nuevo
              </p>
            </div>
          </div>

          {/* Tasa y cuota */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Tasa de interés anual (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.interest_rate}
                onChange={(e) => handleChange('interest_rate', e.target.value)}
                placeholder="5.5"
                className={inputClass}
              />
              {errors.interest_rate && <p className={errorClass}>{errors.interest_rate}</p>}
            </div>

            <div>
              <label className={labelClass}>Cuota mensual * (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.monthly_payment}
                onChange={(e) => handleChange('monthly_payment', e.target.value)}
                placeholder="250"
                className={inputClass}
              />
              {errors.monthly_payment && <p className={errorClass}>{errors.monthly_payment}</p>}
            </div>
          </div>

          {/* Plazo y meses pagados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Plazo total (meses)</label>
              <input
                type="number"
                value={formData.total_months}
                onChange={(e) => handleChange('total_months', e.target.value)}
                placeholder="60"
                className={inputClass}
              />
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Se calcula automáticamente si se deja vacío
              </p>
            </div>

            <div>
              <label className={labelClass}>Meses ya pagados</label>
              <input
                type="number"
                value={formData.paid_months}
                onChange={(e) => handleChange('paid_months', e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Fecha de inicio *</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
                className={inputClass}
              />
              {errors.start_date && <p className={errorClass}>{errors.start_date}</p>}
            </div>

            <div>
              <label className={labelClass}>Día de pago (1-31)</label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.payment_day}
                onChange={(e) => handleChange('payment_day', e.target.value)}
                className={inputClass}
              />
              {errors.payment_day && <p className={errorClass}>{errors.payment_day}</p>}
            </div>
          </div>

          {/* Banco */}
          <div>
            <label className={labelClass}>Entidad/Banco</label>
            <input
              type="text"
              value={formData.bank}
              onChange={(e) => handleChange('bank', e.target.value)}
              placeholder="Ej: Banco Santander"
              className={inputClass}
            />
          </div>

          {/* Notas */}
          <div>
            <label className={labelClass}>Notas</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Información adicional..."
              rows={3}
              className={inputClass}
            />
          </div>

          {/* Error de envío */}
          {errors.submit && (
            <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-xl">
              <p className="text-red-700 dark:text-red-400 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className={`
                flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300
                ${darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }
              `}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className={`
                flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                ${darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                }
                shadow-md hover:shadow-lg
              `}
            >
              {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Agregar Préstamo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
