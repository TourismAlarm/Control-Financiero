'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Target,
  Repeat,
  PiggyBank,
  BarChart3,
  Upload,
  Download,
  CreditCard,
  Settings,
  ArrowRightLeft
} from 'lucide-react';

// Import modular components
import { FinancialDashboard } from '@/components/finance/FinancialDashboard';
import { TransactionsList } from '@/components/finance/TransactionsList';
import { AccountsManager } from '@/components/finance/AccountsManager';
import { BudgetOverview } from '@/components/finance/BudgetOverview';
import { RecurringTransactions } from '@/components/finance/RecurringTransactions';
import { SavingsGoals } from '@/components/finance/SavingsGoals';
import { Statistics } from '@/components/finance/Statistics';
import { CSVImporter } from '@/components/import/CSVImporter';
import { ExportManager } from '@/components/finance/ExportManager';
import LoanManager from '@/components/loans/LoanManager';
import { TransferManager } from '@/components/finance/TransferManager';
import { ConnectionStatus } from '@/components/offline/ConnectionStatus';
import { InstallPrompt } from '@/components/offline/InstallPrompt';

type TabId = 'dashboard' | 'transactions' | 'accounts' | 'transfers' | 'budgets' | 'recurring' | 'savings' | 'loans' | 'statistics' | 'import' | 'export';

const tabs = [
  { id: 'dashboard' as TabId, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions' as TabId, label: 'Transacciones', icon: Receipt },
  { id: 'accounts' as TabId, label: 'Cuentas', icon: Wallet },
  { id: 'transfers' as TabId, label: 'Transferencias', icon: ArrowRightLeft },
  { id: 'budgets' as TabId, label: 'Presupuestos', icon: Target },
  { id: 'recurring' as TabId, label: 'Recurrentes', icon: Repeat },
  { id: 'savings' as TabId, label: 'Ahorros', icon: PiggyBank },
  { id: 'loans' as TabId, label: 'Deudas', icon: CreditCard },
  { id: 'statistics' as TabId, label: 'Estadísticas', icon: BarChart3 },
  { id: 'import' as TabId, label: 'Importar', icon: Upload },
  { id: 'export' as TabId, label: 'Exportar', icon: Download },
];

export default function Home() {
  console.log('🔵 PAGE.TSX - Componente Home renderizado')

  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  console.log('🔵 PAGE.TSX - Status:', status)
  console.log('🔵 PAGE.TSX - Session:', session)

  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log('🔴 PAGE.TSX - Usuario no autenticado, redirigiendo a signin')
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    console.log('🟡 PAGE.TSX - Mostrando pantalla de carga')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    console.log('🔴 PAGE.TSX - No hay sesión, retornando null')
    return null;
  }

  console.log('✅ PAGE.TSX - Renderizando app modular')

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Control Financiero</h1>
              <p className="text-sm text-gray-600">Bienvenido, {session.user?.name || session.user?.email}</p>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => router.push('/configuracion')}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Configuración"
              >
                <Settings className="w-4 h-4" />
                Configuración
              </button>
              <button
                onClick={() => router.push('/api/auth/signout')}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:border-b-2 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <FinancialDashboard month={selectedMonth} />}
        {activeTab === 'transactions' && <TransactionsList type="all" month={selectedMonth} />}
        {activeTab === 'accounts' && <AccountsManager />}
        {activeTab === 'transfers' && <TransferManager />}
        {activeTab === 'budgets' && <BudgetOverview />}
        {activeTab === 'recurring' && <RecurringTransactions />}
        {activeTab === 'savings' && <SavingsGoals />}
        {activeTab === 'loans' && <LoanManager />}
        {activeTab === 'statistics' && <Statistics />}
        {activeTab === 'import' && <CSVImporter />}
        {activeTab === 'export' && <ExportManager />}
      </main>

      {/* PWA Components */}
      <ConnectionStatus />
      <InstallPrompt />
    </div>
  );
}
