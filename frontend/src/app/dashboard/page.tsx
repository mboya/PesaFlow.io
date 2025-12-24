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
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur opacity-50"></div>
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Dashboard
                  </h1>
                  <p className="mt-1 text-base text-zinc-600 dark:text-zinc-400">
                    Overview of your subscriptions and account
                  </p>
                </div>
              </div>
            </div>
          </div>

          {loading && (
            <div className="rounded-2xl bg-gradient-to-br from-white to-blue-50/50 p-8 shadow-lg dark:from-zinc-900 dark:to-blue-950/30 border border-zinc-200/50 dark:border-zinc-800/50">
              <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
            </div>
          )}

          {error && (
            <div className="rounded-2xl bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 p-4 dark:from-red-900/20 dark:to-pink-900/20 dark:border-red-800">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {dashboardData && !loading && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-blue-50/50 p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:from-zinc-900 dark:to-blue-950/30 border border-zinc-200/50 dark:border-zinc-800/50">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-green-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-green-500/5 transition-all duration-300"></div>
                  <div className="relative">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-md">
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Active Subscriptions
                      </h3>
                    </div>
                    <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                      {dashboardData.active_subscriptions.length}
                    </p>
                  </div>
                </div>
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-purple-50/50 p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:from-zinc-900 dark:to-purple-950/30 border border-zinc-200/50 dark:border-zinc-800/50">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-green-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-green-500/5 transition-all duration-300"></div>
                  <div className="relative">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 shadow-md">
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Total Outstanding
                      </h3>
                    </div>
                    <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(dashboardData.total_outstanding)}
                    </p>
                  </div>
                </div>
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-green-50/50 p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:from-zinc-900 dark:to-green-950/30 border border-zinc-200/50 dark:border-zinc-800/50">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-green-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-green-500/5 transition-all duration-300"></div>
                  <div className="relative">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 shadow-md">
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Account Status
                      </h3>
                    </div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      {dashboardData.customer.status.charAt(0).toUpperCase() + dashboardData.customer.status.slice(1)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Subscriptions */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-indigo-50/50 shadow-lg dark:from-zinc-900 dark:to-indigo-950/30 border border-zinc-200/50 dark:border-zinc-800/50">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] opacity-40"></div>
                <div className="relative border-b border-zinc-200/50 px-6 py-4 dark:border-zinc-800/50">
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
                <div className="relative p-6">
                  {dashboardData.active_subscriptions.length === 0 ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      No active subscriptions. <Link href="/subscriptions/new" className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">Create one</Link>
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {dashboardData.active_subscriptions.map((subscription: Subscription) => (
                        <div
                          key={subscription.id}
                          className="group rounded-xl border border-zinc-200/50 bg-white/50 p-4 transition-all duration-300 hover:border-blue-300 hover:shadow-md dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:hover:border-blue-700"
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
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-cyan-50/50 shadow-lg dark:from-zinc-900 dark:to-cyan-950/30 border border-zinc-200/50 dark:border-zinc-800/50">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] opacity-40"></div>
                <div className="relative border-b border-zinc-200/50 px-6 py-4 dark:border-zinc-800/50">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    Recent Payments
                  </h2>
                </div>
                <div className="relative p-6">
                  {dashboardData.recent_payments.length === 0 ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">No recent payments</p>
                  ) : (
                    <div className="space-y-4">
                      {dashboardData.recent_payments.map((payment: Payment) => (
                        <div
                          key={payment.id}
                          className="group flex items-center justify-between rounded-xl border border-zinc-200/50 bg-white/50 p-4 transition-all duration-300 hover:border-green-300 hover:shadow-md dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:hover:border-green-700"
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
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-amber-50/50 shadow-lg dark:from-zinc-900 dark:to-amber-950/30 border border-zinc-200/50 dark:border-zinc-800/50">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] opacity-40"></div>
                  <div className="relative border-b border-zinc-200/50 px-6 py-4 dark:border-zinc-800/50">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      Upcoming Billing (Next 7 Days)
                    </h2>
                  </div>
                  <div className="relative p-6">
                    <div className="space-y-4">
                      {dashboardData.upcoming_billing.map((subscription: Subscription) => (
                        <div
                          key={subscription.id}
                          className="group rounded-xl border border-zinc-200/50 bg-white/50 p-4 transition-all duration-300 hover:border-amber-300 hover:shadow-md dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:hover:border-amber-700"
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

