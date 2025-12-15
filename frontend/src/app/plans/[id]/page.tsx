'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { Navigation } from '@/components/Navigation';
import { plansApi } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Plan } from '@/lib/types';

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;
  
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        setLoading(true);
        const response = await plansApi.getById(planId);
        setPlan(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load plan');
        console.error('Plan error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (planId) {
      fetchPlan();
    }
  }, [planId]);

  const formatCurrency = (amount: number, currency: string = 'KES') => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const handleSubscribe = () => {
    router.push(`/subscriptions/new?plan_id=${planId}`);
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

  if (error || !plan) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
          <Navigation />
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 dark:bg-red-900/20 dark:border-red-800">
              <p className="text-red-800 dark:text-red-200">{error || 'Plan not found'}</p>
            </div>
            <Link href="/plans" className="mt-4 inline-block text-blue-600 hover:underline">
              ← Back to Plans
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

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link
              href="/plans"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              ← Back to Plans
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {plan.name}
            </h1>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="rounded-lg bg-white shadow dark:bg-zinc-900">
                <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    Plan Details
                  </h2>
                </div>
                <div className="p-6">
                  {plan.description && (
                    <p className="mb-6 text-zinc-600 dark:text-zinc-400">
                      {plan.description}
                    </p>
                  )}

                  {plan.features && (
                    <div>
                      <h3 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-50">
                        Features
                      </h3>
                      <ul className="space-y-2">
                        {Object.entries(plan.features).map(([key, value]) => {
                          // Format key: replace underscores with spaces and capitalize
                          const formattedKey = key
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, (l) => l.toUpperCase());
                          
                          // Skip boolean false values
                          if (value === false) return null;
                          
                          return (
                            <li key={key} className="flex items-start text-zinc-600 dark:text-zinc-400">
                              <span className="mr-2 text-green-600 dark:text-green-400">✓</span>
                              <span>
                                <span className="font-medium text-zinc-900 dark:text-zinc-50">{formattedKey}:</span>{' '}
                                {String(value)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-4">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(plan.amount)}
                    </span>
                    <span className="ml-2 text-sm text-zinc-600 dark:text-zinc-400">
                      / {plan.billing_frequency}
                    </span>
                  </div>
                  {plan.trial_days && (
                    <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                      {plan.trial_days} day free trial included
                    </p>
                  )}
                </div>

                <button
                  onClick={handleSubscribe}
                  disabled={!plan.is_active}
                  className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {plan.is_active ? 'Subscribe Now' : 'Not Available'}
                </button>

                <dl className="mt-6 space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Billing Frequency
                    </dt>
                    <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                      {plan.billing_frequency}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Status
                    </dt>
                    <dd className="mt-1">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        plan.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/20 dark:text-zinc-400'
                      }`}>
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}

