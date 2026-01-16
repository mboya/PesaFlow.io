'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Repeat } from 'lucide-react';

import {
  AuthGuard,
  Navigation,
  StatusBadge,
  PageHeader,
  BackgroundDecorations,
  LoadingState,
  ErrorState,
  EmptyState,
} from '@/components';
import { subscriptionsApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Subscription } from '@/lib/types';

export default function SubscriptionsPage() {
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

  const formatPaymentMethod = (method: string | null | undefined) => {
    if (!method) return 'Not set';
    const methodMap: Record<string, string> = {
      'ratiba': 'Ratiba',
      'stk_push': 'STK Push',
      'c2b': 'Paybill',
    };
    return methodMap[method] || method.toUpperCase();
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white relative">
        <BackgroundDecorations />
        <Navigation />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 relative">
          <PageHeader
            title="Subscriptions"
            description="Manage your recurring payments and subscriptions"
            icon={Repeat}
            iconGradient="from-blue-500 to-purple-500"
            action={
              <Link
                href="/subscriptions/new"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                New Subscription
              </Link>
            }
          />

          {loading && <LoadingState message="Loading subscriptions..." />}

          {error && <ErrorState message={error} onDismiss={() => setError(null)} />}

          {!loading && !error && (
            <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
              {subscriptions.length === 0 ? (
                <EmptyState
                  message="You don't have any subscriptions yet."
                  actionLabel="Create Subscription"
                  actionHref="/subscriptions/new"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
                    <thead className="bg-white/50 dark:bg-zinc-900/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                          Subscription
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                          Next Billing
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                          Payment Method
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
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
                            <StatusBadge status={subscription.status} type="subscription" />
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
                              className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
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

