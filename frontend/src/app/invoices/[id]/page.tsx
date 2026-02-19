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
import { invoicesApi } from '@/lib/api';
import { formatCurrency, formatDate, getApiErrorMessage } from '@/lib/utils';
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
      } catch (error: unknown) {
        setError(getApiErrorMessage(error, 'Failed to load invoice'));
        console.error('Invoice error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

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

  if (error || !invoice) {
    return (
      <AuthGuard>
        <div className="app-shell">
          <BackgroundDecorations />
          <Navigation />
          <main className="app-main relative">
            <ErrorState message={error || 'Invoice not found'} />
            <Link href="/invoices" className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
              Back to Invoices
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
            <Link href="/invoices" className="inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900">
              Back to Invoices
            </Link>
          </div>

          <PageHeader
            title={`Invoice ${invoice.invoice_number}`}
            description="Billing summary and payment lifecycle details."
          />

          <div className="app-card">
            <div className="app-card-header">
              <div className="flex items-center justify-between gap-3">
                <h2 className="app-section-title">Invoice Details</h2>
                <StatusBadge status={invoice.status} type="invoice" size="md" />
              </div>
            </div>
            <div className="app-card-body">
              <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-slate-500">Invoice Number</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">{invoice.invoice_number}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500">Amount</dt>
                  <dd className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(invoice.amount, invoice.currency)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500">Due Date</dt>
                  <dd className="mt-1 text-sm text-slate-900">{formatDateLong(invoice.due_date)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500">Status</dt>
                  <dd className="mt-1">
                    <StatusBadge status={invoice.status} type="invoice" />
                  </dd>
                </div>
                {invoice.subscription && (
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Subscription</dt>
                    <dd className="mt-1 text-sm text-slate-900">
                      <Link href={`/subscriptions/${invoice.subscription.id}`} className="app-link">
                        {invoice.subscription.reference_number}
                      </Link>
                    </dd>
                  </div>
                )}
                {invoice.paid_at && (
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Paid At</dt>
                    <dd className="mt-1 text-sm text-slate-900">{formatDateLong(invoice.paid_at)}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-slate-500">Created</dt>
                  <dd className="mt-1 text-sm text-slate-900">{formatDateLong(invoice.created_at)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
