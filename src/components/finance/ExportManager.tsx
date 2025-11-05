'use client';

import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Database } from 'lucide-react';
import { exportTransactionsToExcel } from '@/lib/export/exportExcel';
import { exportMonthlyReportToPDF } from '@/lib/export/exportPDF';
import { exportFullBackup } from '@/lib/export/exportJSON';
import { useSession } from 'next-auth/react';

export function ExportManager() {
  const { data: session } = useSession();
  const [isExporting, setIsExporting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const [transactionsRes, accountsRes] = await Promise.all([
        fetch(`/api/transactions?month=${selectedMonth}`),
        fetch('/api/accounts')
      ]);

      const transactions = await transactionsRes.json();
      const accounts = await accountsRes.json();

      await exportTransactionsToExcel(transactions, accounts, selectedMonth);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error al exportar a Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/transactions?month=${selectedMonth}`);
      const transactions = await response.json();

      await exportMonthlyReportToPDF(
        transactions,
        selectedMonth,
        session?.user?.name || session?.user?.email || 'Usuario'
      );
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Error al exportar a PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const [transactionsRes, accountsRes, categoriesRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/accounts'),
        fetch('/api/categories')
      ]);

      const transactions = await transactionsRes.json();
      const accounts = await accountsRes.json();
      const categories = await categoriesRes.json();

      exportFullBackup(transactions, accounts, categories);
    } catch (error) {
      console.error('Error exporting backup:', error);
      alert('Error al exportar backup');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Exportar Datos</h2>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar mes
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Exportar a Excel */}
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="flex flex-col items-center gap-3 p-6 border-2 border-green-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <FileSpreadsheet className="text-green-600" size={32} />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-gray-900">Excel</h3>
              <p className="text-sm text-gray-600 mt-1">
                Exportar transacciones del mes seleccionado
              </p>
            </div>
          </button>

          {/* Exportar a PDF */}
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex flex-col items-center gap-3 p-6 border-2 border-red-200 rounded-xl hover:border-red-400 hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <FileText className="text-red-600" size={32} />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-gray-900">PDF</h3>
              <p className="text-sm text-gray-600 mt-1">
                Informe mensual en PDF
              </p>
            </div>
          </button>

          {/* Backup completo JSON */}
          <button
            onClick={handleExportBackup}
            disabled={isExporting}
            className="flex flex-col items-center gap-3 p-6 border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Database className="text-blue-600" size={32} />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-gray-900">Backup JSON</h3>
              <p className="text-sm text-gray-600 mt-1">
                Respaldo completo de todos los datos
              </p>
            </div>
          </button>
        </div>

        {isExporting && (
          <div className="mt-6 flex items-center justify-center gap-3 text-blue-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Exportando...</span>
          </div>
        )}
      </div>
    </div>
  );
}
