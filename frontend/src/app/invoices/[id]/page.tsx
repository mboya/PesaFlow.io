'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { Navigation } from '@/components/Navigation';
import { invoicesApi } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'sent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'draft':
        return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/20 dark:text-zinc-400';
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

  if (error || !invoice) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
          <Navigation />
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 dark:bg-red-900/20 dark:border-red-800">
              <p className="text-red-800 dark:text-red-200">{error || 'Invoice not found'}</p>
            </div>
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
                <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusColor(invoice.status)}`}>
                  {invoice.status}
                </span>
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
                    {formatDate(invoice.due_date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Status</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
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
                      {formatDate(invoice.paid_at)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Created</dt>
                  <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                    {formatDate(invoice.created_at)}
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

