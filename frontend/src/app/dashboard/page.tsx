'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  PesaFlow Dashboard
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {loggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-white p-8 shadow dark:bg-zinc-900">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
              Welcome to your Dashboard
            </h2>

            <div className="space-y-4">
              <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Account Information
                </h3>
                <dl className="mt-2 space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Email
                    </dt>
                    <dd className="text-sm text-zinc-900 dark:text-zinc-50">
                      {user?.email}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Account Created
                    </dt>
                    <dd className="text-sm text-zinc-900 dark:text-zinc-50">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Two-Factor Authentication
                    </dt>
                    <dd className="text-sm text-zinc-900 dark:text-zinc-50">
                      {user?.otp_enabled ? (
                        <span className="text-green-600 dark:text-green-400">Enabled</span>
                      ) : (
                        <span className="text-zinc-600 dark:text-zinc-400">Disabled</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                  Quick Actions
                </h3>
                <div className="flex gap-4">
                  <a
                    href="/system-status"
                    className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    System Status →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}

