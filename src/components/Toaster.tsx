'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { setGlobalToast, type Toast, type ToastType } from '@/hooks/use-toast';
import { CheckCircle, XCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

interface ConfirmState {
  message: string;
  onConfirm: () => void;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  showConfirm: (message: string, onConfirm: () => void) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useGlobalToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useGlobalToast must be used within ToastProvider');
  return ctx;
}

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const COLORS = {
  success: 'bg-green-50 border-green-400 text-green-800',
  error: 'bg-red-50 border-red-400 text-red-800',
  warning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
  info: 'bg-blue-50 border-blue-400 text-blue-800',
};

const ICON_COLORS = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showConfirm = useCallback((message: string, onConfirm: () => void) => {
    setConfirm({ message, onConfirm });
  }, []);

  const handleConfirm = () => {
    confirm?.onConfirm();
    setConfirm(null);
  };

  // Register global toast function for non-context usage
  useEffect(() => {
    setGlobalToast(toast);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toast, showConfirm }}>
      {children}

      {/* Confirm Dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirm(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-start gap-4 mb-5">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Confirmar acción</h3>
                <p className="text-sm text-gray-600">{confirm.message}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg pointer-events-auto ${COLORS[t.type]}`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${ICON_COLORS[t.type]}`} />
              <p className="flex-1 text-sm font-medium">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
