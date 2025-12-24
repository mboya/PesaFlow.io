'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { Navigation } from '@/components/Navigation';
import { refundsApi, paymentsApi } from '@/lib/api';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Refund, Payment } from '@/lib/types';

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
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
        const [refundsResponse, paymentsResponse] = await Promise.all([
          refundsApi.getAll().catch(() => ({ data: [] })),
          // We need to get payments from subscriptions - for now, we'll show empty list
          Promise.resolve({ data: [] }),
        ]);
        setRefunds(refundsResponse.data);
        setPayments(paymentsResponse.data);
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
              <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur opacity-50"></div>
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                      Refunds
                    </h1>
                    <p className="mt-1 text-base text-zinc-600 dark:text-zinc-400">
                      Request and track refunds
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="rounded-md bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
                >
                  {showCreateForm ? 'Cancel' : 'Request Refund'}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 p-4 dark:from-red-900/20 dark:to-pink-900/20 dark:border-red-800">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {showCreateForm && (
            <div className="mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-blue-50/50 shadow-lg dark:from-zinc-900 dark:to-blue-950/30 border border-zinc-200/50 dark:border-zinc-800/50">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] opacity-40"></div>
              <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
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

          {loading && (
            <div className="rounded-lg bg-white p-8 shadow dark:bg-zinc-900">
              <p className="text-zinc-600 dark:text-zinc-400">Loading refunds...</p>
            </div>
          )}

          {!loading && (
            <div className="rounded-lg bg-white shadow dark:bg-zinc-900">
              {refunds.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-zinc-600 dark:text-zinc-400">
                    You don't have any refund requests yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                    <thead className="bg-zinc-50 dark:bg-zinc-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
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
                    <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
                      {refunds.map((refund) => (
                        <tr key={refund.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
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
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(refund.status)}`}>
                              {refund.status}
                            </span>
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

