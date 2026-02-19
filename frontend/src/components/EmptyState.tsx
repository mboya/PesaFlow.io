'use client';

import { ReactNode } from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function EmptyState({ 
  message, 
  actionLabel, 
  actionHref, 
  onAction,
  icon 
}: EmptyStateProps) {
  const actionButton = actionLabel && (actionHref || onAction) && (
    actionHref ? (
      <Link
        href={actionHref}
        className="app-btn-primary"
      >
        {actionLabel}
      </Link>
    ) : (
      <button
        onClick={onAction}
        className="app-btn-primary"
      >
        {actionLabel}
      </button>
    )
  );

  return (
    <div className="p-8 text-center">
      {icon && <div className="mb-4 flex justify-center text-teal-600">{icon}</div>}
      <p className="mb-4 text-sm text-slate-600">{message}</p>
      {actionButton}
    </div>
  );
}
