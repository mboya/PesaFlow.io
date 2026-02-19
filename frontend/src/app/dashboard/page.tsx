'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import {
  AuthGuard,
  Navigation,
  BackgroundDecorations,
  LoadingState,
  ErrorState,
  PageHeader,
} from '@/components';
import {
  RevenueChart,
  PaymentSuccessChart,
  SubscriptionGrowthChart,
} from '@/components/charts';
import { dashboardApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { DashboardData, Subscription, Payment } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

type DashboardApiError = {
  response?: {
    status?: number;
    data?: unknown;
  };
  message?: string;
};

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="app-card p-5">
      <div className="mb-4">
        <span className="text-sm font-medium text-slate-600">{title}</span>
      </div>
      <p className="font-display text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
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
      } catch (error: unknown) {
        const err = error as DashboardApiError;
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
          if (typeof data === 'string') {
            errorMessage = data;
          } else if (typeof data === 'object' && data !== null) {
            const payload = data as {
              error?: string;
              message?: string;
              status?: { message?: string };
            };
            errorMessage = payload.error || payload.message || payload.status?.message || errorMessage;
          }
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

  return (
    <AuthGuard>
      <div className="app-shell">
        <BackgroundDecorations />
        <Navigation />

        <main className="app-main relative">
          <PageHeader
            title="Dashboard"
            description="Monitor collections, renewals, and account performance at a glance."
          />

          {loading && <LoadingState />}
          {error && <ErrorState message={error} onDismiss={() => setError(null)} />}

          {dashboardData && !loading && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <SummaryCard
                  title="Active Subscriptions"
                  value={String(dashboardData.active_subscriptions.length)}
                />
                <SummaryCard
                  title="Total Outstanding"
                  value={formatCurrency(dashboardData.total_outstanding)}
                />
                <SummaryCard
                  title="Account Status"
                  value={dashboardData.customer.status.charAt(0).toUpperCase() + dashboardData.customer.status.slice(1)}
                />
              </div>

              {dashboardData.analytics && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="app-card p-4">
                      <div className="mb-2 text-sm text-slate-600">Monthly Recurring Revenue</div>
                      <p className="font-display text-2xl font-semibold text-slate-900">
                        {formatCurrency(dashboardData.analytics.mrr)}
                      </p>
                    </div>
                    <div className="app-card p-4">
                      <div className="mb-2 text-sm text-slate-600">Total Revenue</div>
                      <p className="font-display text-2xl font-semibold text-slate-900">
                        {formatCurrency(dashboardData.analytics.total_revenue)}
                      </p>
                    </div>
                    <div className="app-card p-4">
                      <div className="mb-2 text-sm text-slate-600">Payment Success Rate</div>
                      <p className="font-display text-2xl font-semibold text-slate-900">
                        {dashboardData.analytics.payment_success_rate}%
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <div className="app-card p-6">
                      <h3 className="mb-4 font-display text-base font-semibold text-slate-900">
                        Revenue Trends (Last 14 Days)
                      </h3>
                      <RevenueChart data={dashboardData.analytics.revenue_trends} />
                    </div>

                    <div className="app-card p-6">
                      <h3 className="mb-4 font-display text-base font-semibold text-slate-900">Payment Status</h3>
                      <PaymentSuccessChart
                        successRate={dashboardData.analytics.payment_success_rate}
                        stats={dashboardData.analytics.payment_stats}
                      />
                    </div>

                    <div className="app-card p-6 xl:col-span-2">
                      <h3 className="mb-4 font-display text-base font-semibold text-slate-900">
                        Subscription Growth (Last 14 Days)
                      </h3>
                      <SubscriptionGrowthChart data={dashboardData.analytics.subscription_growth} />
                    </div>
                  </div>
                </div>
              )}

              <div className="app-card">
                <div className="app-card-header">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="app-section-title">Active Subscriptions</h2>
                    <Link href="/subscriptions" className="app-link">
                      View all
                    </Link>
                  </div>
                </div>
                <div className="app-card-body">
                  {dashboardData.active_subscriptions.length === 0 ? (
                    <p className="text-sm text-slate-600">
                      No active subscriptions.{' '}
                      <Link href="/subscriptions/new" className="app-link">
                        Create one
                      </Link>
                      .
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {dashboardData.active_subscriptions.map((subscription: Subscription) => (
                        <div key={subscription.id} className="rounded-xl border border-slate-200 bg-white/70 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h3 className="font-medium text-slate-900">
                                {subscription.name || subscription.reference_number}
                              </h3>
                              <p className="text-sm text-slate-500">{subscription.reference_number}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-slate-900">{formatCurrency(subscription.amount || 0)}</p>
                              <p className="text-sm text-slate-500">
                                Next billing:{' '}
                                {subscription.next_billing_date ? formatDate(subscription.next_billing_date) : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="app-card">
                <div className="app-card-header">
                  <h2 className="app-section-title">Recent Payments</h2>
                </div>
                <div className="app-card-body">
                  {dashboardData.recent_payments.length === 0 ? (
                    <p className="text-sm text-slate-600">No recent payments.</p>
                  ) : (
                    <div className="space-y-3">
                      {dashboardData.recent_payments.map((payment: Payment) => (
                        <div key={payment.id} className="rounded-xl border border-slate-200 bg-white/70 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-slate-900">{payment.subscription?.name || 'Payment'}</p>
                              <p className="text-sm text-slate-500">{payment.paid_at ? formatDate(payment.paid_at) : 'Pending'}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-slate-900">{formatCurrency(payment.amount, payment.currency)}</p>
                              <p className={`text-sm font-semibold ${payment.status === 'completed' ? 'text-emerald-700' : 'text-slate-500'}`}>
                                {payment.status}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {dashboardData.upcoming_billing.length > 0 && (
                <div className="app-card">
                  <div className="app-card-header">
                    <h2 className="app-section-title">Upcoming Billing (Next 7 Days)</h2>
                  </div>
                  <div className="app-card-body">
                    <div className="space-y-3">
                      {dashboardData.upcoming_billing.map((subscription: Subscription) => (
                        <div key={subscription.id} className="rounded-xl border border-slate-200 bg-white/70 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h3 className="font-medium text-slate-900">
                                {subscription.name || subscription.reference_number}
                              </h3>
                              <p className="text-sm text-slate-500">{subscription.reference_number}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-slate-900">{formatCurrency(subscription.amount || 0)}</p>
                              <p className="text-sm text-slate-500">
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
