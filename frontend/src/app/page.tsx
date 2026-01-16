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
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
    </div>
  );
}
