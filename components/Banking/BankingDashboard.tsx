'use client';

import { useState } from 'react';
import CSVImporter from './CSVImporter';
import TransactionReview from './TransactionReview';
import { Building2, Upload, ListChecks } from 'lucide-react';

export default function BankingDashboard() {
  const [activeTab, setActiveTab] = useState<'import' | 'review'>('import');
  const [refreshKey, setRefreshKey] = useState(0);

  const tabs = [
    { id: 'import' as const, label: 'Importar', icon: Upload },
    { id: 'review' as const, label: 'Revisar', icon: ListChecks }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <Building2 className="text-blue-600" size={40} />
            Conexión Bancaria
          </h1>
          <p className="text-gray-600">
            Importa tus transacciones automáticamente desde tu banco
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg p-2 mb-6 inline-flex gap-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={20} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="grid md:grid-cols-1 gap-6">
          {activeTab === 'import' && (
            <CSVImporter
              onSuccess={() => {
                setRefreshKey(prev => prev + 1);
                setActiveTab('review');
              }}
            />
          )}

          {activeTab === 'review' && (
            <TransactionReview
              key={refreshKey}
              onReviewComplete={() => setRefreshKey(prev => prev + 1)}
            />
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="font-bold text-blue-800 mb-3">Bancos Soportados</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="font-semibold">BBVA</p>
              <p className="text-xs text-gray-500">CSV</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="font-semibold">Revolut</p>
              <p className="text-xs text-gray-500">CSV</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="font-semibold">Santander</p>
              <p className="text-xs text-gray-500">CSV</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="font-semibold">CaixaBank</p>
              <p className="text-xs text-gray-500">CSV</p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Próximamente:</strong> Conexión directa con BBVA API (sin necesidad de CSV)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
