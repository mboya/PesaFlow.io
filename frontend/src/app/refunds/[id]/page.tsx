'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { Navigation } from '@/components/Navigation';
import { refundsApi } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Refund } from '@/lib/types';

export default function RefundDetailPage() {
  const params = useParams();
  const refundId = params.id as string;
  
  const [refund, setRefund] = useState<Refund | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRefund = async () => {
      try {
        setLoading(true);
        const response = await refundsApi.getById(refundId);
        setRefund(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load refund');
        console.error('Refund error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (refundId) {
      fetchRefund();
    }
  }, [refundId]);

  const formatCurrency = (amount: number, currency: string = 'KES') => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
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

  if (error || !refund) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
          <Navigation />
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 dark:bg-red-900/20 dark:border-red-800">
              <p className="text-red-800 dark:text-red-200">{error || 'Refund not found'}</p>
            </div>
            <Link href="/refunds" className="mt-4 inline-block text-blue-600 hover:underline">
              ← Back to Refunds
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

        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link
              href="/refunds"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              ← Back to Refunds
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Refund Request #{refund.id}
            </h1>
          </div>

          <div className="rounded-lg bg-white shadow dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Refund Details
                </h2>
                <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusColor(refund.status)}`}>
                  {refund.status}
                </span>
              </div>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Refund ID</dt>
                  <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                    #{refund.id}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Amount</dt>
                  <dd className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatCurrency(refund.amount, refund.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Payment ID</dt>
                  <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                    {refund.payment_id}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Status</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(refund.status)}`}>
                      {refund.status}
                    </span>
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Reason</dt>
                  <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                    {refund.reason}
                  </dd>
                </div>
                {refund.mpesa_transaction_id && (
                  <div>
                    <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">M-Pesa Transaction ID</dt>
                    <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                      {refund.mpesa_transaction_id}
                    </dd>
                  </div>
                )}
                {refund.processed_at && (
                  <div>
                    <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Processed At</dt>
                    <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                      {formatDate(refund.processed_at)}
                    </dd>
                  </div>
                )}
                {refund.failure_reason && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-red-500 dark:text-red-400">Failure Reason</dt>
                    <dd className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {refund.failure_reason}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Created</dt>
                  <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                    {formatDate(refund.created_at)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}

