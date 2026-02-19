'use client';

import { getStatusColor, cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  type?: 'subscription' | 'invoice' | 'refund' | 'payment' | 'system';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StatusBadge({ status, type = 'subscription', size = 'sm', className = '' }: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-[0.7rem]',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm',
  };

  const colorClass = getStatusColor(status, type);
  const baseClasses = 'inline-flex items-center rounded-full border font-semibold uppercase tracking-[0.08em]';
  const label = status.replace(/_/g, ' ');
  
  return (
    <span className={cn(baseClasses, sizeClasses[size], colorClass, className)}>
      {label}
    </span>
  );
}
