'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { Navigation } from '@/components/Navigation';
import { invoicesApi } from '@/lib/api';
import { useEffect, useState } from 'react';
import Link from 'next/link';
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
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur opacity-50"></div>
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Invoices
                  </h1>
                  <p className="mt-1 text-base text-zinc-600 dark:text-zinc-400">
                    View and manage your invoices
                  </p>
                </div>
              </div>
            </div>
          </div>

          {loading && (
            <div className="rounded-2xl bg-gradient-to-br from-white to-blue-50/50 p-8 shadow-lg dark:from-zinc-900 dark:to-blue-950/30 border border-zinc-200/50 dark:border-zinc-800/50">
              <p className="text-zinc-600 dark:text-zinc-400">Loading invoices...</p>
            </div>
          )}

          {error && (
            <div className="rounded-2xl bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 p-4 dark:from-red-900/20 dark:to-pink-900/20 dark:border-red-800">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-indigo-50/50 shadow-lg dark:from-zinc-900 dark:to-indigo-950/30 border border-zinc-200/50 dark:border-zinc-800/50">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] opacity-40"></div>
              {invoices.length === 0 ? (
                <div className="relative p-12 text-center">
                  <p className="text-zinc-600 dark:text-zinc-400 text-lg">
                    You don't have any invoices yet.
                  </p>
                </div>
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
                    <thead className="bg-gradient-to-r from-zinc-50/80 to-blue-50/50 dark:from-zinc-900/80 dark:to-blue-950/30">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
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
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(invoice.status)}`}>
                              {invoice.status}
                            </span>
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

