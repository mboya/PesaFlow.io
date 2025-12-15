'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { Navigation } from '@/components/Navigation';
import { dashboardApi } from '@/lib/api';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DashboardData, Subscription, Payment } from '@/lib/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await dashboardApi.getData();
        setDashboardData(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load dashboard data');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
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

  return (
    <AuthGuard>
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <Navigation />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Overview of your subscriptions and account
            </p>
          </div>

          {loading && (
            <div className="rounded-lg bg-white p-8 shadow dark:bg-zinc-900">
              <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 dark:bg-red-900/20 dark:border-red-800">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {dashboardData && !loading && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="rounded-lg bg-white p-6 shadow dark:bg-zinc-900">
                  <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Active Subscriptions
                  </h3>
                  <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                    {dashboardData.active_subscriptions.length}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-6 shadow dark:bg-zinc-900">
                  <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Total Outstanding
                  </h3>
                  <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                    {formatCurrency(dashboardData.total_outstanding)}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-6 shadow dark:bg-zinc-900">
                  <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Account Status
                  </h3>
                  <p className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
                    {dashboardData.customer.status.charAt(0).toUpperCase() + dashboardData.customer.status.slice(1)}
                  </p>
                </div>
              </div>

              {/* Active Subscriptions */}
              <div className="rounded-lg bg-white shadow dark:bg-zinc-900">
                <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      Active Subscriptions
                    </h2>
                    <Link
                      href="/subscriptions"
                      className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                      View all →
                    </Link>
                  </div>
                </div>
                <div className="p-6">
                  {dashboardData.active_subscriptions.length === 0 ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      No active subscriptions. <Link href="/plans" className="text-blue-600 hover:underline">Browse plans</Link>
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {dashboardData.active_subscriptions.map((subscription: Subscription) => (
                        <div
                          key={subscription.id}
                          className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                                {subscription.plan?.name || 'Plan'}
                              </h3>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {subscription.reference_number} • {subscription.billing_frequency}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                                {formatCurrency(subscription.plan?.amount || 0)}
                              </p>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                Next billing: {subscription.next_billing_date ? formatDate(subscription.next_billing_date) : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Payments */}
              <div className="rounded-lg bg-white shadow dark:bg-zinc-900">
                <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    Recent Payments
                  </h2>
                </div>
                <div className="p-6">
                  {dashboardData.recent_payments.length === 0 ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">No recent payments</p>
                  ) : (
                    <div className="space-y-4">
                      {dashboardData.recent_payments.map((payment: Payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between rounded-md border border-zinc-200 p-4 dark:border-zinc-800"
                        >
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-zinc-50">
                              {payment.subscription?.plan?.name || 'Payment'}
                            </p>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              {payment.paid_at ? formatDate(payment.paid_at) : 'Pending'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-zinc-900 dark:text-zinc-50">
                              {formatCurrency(payment.amount, payment.currency)}
                            </p>
                            <p className={`text-sm ${
                              payment.status === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-zinc-600 dark:text-zinc-400'
                            }`}>
                              {payment.status}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Upcoming Billing */}
              {dashboardData.upcoming_billing.length > 0 && (
                <div className="rounded-lg bg-white shadow dark:bg-zinc-900">
                  <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      Upcoming Billing (Next 7 Days)
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {dashboardData.upcoming_billing.map((subscription: Subscription) => (
                        <div
                          key={subscription.id}
                          className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                                {subscription.plan?.name || 'Plan'}
                              </h3>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {subscription.reference_number}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                                {formatCurrency(subscription.plan?.amount || 0)}
                              </p>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {subscription.next_billing_date ? formatDate(subscription.next_billing_date) : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}

