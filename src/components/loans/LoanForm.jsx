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
    interest_rate: '',
    monthly_payment: '',
    start_date: new Date().toISOString().split('T')[0],
    paid_months_on_create: '0',
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
        interest_rate: loan.interest_rate?.toString() || '',
        monthly_payment: loan.monthly_payment?.toString() || '',
        start_date: loan.start_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        paid_months_on_create: '0',
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
      newErrors.start_date = 'La fecha de primera cuota es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Calcular número de meses automáticamente
  const calculateTotalMonths = () => {
    const principal = parseFloat(formData.initial_amount);
    const rate = parseFloat(formData.interest_rate) / 100 / 12; // Tasa mensual
    const payment = parseFloat(formData.monthly_payment);

    if (!principal || !payment || payment <= 0) return null;

    // Si no hay interés, cálculo simple
    if (!rate || rate === 0) {
      return Math.ceil(principal / payment);
    }

    // Fórmula de amortización: n = -log(1 - (P * r) / M) / log(1 + r)
    // P = principal, r = tasa mensual, M = pago mensual
    const numerator = Math.log(1 - (principal * rate) / payment);
    const denominator = Math.log(1 + rate);

    if (numerator >= 0) {
      // El pago es muy bajo, no alcanza para cubrir los intereses
      return null;
    }

    const months = Math.ceil(-numerator / denominator);
    return months > 0 && months < 1200 ? months : null; // Máximo 100 años
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const totalMonths = calculateTotalMonths();

      if (!totalMonths) {
        setErrors({ submit: 'No se puede calcular el plazo. Verifica que la cuota mensual sea suficiente para cubrir el préstamo.' });
        setLoading(false);
        return;
      }

      const dataToSubmit = {
        ...formData,
        total_months: totalMonths,
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
          {/* Información del mensaje */}
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border-2 border-blue-200'}`}>
            <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
              💡 Solo necesitas proporcionar el <strong>monto total</strong>, la <strong>tasa de interés</strong> y la <strong>cuota mensual</strong>.
              El sistema calculará automáticamente el número de meses del préstamo.
            </p>
          </div>

          {/* Nombre del préstamo */}
          <div>
            <label className={labelClass}>Nombre del préstamo *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Ej: Préstamo personal, Hipoteca, Coche"
              className={inputClass}
            />
            {errors.name && <p className={errorClass}>{errors.name}</p>}
          </div>

          {/* Tipo */}
          <div>
            <label className={labelClass}>Tipo de préstamo</label>
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

          {/* DATOS PRINCIPALES DEL PRÉSTAMO */}
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
            <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              📊 Datos del Préstamo
            </h3>

            <div className="space-y-4">
              {/* Monto total */}
              <div>
                <label className={labelClass}>Monto total del préstamo * (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.initial_amount}
                  onChange={(e) => handleChange('initial_amount', e.target.value)}
                  placeholder="10000"
                  className={inputClass}
                />
                {errors.initial_amount && <p className={errorClass}>{errors.initial_amount}</p>}
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Cantidad total que te prestaron
                </p>
              </div>

              {/* Tasa de interés */}
              <div>
                <label className={labelClass}>Tasa de interés anual * (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.interest_rate}
                  onChange={(e) => handleChange('interest_rate', e.target.value)}
                  placeholder="5.5"
                  className={inputClass}
                />
                {errors.interest_rate && <p className={errorClass}>{errors.interest_rate}</p>}
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Deja en 0 si no tiene intereses
                </p>
              </div>

              {/* Cuota mensual */}
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
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Cantidad que pagas cada mes
                </p>
              </div>
            </div>
          </div>

          {/* Fecha primera cuota */}
          <div>
            <label className={labelClass}>Fecha primera cuota *</label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => handleChange('start_date', e.target.value)}
              className={inputClass}
            />
            {errors.start_date && <p className={errorClass}>{errors.start_date}</p>}
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Fecha de vencimiento de la primera cuota (a mes vencido)
            </p>
          </div>

          {/* Cuotas ya pagadas - solo al crear */}
          {!isEdit && (
            <div>
              <label className={labelClass}>Cuotas ya pagadas (opcional)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.paid_months_on_create}
                onChange={(e) => handleChange('paid_months_on_create', e.target.value)}
                placeholder="0"
                className={inputClass}
              />
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Si llevas meses pagando, indícalo aquí. Se marcarán como pagadas sin crear transacciones.
              </p>
            </div>
          )}

          {/* Notas (opcional) */}
          <div>
            <label className={labelClass}>Notas (opcional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Información adicional sobre el préstamo..."
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
