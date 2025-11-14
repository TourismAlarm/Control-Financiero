'use client';

import { useState } from 'react';
import { Calculator, TrendingDown, DollarSign, Calendar, Percent } from 'lucide-react';
import { calculateMonthlyPayment, generateAmortizationTable, formatCurrency } from '@/lib/loanCalculations';

/**
 * Calculadora de Préstamos
 * Permite simular diferentes escenarios antes de crear un préstamo
 */
export default function LoanCalculator({ darkMode = false, onCreateLoan = null }) {
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [termMonths, setTermMonths] = useState('');
  const [result, setResult] = useState(null);
  const [showAmortization, setShowAmortization] = useState(false);

  const handleCalculate = () => {
    const p = parseFloat(principal);
    const r = parseFloat(interestRate);
    const t = parseInt(termMonths);

    if (!p || p <= 0 || !r || r < 0 || !t || t <= 0) {
      alert('Por favor, ingresa valores válidos');
      return;
    }

    // Calcular cuota mensual
    const monthlyPayment = calculateMonthlyPayment(p, r, t);

    // Generar tabla de amortización
    const amortizationTable = generateAmortizationTable(p, r, t, new Date());

    // Calcular totales
    const totalPayment = monthlyPayment * t;
    const totalInterest = totalPayment - p;

    setResult({
      principal: p,
      interestRate: r,
      termMonths: t,
      monthlyPayment,
      totalPayment,
      totalInterest,
      amortizationTable,
    });
  };

  const handleClear = () => {
    setPrincipal('');
    setInterestRate('');
    setTermMonths('');
    setResult(null);
    setShowAmortization(false);
  };

  const handleCreateLoan = () => {
    if (result && onCreateLoan) {
      onCreateLoan({
        monto_total: result.principal,
        tasa_interes: result.interestRate,
        plazo_meses: result.termMonths,
        cuota_mensual: result.monthlyPayment,
      });
    }
  };

  return (
    <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-3 rounded-xl ${darkMode ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
          <Calculator className={darkMode ? 'text-purple-400' : 'text-purple-600'} size={28} />
        </div>
        <div>
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Calculadora de Préstamos
          </h2>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Simula diferentes escenarios antes de crear tu préstamo
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Monto Principal */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <DollarSign className="inline w-4 h-4 mr-1" />
            Monto Principal
          </label>
          <input
            type="number"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            placeholder="Ej: 10000"
            min="0"
            step="100"
            className={`w-full px-4 py-3 rounded-lg border transition-colors ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
          />
        </div>

        {/* Tasa de Interés */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <Percent className="inline w-4 h-4 mr-1" />
            Tasa de Interés (% anual)
          </label>
          <input
            type="number"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            placeholder="Ej: 5.5"
            min="0"
            max="100"
            step="0.1"
            className={`w-full px-4 py-3 rounded-lg border transition-colors ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
          />
        </div>

        {/* Plazo */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <Calendar className="inline w-4 h-4 mr-1" />
            Plazo (meses)
          </label>
          <input
            type="number"
            value={termMonths}
            onChange={(e) => setTermMonths(e.target.value)}
            placeholder="Ej: 24"
            min="1"
            step="1"
            className={`w-full px-4 py-3 rounded-lg border transition-colors ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleCalculate}
          disabled={!principal || !interestRate || !termMonths}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300
            ${!principal || !interestRate || !termMonths
              ? darkMode
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : darkMode
                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                : 'bg-purple-500 hover:bg-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
            }
          `}
        >
          <Calculator size={20} />
          Calcular
        </button>

        <button
          onClick={handleClear}
          className={`
            px-6 py-3 rounded-lg font-semibold transition-colors
            ${darkMode
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }
          `}
        >
          Limpiar
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cuota Mensual */}
            <div className={`p-6 rounded-xl ${darkMode ? 'bg-gradient-to-br from-blue-900/40 to-blue-800/40 border border-blue-700/50' : 'bg-gradient-to-br from-blue-50 to-blue-100'}`}>
              <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                Cuota Mensual
              </div>
              <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-blue-900'}`}>
                {formatCurrency(result.monthlyPayment)}
              </div>
              <div className={`text-xs mt-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                Durante {result.termMonths} meses
              </div>
            </div>

            {/* Total a Pagar */}
            <div className={`p-6 rounded-xl ${darkMode ? 'bg-gradient-to-br from-orange-900/40 to-orange-800/40 border border-orange-700/50' : 'bg-gradient-to-br from-orange-50 to-orange-100'}`}>
              <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                Total a Pagar
              </div>
              <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-orange-900'}`}>
                {formatCurrency(result.totalPayment)}
              </div>
              <div className={`text-xs mt-2 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                Principal + Intereses
              </div>
            </div>

            {/* Total Intereses */}
            <div className={`p-6 rounded-xl ${darkMode ? 'bg-gradient-to-br from-red-900/40 to-red-800/40 border border-red-700/50' : 'bg-gradient-to-br from-red-50 to-red-100'}`}>
              <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                Total Intereses
              </div>
              <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-red-900'}`}>
                {formatCurrency(result.totalInterest)}
              </div>
              <div className={`text-xs mt-2 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                {((result.totalInterest / result.principal) * 100).toFixed(2)}% del principal
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowAmortization(!showAmortization)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }
              `}
            >
              <TrendingDown size={18} />
              {showAmortization ? 'Ocultar' : 'Ver'} Tabla de Amortización
            </button>

            {onCreateLoan && (
              <button
                onClick={handleCreateLoan}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300
                  ${darkMode
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl'
                  }
                `}
              >
                Crear Préstamo con estos Valores
              </button>
            )}
          </div>

          {/* Amortization Table */}
          {showAmortization && (
            <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-900/50 border border-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Tabla de Amortización
              </h3>

              <div className="overflow-x-auto">
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full">
                    <thead className={`sticky top-0 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                      <tr>
                        <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          #
                        </th>
                        <th className={`px-4 py-3 text-right text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Cuota
                        </th>
                        <th className={`px-4 py-3 text-right text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Capital
                        </th>
                        <th className={`px-4 py-3 text-right text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Interés
                        </th>
                        <th className={`px-4 py-3 text-right text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Saldo
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      {result.amortizationTable.map((row) => (
                        <tr key={row.month} className={darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100'}>
                          <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            {row.month}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                            {formatCurrency(row.payment)}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                            {formatCurrency(row.principal)}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                            {formatCurrency(row.interest)}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                            {formatCurrency(row.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      {!result && (
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/30' : 'bg-gray-100'}`}>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            💡 <strong>Consejo:</strong> Usa esta calculadora para simular diferentes escenarios y encontrar la mejor opción para tu presupuesto.
            Puedes ajustar el plazo para ver cómo afecta la cuota mensual y el total de intereses.
          </p>
        </div>
      )}
    </div>
  );
}
