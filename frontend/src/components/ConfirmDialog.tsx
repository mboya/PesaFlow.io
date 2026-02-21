'use client';

import { useEffect } from 'react';

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  const confirmButtonClass = confirmVariant === 'danger' ? 'app-btn-danger' : 'app-btn-primary';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      onClick={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onCancel();
        }
      }}
    >
      <div className="app-card w-full max-w-md">
        <div className="app-card-header">
          <h2 id="confirm-dialog-title" className="app-section-title">
            {title}
          </h2>
        </div>

        <div className="app-card-body">
          <p id="confirm-dialog-description" className="text-sm text-slate-600">
            {description}
          </p>

          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onCancel} disabled={loading} className="app-btn-secondary">
              {cancelLabel}
            </button>
            <button onClick={onConfirm} disabled={loading} className={confirmButtonClass}>
              {loading ? 'Please wait...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
