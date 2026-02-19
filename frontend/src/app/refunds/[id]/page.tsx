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
  PageHeader,
  BackgroundDecorations,
} from '@/components';
import { refundsApi } from '@/lib/api';
import { formatCurrency, formatDate, getApiErrorMessage } from '@/lib/utils';
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
      } catch (error: unknown) {
        setError(getApiErrorMessage(error, 'Failed to load refund'));
        console.error('Refund error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (refundId) {
      fetchRefund();
    }
  }, [refundId]);

  const formatDateLong = (dateString: string) =>
    formatDate(dateString, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

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

  if (error || !refund) {
    return (
      <AuthGuard>
        <div className="app-shell">
          <BackgroundDecorations />
          <Navigation />
          <main className="app-main relative">
            <ErrorState message={error || 'Refund not found'} />
            <Link href="/refunds" className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
              Back to Refunds
            </Link>
          </main>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="app-shell">
        <BackgroundDecorations />
        <Navigation />

        <main className="app-main-narrow relative">
          <div className="mb-4">
            <Link href="/refunds" className="inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900">
              Back to Refunds
            </Link>
          </div>

          <PageHeader
            title={`Refund Request #${refund.id}`}
            description="Track refund processing and payout completion."
          />

          <div className="app-card">
            <div className="app-card-header">
              <div className="flex items-center justify-between gap-3">
                <h2 className="app-section-title">Refund Details</h2>
                <StatusBadge status={refund.status} type="refund" size="md" />
              </div>
            </div>
            <div className="app-card-body">
              <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-slate-500">Refund ID</dt>
                  <dd className="mt-1 text-sm text-slate-900">#{refund.id}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500">Amount</dt>
                  <dd className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(refund.amount, refund.currency)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500">Payment ID</dt>
                  <dd className="mt-1 text-sm text-slate-900">{refund.payment_id}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500">Status</dt>
                  <dd className="mt-1">
                    <StatusBadge status={refund.status} type="refund" />
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-slate-500">Reason</dt>
                  <dd className="mt-1 text-sm text-slate-900">{refund.reason}</dd>
                </div>
                {refund.mpesa_transaction_id && (
                  <div>
                    <dt className="text-sm font-medium text-slate-500">M-Pesa Transaction ID</dt>
                    <dd className="mt-1 text-sm text-slate-900">{refund.mpesa_transaction_id}</dd>
                  </div>
                )}
                {refund.processed_at && (
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Processed At</dt>
                    <dd className="mt-1 text-sm text-slate-900">{formatDateLong(refund.processed_at)}</dd>
                  </div>
                )}
                {refund.failure_reason && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-red-600">Failure Reason</dt>
                    <dd className="mt-1 text-sm text-red-700">{refund.failure_reason}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-slate-500">Created</dt>
                  <dd className="mt-1 text-sm text-slate-900">{formatDateLong(refund.created_at)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
