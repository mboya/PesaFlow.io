'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { Navigation } from '@/components/Navigation';
import { subscriptionsApi } from '@/lib/api';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Subscription } from '@/lib/types';

export default function SubscriptionsPage() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        setLoading(true);
        const response = await subscriptionsApi.getAll();
        setSubscriptions(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load subscriptions');
        console.error('Subscriptions error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  const formatCurrency = (amount: number, currency: string = 'KES') => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPaymentMethod = (method: string | null | undefined) => {
    if (!method) return 'Not set';
    const methodMap: Record<string, string> = {
      'ratiba': 'Ratiba',
      'stk_push': 'STK Push',
      'c2b': 'Paybill',
    };
    return methodMap[method] || method.toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'trial':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/20 dark:text-zinc-400';
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-blue-50/30 to-purple-50/30 dark:from-zinc-950 dark:via-blue-950/30 dark:to-purple-950/30">
        <Navigation />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="relative mb-12 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950 dark:via-purple-950 dark:to-pink-950 py-12 sm:py-16">
            {/* Animated background shapes */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-10 left-10 w-48 h-48 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-10 right-10 w-64 h-64 bg-gradient-to-tl from-pink-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>
            
            <div className="relative z-10 px-6 sm:px-8">
              <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur opacity-50"></div>
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                      Subscriptions
                    </h1>
                    <p className="mt-1 text-base text-zinc-600 dark:text-zinc-400">
                      Manage your recurring payments and subscriptions
                    </p>
                  </div>
                </div>
                <Link
                  href="/subscriptions/new"
                  className="rounded-md bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
                >
                  New Subscription
                </Link>
              </div>
            </div>
          </div>

          {loading && (
            <div className="rounded-2xl bg-gradient-to-br from-white to-blue-50/50 p-8 shadow-lg dark:from-zinc-900 dark:to-blue-950/30 border border-zinc-200/50 dark:border-zinc-800/50">
              <p className="text-zinc-600 dark:text-zinc-400">Loading subscriptions...</p>
            </div>
          )}

          {error && (
            <div className="rounded-2xl bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 p-4 dark:from-red-900/20 dark:to-pink-900/20 dark:border-red-800">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-indigo-50/50 shadow-lg dark:from-zinc-900 dark:to-indigo-950/30 border border-zinc-200/50 dark:border-zinc-800/50">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] opacity-40"></div>
              {subscriptions.length === 0 ? (
                <div className="relative p-12 text-center">
                  <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-lg">
                    You don't have any subscriptions yet.
                  </p>
                  <Link
                    href="/subscriptions/new"
                    className="inline-block rounded-md bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
                  >
                    Create Subscription
                  </Link>
                </div>
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
                    <thead className="bg-gradient-to-r from-zinc-50/80 to-blue-50/50 dark:from-zinc-900/80 dark:to-blue-950/30">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                          Subscription
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                          Amount
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                          Next Billing
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                          Payment Method
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/50 bg-white/50 dark:divide-zinc-800/50 dark:bg-zinc-900/50">
                      {subscriptions.map((subscription) => (
                        <tr key={subscription.id} className="transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-950/20">
                          <td className="whitespace-nowrap px-6 py-4">
                            <div>
                              <div className="font-medium text-zinc-900 dark:text-zinc-50">
                                {subscription.name || subscription.reference_number}
                              </div>
                              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                                {subscription.reference_number}
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(subscription.status)}`}>
                              {subscription.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50">
                            {formatCurrency(subscription.amount || 0)}
                            {subscription.billing_cycle_days && (
                              <span className="text-zinc-500 dark:text-zinc-400">
                                {' '}
                                / every {subscription.billing_cycle_days} days
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50">
                            {subscription.next_billing_date ? formatDate(subscription.next_billing_date) : 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                            {formatPaymentMethod(subscription.preferred_payment_method || subscription.payment_method)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                            <Link
                              href={`/subscriptions/${subscription.id}`}
                              className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            >
                              View →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}

