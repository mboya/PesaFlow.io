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
import { invoicesApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Invoice } from '@/lib/types';

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id as string;
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const response = await invoicesApi.getById(invoiceId);
        setInvoice(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load invoice');
        console.error('Invoice error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

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

  if (error || !invoice) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
          <Navigation />
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <ErrorState message={error || 'Invoice not found'} />
            <Link href="/invoices" className="mt-4 inline-block text-blue-600 hover:underline">
              ← Back to Invoices
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
              href="/invoices"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              ← Back to Invoices
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Invoice {invoice.invoice_number}
            </h1>
          </div>

          <div className="rounded-lg bg-white shadow dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Invoice Details
                </h2>
                <StatusBadge status={invoice.status} type="invoice" size="md" />
              </div>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Invoice Number</dt>
                  <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                    {invoice.invoice_number}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Amount</dt>
                  <dd className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Due Date</dt>
                  <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                    {formatDateLong(invoice.due_date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Status</dt>
                  <dd className="mt-1">
                    <StatusBadge status={invoice.status} type="invoice" />
                  </dd>
                </div>
                {invoice.subscription && (
                  <div>
                    <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Subscription</dt>
                    <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                      <Link
                        href={`/subscriptions/${invoice.subscription.id}`}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {invoice.subscription.reference_number}
                      </Link>
                    </dd>
                  </div>
                )}
                {invoice.paid_at && (
                  <div>
                    <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Paid At</dt>
                    <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                      {formatDateLong(invoice.paid_at)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Created</dt>
                  <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                    {formatDateLong(invoice.created_at)}
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

