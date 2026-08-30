'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const success = useCallback((msg: string) => addToast(msg, 'success'), [addToast]);
  const error = useCallback((msg: string) => addToast(msg, 'error'), [addToast]);
  const info = useCallback((msg: string) => addToast(msg, 'info'), [addToast]);

  return { toasts, addToast, success, error, info };
}

export function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2" role="status" aria-live="polite" aria-label="Notifikasi">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
          className={cn(
            'animate-in slide-in-from-right-5 rounded-[10px] px-4 py-3 text-sm font-medium text-white shadow-card',
            toast.type === 'success' && 'bg-green-600',
            toast.type === 'error' && 'bg-red-500',
            toast.type === 'info' && 'bg-espresso'
          )}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
