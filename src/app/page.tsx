'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
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
  Plus,
  MoreHorizontal,
} from 'lucide-react';

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
import { ConnectionStatus } from '@/components/offline/ConnectionStatus';
import { InstallPrompt } from '@/components/offline/InstallPrompt';
import { QuickAdd } from '@/components/QuickAdd';
import { useProfile } from '@/hooks/useProfile';
import { getCurrentFinancialMonth } from '@/lib/financialMonth';

type TabId = 'dashboard' | 'transactions' | 'accounts' | 'budgets' | 'recurring' | 'savings' | 'loans' | 'statistics' | 'import' | 'export';

const tabs = [
  { id: 'dashboard' as TabId, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions' as TabId, label: 'Transacciones', icon: Receipt },
  { id: 'accounts' as TabId, label: 'Cuentas', icon: Wallet },
  { id: 'budgets' as TabId, label: 'Presupuestos', icon: Target },
  { id: 'recurring' as TabId, label: 'Recurrentes', icon: Repeat },
  { id: 'savings' as TabId, label: 'Ahorros', icon: PiggyBank },
  { id: 'loans' as TabId, label: 'Deudas', icon: CreditCard },
  { id: 'statistics' as TabId, label: 'Estadísticas', icon: BarChart3 },
  { id: 'import' as TabId, label: 'Importar', icon: Upload },
  { id: 'export' as TabId, label: 'Exportar', icon: Download },
];

// Bottom nav: 4 main tabs + FAB center + more
const bottomNavTabs = [
  { id: 'dashboard' as TabId, label: 'Inicio', icon: LayoutDashboard },
  { id: 'transactions' as TabId, label: 'Movimientos', icon: Receipt },
  { id: 'budgets' as TabId, label: 'Presupuesto', icon: Target },
  { id: 'accounts' as TabId, label: 'Cuentas', icon: Wallet },
];

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { getFinancialMonthStartDay, profile } = useProfile();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const monthInitialized = useRef(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Once profile loads, update selectedMonth to use the user's financial month
  useEffect(() => {
    if (profile && !monthInitialized.current) {
      monthInitialized.current = true;
      const startDay = getFinancialMonthStartDay();
      if (startDay !== 1) {
        setSelectedMonth(getCurrentFinancialMonth(startDay));
      }
    }
  }, [profile, getFinancialMonthStartDay]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const isBottomNavTab = bottomNavTabs.some(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Control Financiero</h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                {session.user?.name || session.user?.email}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => router.push('/configuracion')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Configuración"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Navigation Tabs — hidden on mobile */}
      <div className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-10">
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

      {/* Mobile: current section title */}
      <div className="md:hidden bg-white border-b border-gray-100 px-4 py-2">
        <p className="text-sm font-semibold text-gray-700">
          {tabs.find(t => t.id === activeTab)?.label}
        </p>
      </div>

      {/* Content — extra bottom padding on mobile for nav bar */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-24 md:pb-8">
        {activeTab === 'dashboard' && <FinancialDashboard month={selectedMonth} financialMonthStartDay={getFinancialMonthStartDay()} />}
        {activeTab === 'transactions' && <TransactionsList type="all" month={selectedMonth} financialMonthStartDay={getFinancialMonthStartDay()} />}
        {activeTab === 'accounts' && <AccountsManager />}
        {activeTab === 'budgets' && <BudgetOverview />}
        {activeTab === 'recurring' && <RecurringTransactions />}
        {activeTab === 'savings' && <SavingsGoals />}
        {activeTab === 'loans' && <LoanManager />}
        {activeTab === 'statistics' && <Statistics />}
        {activeTab === 'import' && <CSVImporter />}
        {activeTab === 'export' && <ExportManager />}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200">
        <div className="flex items-center justify-around h-16 px-2">
          {/* Left two tabs */}
          {bottomNavTabs.slice(0, 2).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMoreMenuOpen(false); }}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}

          {/* FAB center button */}
          <div className="flex-1 flex justify-center">
            <button
              onClick={() => setQuickAddOpen(true)}
              className="-mt-5 w-14 h-14 bg-blue-600 rounded-full shadow-lg text-white flex items-center justify-center transition-all active:scale-95 hover:bg-blue-700"
              title="Añadir transacción"
            >
              <Plus className="w-7 h-7" />
            </button>
          </div>

          {/* Right two tabs */}
          {bottomNavTabs.slice(2, 4).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMoreMenuOpen(false); }}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}

          {/* More */}
          <button
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 ${
              !isBottomNavTab ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">Más</span>
          </button>
        </div>

        {/* More menu dropdown */}
        {moreMenuOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setMoreMenuOpen(false)} />
            <div className="absolute bottom-16 right-0 left-0 mx-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-30 p-2">
              <div className="grid grid-cols-3 gap-1">
                {tabs.filter(t => !bottomNavTabs.find(b => b.id === t.id)).map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setMoreMenuOpen(false); }}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium text-center leading-tight">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </nav>

      {/* QuickAdd — works on both desktop (FAB) and mobile (triggered from bottom nav) */}
      <QuickAdd externalOpen={quickAddOpen} onExternalClose={() => setQuickAddOpen(false)} />

      {/* PWA Components */}
      <ConnectionStatus />
      <InstallPrompt />
    </div>
  );
}
