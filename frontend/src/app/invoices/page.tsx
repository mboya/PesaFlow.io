'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Receipt } from 'lucide-react';

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
import { formatCurrency, formatDate } from '@/lib/utils';
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
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load invoices');
        console.error('Invoices error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white relative">
        <BackgroundDecorations />
        <Navigation />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 relative">
          <PageHeader
            title="Invoices"
            description="View and manage your invoices"
            icon={Receipt}
            iconGradient="from-purple-500 to-pink-500"
          />

          {loading && <LoadingState message="Loading invoices..." />}

          {error && <ErrorState message={error} onDismiss={() => setError(null)} />}

          {!loading && !error && (
            <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
              {invoices.length === 0 ? (
                <EmptyState message="You don't have any invoices yet." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
                    <thead className="bg-white/50 dark:bg-zinc-900/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                          Invoice Number
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                          Subscription
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                          Amount
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                          Due Date
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/50 bg-white/50 dark:divide-zinc-800/50 dark:bg-zinc-900/50">
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-950/20">
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="font-medium text-zinc-900 dark:text-zinc-50">
                              {invoice.invoice_number}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="text-sm text-zinc-900 dark:text-zinc-50">
                              {invoice.subscription?.reference_number || 'N/A'}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50">
                            {formatCurrency(invoice.amount, invoice.currency)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50">
                            {formatDate(invoice.due_date)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <StatusBadge status={invoice.status} type="invoice" />
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                            <Link
                              href={`/invoices/${invoice.id}`}
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

