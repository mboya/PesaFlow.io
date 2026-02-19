'use client';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading...', className = '' }: LoadingStateProps) {
  return (
    <div className={`app-card p-8 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
        <p className="text-sm text-slate-600">{message}</p>
      </div>
    </div>
  );
}
