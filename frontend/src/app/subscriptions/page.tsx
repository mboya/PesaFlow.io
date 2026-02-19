'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
import { formatCurrency, formatDate, getApiErrorMessage } from '@/lib/utils';
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
      } catch (error: unknown) {
        setError(getApiErrorMessage(error, 'Failed to load subscriptions'));
        console.error('Subscriptions error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  const formatPaymentMethod = (method: string | null | undefined) => {
    if (!method) return 'Not set';
    const methodMap: Record<string, string> = {
      ratiba: 'Ratiba',
      stk_push: 'STK Push',
      c2b: 'Paybill',
    };
    return methodMap[method] || method.toUpperCase();
  };

  return (
    <AuthGuard>
      <div className="app-shell">
        <BackgroundDecorations />
        <Navigation />

        <main className="app-main relative">
          <PageHeader
            title="Subscriptions"
            description="Manage recurring billing plans and customer renewals."
            action={
              <Link href="/subscriptions/new" className="app-btn-primary">
                New Subscription
              </Link>
            }
          />

          {loading && <LoadingState message="Loading subscriptions..." />}

          {error && <ErrorState message={error} onDismiss={() => setError(null)} />}

          {!loading && !error && (
            <div className="app-card">
              {subscriptions.length === 0 ? (
                <EmptyState
                  message="You don't have any subscriptions yet."
                  actionLabel="Create Subscription"
                  actionHref="/subscriptions/new"
                />
              ) : (
                <div className="app-table-shell">
                  <table className="app-table">
                    <thead className="app-table-head">
                      <tr>
                        <th className="app-table-head-cell">Subscription</th>
                        <th className="app-table-head-cell">Status</th>
                        <th className="app-table-head-cell">Amount</th>
                        <th className="app-table-head-cell">Next Billing</th>
                        <th className="app-table-head-cell">Payment Method</th>
                        <th className="app-table-head-cell text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="app-table-body">
                      {subscriptions.map((subscription) => (
                        <tr key={subscription.id} className="app-table-row">
                          <td className="app-table-cell">
                            <div>
                              <div className="font-medium text-slate-900">
                                {subscription.name || subscription.reference_number}
                              </div>
                              <div className="text-xs text-slate-500">{subscription.reference_number}</div>
                            </div>
                          </td>
                          <td className="app-table-cell">
                            <StatusBadge status={subscription.status} type="subscription" />
                          </td>
                          <td className="app-table-cell">
                            <span className="font-medium text-slate-900">{formatCurrency(subscription.amount || 0)}</span>
                            {subscription.billing_cycle_days && (
                              <span className="ml-1 text-xs text-slate-500">/ every {subscription.billing_cycle_days} days</span>
                            )}
                          </td>
                          <td className="app-table-cell">
                            {subscription.next_billing_date ? formatDate(subscription.next_billing_date) : 'N/A'}
                          </td>
                          <td className="app-table-cell">
                            {formatPaymentMethod(subscription.preferred_payment_method || subscription.payment_method)}
                          </td>
                          <td className="app-table-cell text-right">
                            <Link href={`/subscriptions/${subscription.id}`} className="app-link">
                              View
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
