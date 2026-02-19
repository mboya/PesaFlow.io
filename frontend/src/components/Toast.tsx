'use client';

import React, { useEffect } from 'react';
import { Toast as ToastType, ToastVariant } from '@/contexts/ToastContext';

interface ToastProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

const variantStyles: Record<ToastVariant, { bg: string; border: string; text: string }> = {
  success: {
    bg: 'bg-emerald-50/95',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
  },
  error: {
    bg: 'bg-red-50/95',
    border: 'border-red-300',
    text: 'text-red-800',
  },
  warning: {
    bg: 'bg-amber-50/95',
    border: 'border-amber-300',
    text: 'text-amber-800',
  },
  info: {
    bg: 'bg-cyan-50/95',
    border: 'border-cyan-300',
    text: 'text-cyan-900',
  },
};

export function Toast({ toast, onRemove }: ToastProps) {
  const styles = variantStyles[toast.variant];

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onRemove(toast.id);
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      className={`
        relative flex items-start gap-3 rounded-2xl border p-4 shadow-[0_18px_38px_-24px_rgba(15,23,42,.5)] backdrop-blur-sm
        ${styles.bg} ${styles.border} ${styles.text}
        animate-slide-in-right
      `}
      role="alert"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{toast.message}</p>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className={`
          flex-shrink-0 rounded-md p-1 transition-colors
          ${styles.text} hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-offset-2
        `}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}
