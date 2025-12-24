'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { Navigation } from '@/components/Navigation';
import { dashboardApi } from '@/lib/api';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DashboardData, Subscription, Payment } from '@/lib/types';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth to finish loading before fetching dashboard data
    if (authLoading) {
      return;
    }

    // Only fetch if user is authenticated
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await dashboardApi.getData();
        setDashboardData(response.data);
      } catch (err: any) {
        // Extract error message from response
        let errorMessage = 'Failed to load dashboard data';
        const status = err.response?.status;
        const data = err.response?.data;
        
        if (status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (status === 403) {
          errorMessage = 'Access forbidden. You may not have permission to view this data.';
        } else if (status === 404) {
          errorMessage = 'Customer not found. Please contact support.';
        } else if (data) {
          errorMessage = typeof data === 'string' 
            ? data 
            : data.error || data.message || data.status?.message || errorMessage;
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, authLoading]);

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
      <div className="min-h-screen bg-white dark:bg-black relative">
        {/* Subtle background decorative elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-zinc-200/10 to-transparent rounded-full blur-3xl dark:from-zinc-800/10"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-zinc-200/10 to-transparent rounded-full blur-3xl dark:from-zinc-800/10"></div>
        </div>
        
        <Navigation />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 relative">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Dashboard
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
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
                <div className="group relative overflow-hidden rounded-2xl bg-zinc-50 p-6 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 hover:shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-green-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-green-500/5 transition-all duration-300"></div>
                  <div className="relative">
                    <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                      Active Subscriptions
                    </h3>
                    <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                      {dashboardData.active_subscriptions.length}
                    </p>
                  </div>
                </div>
                <div className="group relative overflow-hidden rounded-2xl bg-zinc-50 p-6 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-300 hover:shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-green-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-green-500/5 transition-all duration-300"></div>
                  <div className="relative">
                    <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                      Total Outstanding
                    </h3>
                    <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(dashboardData.total_outstanding)}
                    </p>
                  </div>
                </div>
                <div className="group relative overflow-hidden rounded-2xl bg-zinc-50 p-6 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 hover:border-green-300 dark:hover:border-green-700 transition-all duration-300 hover:shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-green-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-green-500/5 transition-all duration-300"></div>
                  <div className="relative">
                    <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                      Account Status
                    </h3>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      {dashboardData.customer.status.charAt(0).toUpperCase() + dashboardData.customer.status.slice(1)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Subscriptions */}
              <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
                <div className="border-b border-zinc-200/50 px-6 py-4 dark:border-zinc-800/50">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      Active Subscriptions
                    </h2>
                    <Link
                      href="/subscriptions"
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    >
                      View all →
                    </Link>
                  </div>
                </div>
                <div className="p-6">
                  {dashboardData.active_subscriptions.length === 0 ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      No active subscriptions. <Link href="/subscriptions/new" className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">Create one</Link>
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {dashboardData.active_subscriptions.map((subscription: Subscription) => (
                        <div
                          key={subscription.id}
                          className="group rounded-xl border border-zinc-200/50 bg-white/50 p-4 dark:border-zinc-800/50 dark:bg-zinc-900/50 transition-all duration-200 hover:border-blue-300 hover:shadow-sm dark:hover:border-blue-700"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                                {subscription.name || subscription.reference_number}
                              </h3>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {subscription.reference_number}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                                {formatCurrency(subscription.amount || 0)}
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
              <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
                <div className="border-b border-zinc-200/50 px-6 py-4 dark:border-zinc-800/50">
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
                          className="group flex items-center justify-between rounded-xl border border-zinc-200/50 bg-white/50 p-4 dark:border-zinc-800/50 dark:bg-zinc-900/50 transition-all duration-200 hover:border-green-300 hover:shadow-sm dark:hover:border-green-700"
                        >
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-zinc-50">
                              {payment.subscription?.name || 'Payment'}
                            </p>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              {payment.paid_at ? formatDate(payment.paid_at) : 'Pending'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-zinc-900 dark:text-zinc-50">
                              {formatCurrency(payment.amount, payment.currency)}
                            </p>
                            <p className={`text-sm font-medium ${
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
                <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
                  <div className="border-b border-zinc-200/50 px-6 py-4 dark:border-zinc-800/50">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      Upcoming Billing (Next 7 Days)
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {dashboardData.upcoming_billing.map((subscription: Subscription) => (
                        <div
                          key={subscription.id}
                          className="group rounded-xl border border-zinc-200/50 bg-white/50 p-4 dark:border-zinc-800/50 dark:bg-zinc-900/50 transition-all duration-200 hover:border-amber-300 hover:shadow-sm dark:hover:border-amber-700"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                                {subscription.name || subscription.reference_number}
                              </h3>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {subscription.reference_number}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                                {formatCurrency(subscription.amount || 0)}
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

