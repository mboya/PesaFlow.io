'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { Navigation } from '@/components/Navigation';
import { subscriptionsApi, paymentsApi } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import type { Subscription, Payment } from '@/lib/types';

export default function SubscriptionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const subscriptionId = params.id as string;
  
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const [subResponse, paymentsResponse] = await Promise.all([
        subscriptionsApi.getById(subscriptionId),
        paymentsApi.getBySubscription(subscriptionId).catch(() => ({ data: [] })),
      ]);
      setSubscription(subResponse.data);
      setPayments(paymentsResponse.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load subscription');
      console.error('Subscription error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subscriptionId) {
      fetchSubscription();
    }
  }, [subscriptionId]);

  const handleCancel = async () => {
    if (!subscription || !confirm('Are you sure you want to cancel this subscription?')) return;
    
    try {
      setActionLoading('cancel');
      await subscriptionsApi.cancel(subscription.id, { reason: 'Customer requested' });
      router.push('/subscriptions');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async () => {
    if (!subscription || !confirm('Are you sure you want to reactivate this subscription?')) return;
    
    try {
      setActionLoading('reactivate');
      await subscriptionsApi.reactivate(subscription.id);
      // Refresh subscription data instead of full page reload
      fetchSubscription();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reactivate subscription');
    } finally {
      setActionLoading(null);
    }
  };

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
      'ratiba': 'Ratiba (Standing Order)',
      'stk_push': 'STK Push',
      'c2b': 'Paybill (C2B)',
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

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
          <Navigation />
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
          </main>
        </div>
      </AuthGuard>
    );
  }

  if (error || !subscription) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
          <Navigation />
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 dark:bg-red-900/20 dark:border-red-800">
              <p className="text-red-800 dark:text-red-200">{error || 'Subscription not found'}</p>
            </div>
            <Link href="/subscriptions" className="mt-4 inline-block text-blue-600 hover:underline">
              ← Back to Subscriptions
            </Link>
          </main>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <Navigation />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link
              href="/subscriptions"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              ← Back to Subscriptions
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Subscription Details
            </h1>
          </div>

          <div className="space-y-6">
            {/* Subscription Info */}
            <div className="rounded-lg bg-white shadow dark:bg-zinc-900">
              <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    Subscription Information
                  </h2>
                  <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusColor(subscription.status)}`}>
                    {subscription.status}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Subscription</dt>
                    <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                      {subscription.name || subscription.reference_number}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Reference Number</dt>
                    <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                      {subscription.reference_number}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Amount</dt>
                    <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(subscription.amount || 0)}
                      {subscription.billing_cycle_days && (
                        <> / every {subscription.billing_cycle_days} days</>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Payment Method</dt>
                    <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                      {formatPaymentMethod(subscription.preferred_payment_method || subscription.payment_method)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Current Period</dt>
                    <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                      {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Next Billing Date</dt>
                    <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                      {subscription.next_billing_date ? formatDate(subscription.next_billing_date) : 'N/A'}
                    </dd>
                  </div>
                  {subscription.trial_end && (
                    <div>
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Trial End</dt>
                      <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                        {formatDate(subscription.trial_end)}
                      </dd>
                    </div>
                  )}
                  {subscription.outstanding_amount > 0 && (
                    <div>
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Outstanding Amount</dt>
                      <dd className="mt-1 text-sm font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(subscription.outstanding_amount)}
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="mt-6 flex gap-4">
                  {subscription.status === 'active' && (
                    <button
                      onClick={handleCancel}
                      disabled={actionLoading === 'cancel'}
                      className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel Subscription'}
                    </button>
                  )}
                  {subscription.status === 'cancelled' && (
                    <button
                      onClick={handleReactivate}
                      disabled={actionLoading === 'reactivate'}
                      className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading === 'reactivate' ? 'Reactivating...' : 'Reactivate Subscription'}
                    </button>
                  )}
                  <Link
                    href="/payment-methods"
                    className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    Update Payment Method
                  </Link>
                </div>
              </div>
            </div>

            {/* Payment History */}
            <div className="rounded-lg bg-white shadow dark:bg-zinc-900">
              <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Payment History
                </h2>
              </div>
              <div className="p-6">
                {payments.length === 0 ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">No payment history</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                      <thead className="bg-zinc-50 dark:bg-zinc-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Method
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Transaction ID
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
                        {payments.map((payment) => (
                          <tr key={payment.id}>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50">
                              {payment.paid_at ? formatDate(payment.paid_at) : formatDate(payment.created_at)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50">
                              {formatCurrency(payment.amount, payment.currency)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4">
                              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                payment.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                payment.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                              }`}>
                                {payment.status}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                              {payment.payment_method}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
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

