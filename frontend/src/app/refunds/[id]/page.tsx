'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

import {
  AuthGuard,
  Navigation,
  StatusBadge,
  LoadingState,
  ErrorState,
} from '@/components';
import { refundsApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
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

  // Use formatDate with custom options for long month format
  const formatDateLong = (dateString: string) => {
    return formatDate(dateString, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };


  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
          <Navigation />
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <LoadingState />
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
            <ErrorState message={error || 'Refund not found'} />
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
                <StatusBadge status={refund.status} type="refund" size="md" />
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
                    <StatusBadge status={refund.status} type="refund" />
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
                      {formatDateLong(refund.processed_at)}
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
                    {formatDateLong(refund.created_at)}
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

