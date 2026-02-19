'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import { LandingPage } from '@/components';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (isAuthenticated) {
      if (pathname !== '/dashboard') {
        router.replace('/dashboard');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, loading, pathname]);

  // Show landing page for unauthenticated users
  if (!isAuthenticated && !loading) {
    return <LandingPage />;
  }

  // Show loading state while checking authentication
  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4">
      <div className="app-card flex items-center gap-3 px-6 py-4 text-sm text-slate-600">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
        Loading...
      </div>
    </div>
  );
}
