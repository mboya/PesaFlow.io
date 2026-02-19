'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { AuthGuard, Navigation, BackgroundDecorations, PageHeader, ErrorState } from '@/components';
import { useToast } from '@/contexts/ToastContext';
import { subscriptionsApi } from '@/lib/api';
import { formatPhoneNumber, getApiErrorMessage } from '@/lib/utils';

export default function NewSubscriptionPage() {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [billingCycleDays, setBillingCycleDays] = useState<number | ''>(30);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'ratiba' | 'stk_push'>('ratiba');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a subscription name/description');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (paymentMethod === 'ratiba' && (!formattedPhone || formattedPhone.length < 12)) {
      setError('Please enter a valid M-Pesa phone number (e.g., 0712345678)');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await subscriptionsApi.create({
        subscription: {
          name: name.trim(),
          description: description.trim() || undefined,
          amount: Number(amount),
          billing_cycle_days: billingCycleDays ? Number(billingCycleDays) : 30,
        },
        customer: {
          phone_number: formattedPhone || undefined,
        },
        payment_method: paymentMethod,
      });
      showSuccess('Subscription created successfully');
      router.push('/subscriptions');
    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error, 'Failed to create subscription');
      setError(errorMessage);
      showError(errorMessage);
      console.error('Create subscription error:', error);
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
          <div className="mb-4">
            <Link href="/subscriptions" className="inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900">
              Back to Subscriptions
            </Link>
          </div>

          <PageHeader
            title="New Subscription"
            description="Create a recurring plan and choose its M-Pesa collection method."
          />

          {error && (
            <div className="mb-6">
              <ErrorState message={error} onDismiss={() => setError(null)} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="app-card">
            <div className="app-card-header">
              <h2 className="app-section-title">Subscription Details</h2>
            </div>
            <div className="app-card-body space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700">Description / Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="app-input"
                  placeholder="e.g. Monthly gym membership"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Additional Details (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="app-input"
                  rows={3}
                  placeholder="Describe what this subscription is for"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Amount (KES)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="app-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Billing Cycle (days)</label>
                  <input
                    type="number"
                    min={1}
                    value={billingCycleDays}
                    onChange={(e) => setBillingCycleDays(e.target.value === '' ? '' : Number(e.target.value))}
                    className="app-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  M-Pesa Phone Number {paymentMethod === 'ratiba' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="app-input"
                  placeholder="0712345678"
                />
                <p className="mt-1 text-xs text-slate-500">Enter the phone number that will be charged for payments.</p>
              </div>
            </div>

            <div className="app-card-header">
              <h2 className="app-section-title">Payment Method</h2>
            </div>
            <div className="app-card-body space-y-3">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                  paymentMethod === 'ratiba' ? 'border-teal-300 bg-teal-50/70' : 'border-slate-200 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value="ratiba"
                  checked={paymentMethod === 'ratiba'}
                  onChange={() => setPaymentMethod('ratiba')}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-slate-900">Ratiba (Standing Order)</div>
                  <div className="text-sm text-slate-600">Automatic recurring payments via M-Pesa Standing Order</div>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                  paymentMethod === 'stk_push' ? 'border-teal-300 bg-teal-50/70' : 'border-slate-200 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value="stk_push"
                  checked={paymentMethod === 'stk_push'}
                  onChange={() => setPaymentMethod('stk_push')}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-slate-900">STK Push</div>
                  <div className="text-sm text-slate-600">Manual payment collection via M-Pesa STK prompts</div>
                </div>
              </label>
            </div>

            <div className="app-card-header">
              <div className="flex flex-wrap justify-end gap-3">
                <Link href="/subscriptions" className="app-btn-secondary">
                  Cancel
                </Link>
                <button type="submit" disabled={submitting} className="app-btn-primary">
                  {submitting ? 'Creating...' : 'Create Subscription'}
                </button>
              </div>
            </div>
          </form>
        </main>
      </div>
    </AuthGuard>
  );
}
