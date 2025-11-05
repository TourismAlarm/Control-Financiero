'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { syncQueue } from '@/lib/offline/syncQueue';

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Estado inicial
    setIsOnline(navigator.onLine);

    // Listeners para cambios de conexión
    const handleOnline = async () => {
      setIsOnline(true);
      setShowBanner(true);

      // Procesar cola de sincronización
      await syncQueue.processQueue();

      // Actualizar contador de pendientes
      const count = await syncQueue.getPendingCount();
      setPendingSync(count);

      // Ocultar banner después de 5 segundos
      setTimeout(() => setShowBanner(false), 5000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar pendientes al montar
    const checkPending = async () => {
      const count = await syncQueue.getPendingCount();
      setPendingSync(count);
    };
    checkPending();

    // Verificar pendientes cada 30 segundos
    const interval = setInterval(checkPending, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    if (isOnline) {
      await syncQueue.processQueue();
      const count = await syncQueue.getPendingCount();
      setPendingSync(count);
    }
  };

  if (!showBanner && isOnline && pendingSync === 0) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 transition-all ${
        showBanner ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
          isOnline
            ? 'bg-green-100 border border-green-300 text-green-800'
            : 'bg-red-100 border border-red-300 text-red-800'
        }`}
      >
        {isOnline ? (
          <Wifi className="w-5 h-5" />
        ) : (
          <WifiOff className="w-5 h-5" />
        )}

        <div>
          <p className="font-medium text-sm">
            {isOnline ? 'Conexión restaurada' : 'Sin conexión'}
          </p>
          {pendingSync > 0 && (
            <p className="text-xs mt-0.5">
              {pendingSync} {pendingSync === 1 ? 'cambio pendiente' : 'cambios pendientes'}
            </p>
          )}
        </div>

        {isOnline && pendingSync > 0 && (
          <button
            onClick={handleManualSync}
            className="ml-2 p-1.5 hover:bg-green-200 rounded transition-colors"
            title="Sincronizar ahora"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => setShowBanner(false)}
          className="ml-2 text-lg leading-none hover:opacity-70"
        >
          ×
        </button>
      </div>
    </div>
  );
}
