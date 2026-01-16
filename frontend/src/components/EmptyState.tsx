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
        className="inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
      >
        {actionLabel}
      </Link>
    ) : (
      <button
        onClick={onAction}
        className="inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
      >
        {actionLabel}
      </button>
    )
  );

  return (
    <div className="p-8 text-center">
      {icon && <div className="mb-4 flex justify-center">{icon}</div>}
      <p className="text-zinc-600 dark:text-zinc-400 mb-4">{message}</p>
      {actionButton}
    </div>
  );
}
