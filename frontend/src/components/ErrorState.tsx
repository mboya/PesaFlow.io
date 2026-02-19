'use client';

interface ErrorStateProps {
  message: string;
  className?: string;
  onDismiss?: () => void;
}

export function ErrorState({ message, className = '', onDismiss }: ErrorStateProps) {
  return (
    <div className={`app-alert-error ${className}`}>
      <div className="flex items-center justify-between">
        <p>{message}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 text-red-600 transition hover:text-red-800"
            aria-label="Dismiss error"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
