'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { Navigation } from '@/components/Navigation';
import { paymentMethodsApi } from '@/lib/api';
import { useState } from 'react';

export default function PaymentMethodsPage() {
  const [activeTab, setActiveTab] = useState<'ratiba' | 'stk_push'>('ratiba');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [ratibaForm, setRatibaForm] = useState({
    phone_number: '',
    amount: '',
    reference: '',
  });

  const [stkForm, setStkForm] = useState({
    phone_number: '',
    amount: '',
    reference: '',
  });

  const handleRatibaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await paymentMethodsApi.setupRatiba({
        phone_number: ratibaForm.phone_number,
        amount: parseFloat(ratibaForm.amount),
        reference: ratibaForm.reference,
      });
      setSuccess('Ratiba standing order setup initiated. Please check your phone for M-Pesa prompt.');
      setRatibaForm({ phone_number: '', amount: '', reference: '' });
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.errors || 'Failed to setup Ratiba');
      console.error('Ratiba error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStkPushSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await paymentMethodsApi.initiateStkPush({
        phone_number: stkForm.phone_number,
        amount: parseFloat(stkForm.amount),
        reference: stkForm.reference,
      });
      setSuccess('STK Push initiated. Please check your phone for M-Pesa prompt.');
      setStkForm({ phone_number: '', amount: '', reference: '' });
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.errors || 'Failed to initiate STK Push');
      console.error('STK Push error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-blue-50/30 to-purple-50/30 dark:from-zinc-950 dark:via-blue-950/30 dark:to-purple-950/30">
        <Navigation />

        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Payment Methods
                  </h1>
                  <p className="mt-1 text-base text-zinc-600 dark:text-zinc-400">
                    Set up your payment methods for subscriptions
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 rounded-xl bg-white/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 p-1">
            <nav className="flex space-x-2">
              <button
                onClick={() => setActiveTab('ratiba')}
                className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'ratiba'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                }`}
              >
                Ratiba (Standing Order)
              </button>
              <button
                onClick={() => setActiveTab('stk_push')}
                className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'stk_push'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                }`}
              >
                STK Push
              </button>
            </nav>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 p-4 dark:from-red-900/20 dark:to-pink-900/20 dark:border-red-800">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 p-4 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-800">
              <p className="text-green-800 dark:text-green-200">{success}</p>
            </div>
          )}

          {/* Ratiba Form */}
          {activeTab === 'ratiba' && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-blue-50/50 shadow-lg dark:from-zinc-900 dark:to-blue-950/30 border border-zinc-200/50 dark:border-zinc-800/50">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] opacity-40"></div>
              <div className="relative border-b border-zinc-200/50 px-6 py-4 dark:border-zinc-800/50">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Setup Ratiba (Standing Order)
                </h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Set up automatic recurring payments via M-Pesa Standing Order
                </p>
              </div>
              <form onSubmit={handleRatibaSubmit} className="relative p-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="ratiba_phone" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="ratiba_phone"
                      required
                      value={ratibaForm.phone_number}
                      onChange={(e) => setRatibaForm({ ...ratibaForm, phone_number: e.target.value })}
                      placeholder="254712345678"
                      className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="ratiba_amount" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Amount (KES)
                    </label>
                    <input
                      type="number"
                      id="ratiba_amount"
                      required
                      min="1"
                      step="0.01"
                      value={ratibaForm.amount}
                      onChange={(e) => setRatibaForm({ ...ratibaForm, amount: e.target.value })}
                      placeholder="1000.00"
                      className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="ratiba_reference" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Reference
                    </label>
                    <input
                      type="text"
                      id="ratiba_reference"
                      required
                      value={ratibaForm.reference}
                      onChange={(e) => setRatibaForm({ ...ratibaForm, reference: e.target.value })}
                      placeholder="Subscription reference"
                      className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-md bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loading ? 'Setting up...' : 'Setup Ratiba'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STK Push Form */}
          {activeTab === 'stk_push' && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-purple-50/50 shadow-lg dark:from-zinc-900 dark:to-purple-950/30 border border-zinc-200/50 dark:border-zinc-800/50">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] opacity-40"></div>
              <div className="relative border-b border-zinc-200/50 px-6 py-4 dark:border-zinc-800/50">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Initiate STK Push
                </h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Make a one-time payment via M-Pesa STK Push
                </p>
              </div>
              <form onSubmit={handleStkPushSubmit} className="relative p-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="stk_phone" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="stk_phone"
                      required
                      value={stkForm.phone_number}
                      onChange={(e) => setStkForm({ ...stkForm, phone_number: e.target.value })}
                      placeholder="254712345678"
                      className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="stk_amount" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Amount (KES)
                    </label>
                    <input
                      type="number"
                      id="stk_amount"
                      required
                      min="1"
                      step="0.01"
                      value={stkForm.amount}
                      onChange={(e) => setStkForm({ ...stkForm, amount: e.target.value })}
                      placeholder="1000.00"
                      className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="stk_reference" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Reference
                    </label>
                    <input
                      type="text"
                      id="stk_reference"
                      required
                      value={stkForm.reference}
                      onChange={(e) => setStkForm({ ...stkForm, reference: e.target.value })}
                      placeholder="Payment reference"
                      className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-md bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loading ? 'Initiating...' : 'Initiate STK Push'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}

