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
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const colorClass = getStatusColor(status, type);
  const baseClasses = 'inline-flex rounded-full font-semibold';
  
  return (
    <span className={cn(baseClasses, sizeClasses[size], colorClass, className)}>
      {status}
    </span>
  );
}
