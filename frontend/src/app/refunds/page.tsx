'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
import { formatCurrency, formatDate, getApiErrorMessage } from '@/lib/utils';
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
      } catch (error: unknown) {
        setError(getApiErrorMessage(error, 'Failed to load refunds'));
        console.error('Refunds error:', error);
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
        payment_id: parseInt(formData.payment_id, 10),
        amount: parseFloat(formData.amount),
        reason: formData.reason,
      });
      setShowCreateForm(false);
      setFormData({ payment_id: '', amount: '', reason: '' });
      const response = await refundsApi.getAll();
      setRefunds(response.data);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Failed to create refund'));
      console.error('Create refund error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="app-shell">
        <BackgroundDecorations />
        <Navigation />

        <main className="app-main relative">
          <PageHeader
            title="Refunds"
            description="Submit and monitor payout reversals from one queue."
            action={
              <button onClick={() => setShowCreateForm((prev) => !prev)} className="app-btn-primary">
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
            <div className="app-card mb-6">
              <div className="app-card-header">
                <h2 className="app-section-title">Request Refund</h2>
              </div>
              <form onSubmit={handleCreateRefund} className="app-card-body">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="payment_id" className="block text-sm font-medium text-slate-700">
                      Payment ID
                    </label>
                    <input
                      type="number"
                      id="payment_id"
                      required
                      value={formData.payment_id}
                      onChange={(e) => setFormData({ ...formData, payment_id: e.target.value })}
                      placeholder="Enter payment ID"
                      className="app-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-slate-700">
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
                      className="app-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-slate-700">
                      Reason
                    </label>
                    <textarea
                      id="reason"
                      required
                      rows={4}
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="Explain why you need a refund"
                      className="app-input"
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <button type="submit" disabled={submitting} className="app-btn-primary">
                    {submitting ? 'Submitting...' : 'Submit Refund Request'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {loading && <LoadingState message="Loading refunds..." />}

          {!loading && (
            <div className="app-card">
              {refunds.length === 0 ? (
                <EmptyState message="You don't have any refund requests yet." />
              ) : (
                <div className="app-table-shell">
                  <table className="app-table">
                    <thead className="app-table-head">
                      <tr>
                        <th className="app-table-head-cell">Payment ID</th>
                        <th className="app-table-head-cell">Amount</th>
                        <th className="app-table-head-cell">Reason</th>
                        <th className="app-table-head-cell">Status</th>
                        <th className="app-table-head-cell">Created</th>
                        <th className="app-table-head-cell text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="app-table-body">
                      {refunds.map((refund) => (
                        <tr key={refund.id} className="app-table-row">
                          <td className="app-table-cell">{refund.payment_id}</td>
                          <td className="app-table-cell font-medium text-slate-900">
                            {formatCurrency(refund.amount, refund.currency)}
                          </td>
                          <td className="app-table-cell">{refund.reason}</td>
                          <td className="app-table-cell">
                            <StatusBadge status={refund.status} type="refund" />
                          </td>
                          <td className="app-table-cell">{formatDate(refund.created_at)}</td>
                          <td className="app-table-cell text-right">
                            <Link href={`/refunds/${refund.id}`} className="app-link">
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
