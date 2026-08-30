'use client';

import { useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
}

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'Ya',
  cancelLabel = 'Batal',
  variant = 'default',
}: ConfirmDialogProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    },
    [onCancel]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-ivory p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-dialog-title" className="font-serif text-xl font-medium text-espresso">{title}</h3>
        <p id="confirm-dialog-message" className="mt-2 text-sm text-warmgray">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-[10px] border border-line px-4 py-2 text-sm font-medium text-espresso transition-colors hover:bg-sand"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              'rounded-[10px] px-4 py-2 text-sm font-medium text-white transition-colors',
              variant === 'danger'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-primary-600 hover:bg-primary-700'
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
