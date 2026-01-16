'use client';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading...', className = '' }: LoadingStateProps) {
  return (
    <div className={`rounded-lg bg-white p-8 shadow dark:bg-zinc-900 ${className}`}>
      <p className="text-zinc-600 dark:text-zinc-400">{message}</p>
    </div>
  );
}
