'use client';

interface ErrorStateProps {
  message: string;
  className?: string;
  onDismiss?: () => void;
}

export function ErrorState({ message, className = '', onDismiss }: ErrorStateProps) {
  return (
    <div className={`rounded-lg bg-red-50 border border-red-200 p-4 dark:bg-red-900/20 dark:border-red-800 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-red-800 dark:text-red-200">{message}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
            aria-label="Dismiss error"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
