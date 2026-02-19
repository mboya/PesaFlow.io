'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export function Navigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/subscriptions', label: 'Subscriptions' },
    { href: '/payment-methods', label: 'Payments' },
    { href: '/invoices', label: 'Invoices' },
    { href: '/refunds', label: 'Refunds' },
    { href: '/settings', label: 'Settings' },
  ];

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

  const isActive = (path: string) =>
    pathname === path || (path !== '/dashboard' && pathname.startsWith(`${path}/`));

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-4 py-2">
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="min-w-0">
                <p className="font-display text-base font-semibold text-slate-900">PesaFlow</p>
                <p className="truncate text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Billing Workspace
                </p>
              </div>
            </Link>

            <div className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                    isActive(item.href)
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {process.env.NODE_ENV === 'development' && (
              <a
                href="http://localhost:8025"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 sm:inline-flex"
                title="View sent emails (Mailpit)"
              >
                Mailpit
              </a>
            )}
            <span className="hidden max-w-[12rem] truncate rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 sm:block">
              {user?.email}
            </span>
            <button onClick={handleLogout} disabled={loggingOut} className="app-btn-secondary !px-4 !py-2 !text-xs sm:!text-sm">
              {loggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-3 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                isActive(item.href)
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
