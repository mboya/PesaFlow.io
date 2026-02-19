'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

import {
  AuthGuard,
  Navigation,
  StatusBadge,
  LoadingState,
  ErrorState,
  PageHeader,
  BackgroundDecorations,
} from '@/components';
import { useToast } from '@/contexts/ToastContext';
import { subscriptionsApi, paymentsApi } from '@/lib/api';
import { formatCurrency, formatDate, getApiErrorMessage } from '@/lib/utils';
import type { Subscription, Payment } from '@/lib/types';

export default function SubscriptionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const subscriptionId = params.id as string;
  const { success: showSuccess, error: showError } = useToast();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      const [subResponse, paymentsResponse] = await Promise.all([
        subscriptionsApi.getById(subscriptionId),
        paymentsApi.getBySubscription(subscriptionId).catch(() => ({ data: [] })),
      ]);
      setSubscription(subResponse.data);
      setPayments(paymentsResponse.data);
      setError(null);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Failed to load subscription'));
      console.error('Subscription error:', error);
    } finally {
      setLoading(false);
    }
  }, [subscriptionId]);

  useEffect(() => {
    if (subscriptionId) {
      fetchSubscription();
    }
  }, [subscriptionId, fetchSubscription]);

  const handleCancel = async () => {
    if (!subscription || !confirm('Are you sure you want to cancel this subscription?')) return;

    try {
      setActionLoading('cancel');
      await subscriptionsApi.cancel(subscription.id, { reason: 'Customer requested' });
      showSuccess('Subscription cancelled successfully');
      router.push('/subscriptions');
    } catch (error: unknown) {
      showError(getApiErrorMessage(error, 'Failed to cancel subscription'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async () => {
    if (!subscription || !confirm('Are you sure you want to reactivate this subscription?')) return;

    try {
      setActionLoading('reactivate');
      await subscriptionsApi.reactivate(subscription.id);
      showSuccess('Subscription reactivated successfully');
      fetchSubscription();
    } catch (error: unknown) {
      showError(getApiErrorMessage(error, 'Failed to reactivate subscription'));
    } finally {
      setActionLoading(null);
    }
  };

  const formatPaymentMethod = (method: string | null | undefined) => {
    if (!method) return 'Not set';
    const methodMap: Record<string, string> = {
      ratiba: 'Ratiba (Standing Order)',
      stk_push: 'STK Push',
      c2b: 'Paybill (C2B)',
    };
    return methodMap[method] || method.toUpperCase();
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="app-shell">
          <BackgroundDecorations />
          <Navigation />
          <main className="app-main relative">
            <LoadingState />
          </main>
        </div>
      </AuthGuard>
    );
  }

  if (error || !subscription) {
    return (
      <AuthGuard>
        <div className="app-shell">
          <BackgroundDecorations />
          <Navigation />
          <main className="app-main relative">
            <ErrorState message={error || 'Subscription not found'} />
            <Link href="/subscriptions" className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
              Back to Subscriptions
            </Link>
          </main>
        </div>
      </AuthGuard>
    );
  }

  const canReactivate =
    ['cancelled', 'suspended', 'expired'].includes(subscription.status) &&
    Number(subscription.outstanding_amount || 0) <= 0;
  const showReactivateAction = ['cancelled', 'suspended', 'expired'].includes(subscription.status);
  const hasOutstandingBalance = Number(subscription.outstanding_amount || 0) > 0;

  return (
    <AuthGuard>
      <div className="app-shell">
        <BackgroundDecorations />
        <Navigation />

        <main className="app-main relative">
          <div className="mb-4">
            <Link href="/subscriptions" className="inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900">
              Back to Subscriptions
            </Link>
          </div>

          <PageHeader
            title="Subscription Details"
            description="Review billing state, schedule, and payment history."
          />

          <div className="space-y-6">
            <div className="app-card">
              <div className="app-card-header">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="app-section-title">Subscription Information</h2>
                  <StatusBadge status={subscription.status} type="subscription" size="md" />
                </div>
              </div>

              <div className="app-card-body">
                <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Subscription</dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900">
                      {subscription.name || subscription.reference_number}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Reference Number</dt>
                    <dd className="mt-1 text-sm text-slate-900">{subscription.reference_number}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Amount</dt>
                    <dd className="mt-1 text-sm text-slate-900">
                      {formatCurrency(subscription.amount || 0)}
                      {subscription.billing_cycle_days && <> / every {subscription.billing_cycle_days} days</>}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Payment Method</dt>
                    <dd className="mt-1 text-sm text-slate-900">
                      {formatPaymentMethod(subscription.preferred_payment_method || subscription.payment_method)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Current Period</dt>
                    <dd className="mt-1 text-sm text-slate-900">
                      {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Next Billing Date</dt>
                    <dd className="mt-1 text-sm text-slate-900">
                      {subscription.next_billing_date ? formatDate(subscription.next_billing_date) : 'N/A'}
                    </dd>
                  </div>
                  {subscription.trial_ends_at && (
                    <div>
                      <dt className="text-sm font-medium text-slate-500">Trial End</dt>
                      <dd className="mt-1 text-sm text-slate-900">{formatDate(subscription.trial_ends_at)}</dd>
                    </div>
                  )}
                  {subscription.outstanding_amount > 0 && (
                    <div>
                      <dt className="text-sm font-medium text-slate-500">Outstanding Amount</dt>
                      <dd className="mt-1 text-sm font-semibold text-red-700">
                        {formatCurrency(subscription.outstanding_amount)}
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="mt-6 flex flex-wrap gap-3">
                  {subscription.status === 'active' && (
                    <button onClick={handleCancel} disabled={actionLoading === 'cancel'} className="app-btn-danger">
                      {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel Subscription'}
                    </button>
                  )}

                  {showReactivateAction && (
                    <button
                      onClick={handleReactivate}
                      disabled={actionLoading === 'reactivate' || !canReactivate}
                      className="app-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionLoading === 'reactivate' ? 'Reactivating...' : 'Reactivate Subscription'}
                    </button>
                  )}

                  <Link href="/payment-methods" className="app-btn-secondary">
                    Update Payment Method
                  </Link>
                </div>

                {showReactivateAction && hasOutstandingBalance && (
                  <p className="mt-3 text-sm text-amber-700">
                    Clear the outstanding balance before reactivating this subscription.
                  </p>
                )}
              </div>
            </div>

            <div className="app-card">
              <div className="app-card-header">
                <h2 className="app-section-title">Payment History</h2>
              </div>

              <div className="app-card-body">
                {payments.length === 0 ? (
                  <p className="text-sm text-slate-600">No payment history yet.</p>
                ) : (
                  <div className="app-table-shell">
                    <table className="app-table">
                      <thead className="app-table-head">
                        <tr>
                          <th className="app-table-head-cell">Date</th>
                          <th className="app-table-head-cell">Amount</th>
                          <th className="app-table-head-cell">Status</th>
                          <th className="app-table-head-cell">Method</th>
                          <th className="app-table-head-cell">Transaction ID</th>
                        </tr>
                      </thead>
                      <tbody className="app-table-body">
                        {payments.map((payment) => (
                          <tr key={payment.id} className="app-table-row">
                            <td className="app-table-cell">
                              {payment.paid_at ? formatDate(payment.paid_at) : formatDate(payment.created_at)}
                            </td>
                            <td className="app-table-cell font-medium text-slate-900">
                              {formatCurrency(payment.amount, payment.currency)}
                            </td>
                            <td className="app-table-cell">
                              <StatusBadge status={payment.status} type="payment" />
                            </td>
                            <td className="app-table-cell">{payment.payment_method}</td>
                            <td className="app-table-cell">
                              {payment.mpesa_receipt_number || payment.transaction_id || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
