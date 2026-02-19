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
import { invoicesApi } from '@/lib/api';
import { formatCurrency, formatDate, getApiErrorMessage } from '@/lib/utils';
import type { Invoice } from '@/lib/types';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const response = await invoicesApi.getAll();
        setInvoices(response.data);
      } catch (error: unknown) {
        setError(getApiErrorMessage(error, 'Failed to load invoices'));
        console.error('Invoices error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  return (
    <AuthGuard>
      <div className="app-shell">
        <BackgroundDecorations />
        <Navigation />

        <main className="app-main relative">
          <PageHeader
            title="Invoices"
            description="Track invoice state, due dates, and collection outcomes."
          />

          {loading && <LoadingState message="Loading invoices..." />}

          {error && <ErrorState message={error} onDismiss={() => setError(null)} />}

          {!loading && !error && (
            <div className="app-card">
              {invoices.length === 0 ? (
                <EmptyState message="You don't have any invoices yet." />
              ) : (
                <div className="app-table-shell">
                  <table className="app-table">
                    <thead className="app-table-head">
                      <tr>
                        <th className="app-table-head-cell">Invoice Number</th>
                        <th className="app-table-head-cell">Subscription</th>
                        <th className="app-table-head-cell">Amount</th>
                        <th className="app-table-head-cell">Due Date</th>
                        <th className="app-table-head-cell">Status</th>
                        <th className="app-table-head-cell text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="app-table-body">
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="app-table-row">
                          <td className="app-table-cell font-medium text-slate-900">{invoice.invoice_number}</td>
                          <td className="app-table-cell">{invoice.subscription?.reference_number || 'N/A'}</td>
                          <td className="app-table-cell font-medium text-slate-900">
                            {formatCurrency(invoice.amount, invoice.currency)}
                          </td>
                          <td className="app-table-cell">{formatDate(invoice.due_date)}</td>
                          <td className="app-table-cell">
                            <StatusBadge status={invoice.status} type="invoice" />
                          </td>
                          <td className="app-table-cell text-right">
                            <Link href={`/invoices/${invoice.id}`} className="app-link">
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
