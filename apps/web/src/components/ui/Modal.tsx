'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, children, className }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        role="dialog"
        aria-modal="true"
      >
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          className={cn(
            'relative z-50 w-full max-w-md rounded-2xl border border-line bg-ivory p-6 shadow-card',
            className
          )}
        >
          {children}
        </div>
      </div>
  );
}

interface ModalHeaderProps {
  title: string;
  onClose?: () => void;
}

export function ModalHeader({ title, onClose }: ModalHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-serif text-xl font-medium text-espresso">{title}</h2>
      {onClose && (
        <button
          onClick={onClose}
          className="text-warmgray transition-colors hover:text-espresso"
          aria-label="Tutup"
        >
          ✕
        </button>
      )}
    </div>
  );
}
