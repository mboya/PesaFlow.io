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
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <Navigation />

        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Payment Methods
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Set up your payment methods for subscriptions
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-zinc-200 dark:border-zinc-800">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('ratiba')}
                className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                  activeTab === 'ratiba'
                    ? 'border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50'
                    : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                }`}
              >
                Ratiba (Standing Order)
              </button>
              <button
                onClick={() => setActiveTab('stk_push')}
                className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                  activeTab === 'stk_push'
                    ? 'border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50'
                    : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                }`}
              >
                STK Push
              </button>
            </nav>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 dark:bg-red-900/20 dark:border-red-800">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4 dark:bg-green-900/20 dark:border-green-800">
              <p className="text-green-800 dark:text-green-200">{success}</p>
            </div>
          )}

          {/* Ratiba Form */}
          {activeTab === 'ratiba' && (
            <div className="rounded-lg bg-white shadow dark:bg-zinc-900">
              <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Setup Ratiba (Standing Order)
                </h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Set up automatic recurring payments via M-Pesa Standing Order
                </p>
              </div>
              <form onSubmit={handleRatibaSubmit} className="p-6">
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
                    className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {loading ? 'Setting up...' : 'Setup Ratiba'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STK Push Form */}
          {activeTab === 'stk_push' && (
            <div className="rounded-lg bg-white shadow dark:bg-zinc-900">
              <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Initiate STK Push
                </h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Make a one-time payment via M-Pesa STK Push
                </p>
              </div>
              <form onSubmit={handleStkPushSubmit} className="p-6">
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
                    className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
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

