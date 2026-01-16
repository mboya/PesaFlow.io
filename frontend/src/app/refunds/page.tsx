'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeftRight } from 'lucide-react';

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
import { refundsApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Refund } from '@/lib/types';

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    payment_id: '',
    amount: '',
    reason: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const refundsResponse = await refundsApi.getAll().catch(() => ({ data: [] }));
        setRefunds(refundsResponse.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load refunds');
        console.error('Refunds error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCreateRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await refundsApi.create({
        payment_id: parseInt(formData.payment_id),
        amount: parseFloat(formData.amount),
        reason: formData.reason,
      });
      setShowCreateForm(false);
      setFormData({ payment_id: '', amount: '', reason: '' });
      // Refresh refunds list
      const response = await refundsApi.getAll();
      setRefunds(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.errors || 'Failed to create refund');
      console.error('Create refund error:', err);
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <AuthGuard>
      <div className="min-h-screen bg-white relative">
        <BackgroundDecorations />
        <Navigation />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 relative">
          <PageHeader
            title="Refunds"
            description="Request and track refunds"
            icon={ArrowLeftRight}
            iconGradient="from-amber-500 to-orange-500"
            action={
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {showCreateForm ? 'Cancel' : 'Request Refund'}
              </button>
            }
          />

          {error && (
            <div className="mb-6">
              <ErrorState message={error} onDismiss={() => setError(null)} />
            </div>
          )}

          {showCreateForm && (
            <div className="mb-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
              <div className="border-b border-zinc-200/50 px-6 py-4 dark:border-zinc-800/50">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Request Refund
                </h2>
              </div>
              <form onSubmit={handleCreateRefund} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="payment_id" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Payment ID
                    </label>
                    <input
                      type="number"
                      id="payment_id"
                      required
                      value={formData.payment_id}
                      onChange={(e) => setFormData({ ...formData, payment_id: e.target.value })}
                      placeholder="Enter payment ID"
                      className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Amount (KES)
                    </label>
                    <input
                      type="number"
                      id="amount"
                      required
                      min="1"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Reason
                    </label>
                    <textarea
                      id="reason"
                      required
                      rows={4}
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="Explain why you need a refund"
                      className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {submitting ? 'Submitting...' : 'Submit Refund Request'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {loading && <LoadingState message="Loading refunds..." />}

          {!loading && (
            <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
              {refunds.length === 0 ? (
                <EmptyState message="You don't have any refund requests yet." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
                    <thead className="bg-white/50 dark:bg-zinc-900/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                          Payment ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Reason
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Created
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/50 bg-white/50 dark:divide-zinc-800/50 dark:bg-zinc-900/50">
                      {refunds.map((refund) => (
                        <tr key={refund.id} className="transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-950/20">
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50">
                            {refund.payment_id}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50">
                            {formatCurrency(refund.amount, refund.currency)}
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                            {refund.reason}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <StatusBadge status={refund.status} type="refund" />
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                            {formatDate(refund.created_at)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                            <Link
                              href={`/refunds/${refund.id}`}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
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

