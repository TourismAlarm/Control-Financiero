'use client';

import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// Global singleton for toast outside React components
let globalToast: ((message: string, type?: ToastType) => void) | null = null;

export function setGlobalToast(fn: (message: string, type?: ToastType) => void) {
  globalToast = fn;
}

export function showToast(message: string, type: ToastType = 'info') {
  if (globalToast) {
    globalToast(message, type);
  }
}

// Local hook for components that need their own toast state
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

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

  return { toasts, toast, dismiss };
}
