'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { Navigation } from '@/components/Navigation';
import { subscriptionsApi } from '@/lib/api';
import { formatPhoneNumber } from '@/lib/utils';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

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
    
    // Phone number required for Ratiba
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
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.errors || 'Failed to create subscription';
      setError(errorMessage);
      showError(errorMessage);
      console.error('Create subscription error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <Navigation />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link
              href="/subscriptions"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              ← Back to Subscriptions
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              New Subscription
            </h1>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 dark:bg-red-900/20 dark:border-red-800">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="rounded-lg bg-white shadow dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Subscription Details
              </h2>
            </div>
            <div className="space-y-6 p-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Description / Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  placeholder="e.g. Monthly gym membership"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Additional Details (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  rows={3}
                  placeholder="Describe what this subscription is for"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Amount (KES)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Billing Cycle (days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={billingCycleDays}
                    onChange={(e) => setBillingCycleDays(e.target.value === '' ? '' : Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  M-Pesa Phone Number {paymentMethod === 'ratiba' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  placeholder="0712345678"
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Enter the phone number that will be charged for payments
                </p>
              </div>
            </div>

            <>
                  <div className="border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                      Payment Method
                    </h2>
                    <div className="space-y-4">
                      <label className="flex cursor-pointer items-center rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                        <input
                          type="radio"
                          name="payment_method"
                          value="ratiba"
                          checked={paymentMethod === 'ratiba'}
                          onChange={() => setPaymentMethod('ratiba')}
                          className="mr-3"
                        />
                        <div>
                          <div className="font-medium text-zinc-900 dark:text-zinc-50">
                            Ratiba (Standing Order)
                          </div>
                          <div className="text-sm text-zinc-600 dark:text-zinc-400">
                            Automatic recurring payments via M-Pesa Standing Order
                          </div>
                        </div>
                      </label>
                      <label className="flex cursor-pointer items-center rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                        <input
                          type="radio"
                          name="payment_method"
                          value="stk_push"
                          checked={paymentMethod === 'stk_push'}
                          onChange={() => setPaymentMethod('stk_push')}
                          className="mr-3"
                        />
                        <div>
                          <div className="font-medium text-zinc-900 dark:text-zinc-50">
                            STK Push
                          </div>
                          <div className="text-sm text-zinc-600 dark:text-zinc-400">
                            Manual payment via M-Pesa STK Push
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-zinc-200 px-6 py-6 dark:border-zinc-800">
                    <div className="flex justify-end gap-4">
                      <Link
                        href="/subscriptions"
                        className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Cancel
                      </Link>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                      >
                        {submitting ? 'Creating...' : 'Create Subscription'}
                      </button>
                    </div>
                  </div>
            </>
          </form>
        </main>
      </div>
    </AuthGuard>
  );
}

