'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { Navigation } from '@/components/Navigation';
import { plansApi } from '@/lib/api';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Plan } from '@/lib/types';

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const response = await plansApi.getAll();
        setPlans(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load plans');
        console.error('Plans error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

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
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Plans
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Choose the plan that's right for you
            </p>
          </div>

          {loading && (
            <div className="rounded-lg bg-white p-8 shadow dark:bg-zinc-900">
              <p className="text-zinc-600 dark:text-zinc-400">Loading plans...</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 dark:bg-red-900/20 dark:border-red-800">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-lg border border-zinc-200 bg-white p-6 shadow dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                      {plan.name}
                    </h3>
                    {plan.description && (
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {plan.description}
                      </p>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                        {formatCurrency(plan.amount)}
                      </span>
                      <span className="ml-2 text-sm text-zinc-600 dark:text-zinc-400">
                        / {plan.billing_frequency}
                      </span>
                    </div>
                    {plan.trial_days && (
                      <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                        {plan.trial_days} day free trial
                      </p>
                    )}
                  </div>

                  {plan.features && (
                    <ul className="mb-6 space-y-2">
                      {Object.entries(plan.features).map(([key, value]) => {
                        // Format key: replace underscores with spaces and capitalize
                        const formattedKey = key
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (l) => l.toUpperCase());
                        
                        // Skip boolean false values
                        if (value === false) return null;
                        
                        return (
                          <li key={key} className="flex items-start text-sm text-zinc-600 dark:text-zinc-400">
                            <span className="mr-2 text-green-600 dark:text-green-400">✓</span>
                            <span>
                              <span className="font-medium text-zinc-900 dark:text-zinc-50">{formattedKey}:</span>{' '}
                              {String(value)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${
                      plan.is_active
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <Link
                      href={`/plans/${plan.id}`}
                      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}

              {plans.length === 0 && (
                <div className="col-span-full rounded-lg bg-white p-8 text-center shadow dark:bg-zinc-900">
                  <p className="text-zinc-600 dark:text-zinc-400">No plans available</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}

