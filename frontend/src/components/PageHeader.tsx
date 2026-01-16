'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconGradient?: string; // e.g., "from-blue-500 to-purple-500"
  action?: ReactNode;
}

export function PageHeader({ 
  title, 
  description, 
  icon: Icon, 
  iconGradient = 'from-blue-500 to-purple-500',
  action 
}: PageHeaderProps) {
  return (
    <div className="mb-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {Icon && (
          <div className="relative">
            <div className={`absolute inset-0 bg-gradient-to-br ${iconGradient} rounded-xl blur opacity-50`}></div>
            <div className={`relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${iconGradient} shadow-lg`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
