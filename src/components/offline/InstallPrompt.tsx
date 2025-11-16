'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verificar si ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Verificar si el usuario ya rechazó la instalación
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      return;
    }

    // Listener para el evento beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Mostrar el prompt después de 30 segundos
      setTimeout(() => {
        setShowPrompt(true);
      }, 30000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listener para cuando se instala la app
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      logger.log('✅ Usuario aceptó la instalación');
    } else {
      logger.log('❌ Usuario rechazó la instalación');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4 animate-slide-up">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Download className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Instalar aplicación</h3>
              <p className="text-sm text-gray-600">Acceso rápido desde tu dispositivo</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
            <span>Funciona sin conexión</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
            <span>Acceso instantáneo</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
            <span>Sincronización automática</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleInstall}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
          >
            Instalar
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
