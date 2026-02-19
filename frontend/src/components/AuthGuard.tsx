'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = '/login' 
}: AuthGuardProps) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (requireAuth && !isAuthenticated) {
      // Only redirect if not already on the target page
      if (pathname !== redirectTo) {
        router.replace(redirectTo);
      }
    } else if (!requireAuth && isAuthenticated) {
      // Only redirect if not already on dashboard
      if (pathname !== '/dashboard') {
        router.replace('/dashboard');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, loading, requireAuth, redirectTo, pathname]);

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center px-4">
        <div className="app-card flex items-center gap-3 px-6 py-4 text-sm text-slate-600">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          Loading...
        </div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return null;
  }

  if (!requireAuth && isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
