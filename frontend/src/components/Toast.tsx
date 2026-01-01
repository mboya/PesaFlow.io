'use client';

import React, { useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Toast as ToastType, ToastVariant } from '@/contexts/ToastContext';

interface ToastProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

const variantStyles: Record<ToastVariant, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-green-50 border-green-200',
    border: 'border-green-300',
    text: 'text-green-800',
    icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
  },
  error: {
    bg: 'bg-red-50 border-red-200',
    border: 'border-red-300',
    text: 'text-red-800',
    icon: <AlertCircle className="h-5 w-5 text-red-600" />,
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200',
    border: 'border-amber-300',
    text: 'text-amber-800',
    icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
  },
  info: {
    bg: 'bg-blue-50 border-blue-200',
    border: 'border-blue-300',
    text: 'text-blue-800',
    icon: <Info className="h-5 w-5 text-blue-600" />,
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
        relative flex items-start gap-3 rounded-lg border p-4 shadow-lg
        ${styles.bg} ${styles.border} ${styles.text}
        animate-slide-in-right
      `}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">{styles.icon}</div>
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
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
