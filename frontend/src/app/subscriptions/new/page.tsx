'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { Navigation } from '@/components/Navigation';
import { subscriptionsApi, plansApi } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Plan } from '@/lib/types';

export default function NewSubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'ratiba' | 'stk_push'>('ratiba');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const response = await plansApi.getAll();
        const activePlans = response.data.filter((plan: Plan) => plan.is_active);
        setPlans(activePlans);
        
        // Check if plan_id is in query params
        const planIdParam = searchParams.get('plan_id');
        if (planIdParam) {
          const planId = parseInt(planIdParam);
          const planExists = activePlans.find((p: Plan) => p.id === planId);
          if (planExists) {
            setSelectedPlanId(planId);
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load plans');
        console.error('Plans error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) {
      setError('Please select a plan');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await subscriptionsApi.create({
        plan_id: selectedPlanId,
        payment_method: paymentMethod,
      });
      router.push('/subscriptions');
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.errors || 'Failed to create subscription');
      console.error('Create subscription error:', err);
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

          {loading && (
            <div className="rounded-lg bg-white p-8 shadow dark:bg-zinc-900">
              <p className="text-zinc-600 dark:text-zinc-400">Loading plans...</p>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 dark:bg-red-900/20 dark:border-red-800">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {!loading && (
            <form onSubmit={handleSubmit} className="rounded-lg bg-white shadow dark:bg-zinc-900">
              <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Select a Plan
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {plans.map((plan) => (
                    <label
                      key={plan.id}
                      className={`block cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                        selectedPlanId === plan.id
                          ? 'border-zinc-900 bg-zinc-50 dark:border-zinc-50 dark:bg-zinc-800'
                          : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value={plan.id}
                        checked={selectedPlanId === plan.id}
                        onChange={() => setSelectedPlanId(plan.id)}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                            {plan.name}
                          </h3>
                          {plan.description && (
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                              {plan.description}
                            </p>
                          )}
                          {plan.trial_days && (
                            <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                              {plan.trial_days} day trial
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                            {formatCurrency(plan.amount)}
                          </p>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            / {plan.billing_frequency}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {plans.length === 0 && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    No active plans available. Please contact support.
                  </p>
                )}
              </div>

              {selectedPlanId && (
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
              )}
            </form>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}

