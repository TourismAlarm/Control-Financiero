'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { QuickAdd } from '@/components/QuickAdd';
import { ConnectionStatus } from '@/components/offline/ConnectionStatus';
import { InstallPrompt } from '@/components/offline/InstallPrompt';
import { HomeScreen } from '@/components/v2/HomeScreen';
import { MovementsScreen } from '@/components/v2/MovementsScreen';
import { DebtsScreen } from '@/components/v2/DebtsScreen';
import { appFont, monthLabel } from '@/components/v2/ui';

type Tab = 'home' | 'movements' | 'debts';

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const ICONS: Record<Tab | 'settings', ReactNode> = {
  home: <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  movements: <path d="M4 6h16M4 12h16M4 18h10" />,
  debts: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
};

function NavItem({ label, icon, active, onClick }: { label: string; icon: Tab | 'settings'; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center gap-1 py-1.5 text-xs ${active ? 'text-[#15171C] font-semibold' : 'text-[#5B6070]'}`}
    >
      <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.3 : 2} strokeLinecap="round" strokeLinejoin="round">
        {ICONS[icon]}
      </svg>
      {label}
    </button>
  );
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('home');
  const [month, setMonth] = useState(currentMonth);
  const [movementsFilter, setMovementsFilter] = useState<'all' | 'uncategorized'>('all');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const monthInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F3EF]">
        <div className="w-8 h-8 rounded-full border-[3px] border-[#D9D6CE] border-t-[#15171C] animate-spin" aria-label="Cargando" />
      </div>
    );
  }
  if (!session) return null;

  const goto = (t: 'movements' | 'debts', filter?: string) => {
    if (t === 'movements') setMovementsFilter(filter === 'uncategorized' ? 'uncategorized' : 'all');
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  const openMonthPicker = () => {
    const el = monthInput.current;
    if (!el) return;
    // showPicker no existe en todos los navegadores
    try {
      (el as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
    } catch {
      el.focus();
    }
  };

  return (
    <div className={`${appFont.className} min-h-screen bg-[#F4F3EF] text-[#15171C] tabular-nums`}>
      <div className="max-w-xl mx-auto px-5 pt-5 pb-28">
        {tab !== 'debts' && (
          <div className="flex items-center justify-between mb-3">
            <div className="relative">
              <button onClick={openMonthPicker} className="flex items-center gap-1.5 py-2 text-xl font-bold" aria-label={`Mes: ${monthLabel(month)}. Cambiar mes`}>
                {monthLabel(month)}
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
              </button>
              <input
                ref={monthInput}
                type="month"
                value={month}
                max={currentMonth()}
                onChange={(e) => e.target.value && setMonth(e.target.value)}
                className="absolute inset-0 opacity-0 pointer-events-none"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
            {month !== currentMonth() && (
              <button onClick={() => setMonth(currentMonth())} className="text-sm font-semibold text-[#17694A] h-11 px-2">
                Volver a hoy
              </button>
            )}
          </div>
        )}

        {tab === 'home' && <HomeScreen month={month} onGoto={goto} />}
        {tab === 'movements' && (
          <MovementsScreen key={`${month}-${movementsFilter}`} month={month} initialFilter={movementsFilter} onAdd={() => setQuickAddOpen(true)} />
        )}
        {tab === 'debts' && <DebtsScreen />}
      </div>

      <nav aria-label="Navegación principal" className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#E4E2DC]">
        <div className="max-w-xl mx-auto grid grid-cols-4 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),12px)]">
          <NavItem label="Inicio" icon="home" active={tab === 'home'} onClick={() => setTab('home')} />
          <NavItem label="Movimientos" icon="movements" active={tab === 'movements'} onClick={() => goto('movements')} />
          <NavItem label="Deudas" icon="debts" active={tab === 'debts'} onClick={() => setTab('debts')} />
          <NavItem label="Ajustes" icon="settings" active={false} onClick={() => router.push('/configuracion')} />
        </div>
      </nav>

      <QuickAdd hideFab externalOpen={quickAddOpen} onExternalClose={() => setQuickAddOpen(false)} />
      <ConnectionStatus />
      <InstallPrompt />
    </div>
  );
}
