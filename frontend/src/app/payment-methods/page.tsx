'use client';

import { useState } from 'react';

import {
  AuthGuard,
  Navigation,
  PageHeader,
  BackgroundDecorations,
  ErrorState,
} from '@/components';
import { paymentMethodsApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/utils';

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
      setSuccess('Ratiba setup initiated. Check your phone for M-Pesa approval.');
      setRatibaForm({ phone_number: '', amount: '', reference: '' });
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Failed to setup Ratiba'));
      console.error('Ratiba error:', error);
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
      setSuccess('STK Push initiated. Check your phone for M-Pesa prompt.');
      setStkForm({ phone_number: '', amount: '', reference: '' });
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Failed to initiate STK Push'));
      console.error('STK Push error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="app-shell">
        <BackgroundDecorations />
        <Navigation />

        <main className="app-main-narrow relative">
          <PageHeader
            title="Payment Methods"
            description="Configure your default M-Pesa collection channels."
          />

          <div className="mb-6 inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('ratiba')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'ratiba' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ratiba
            </button>
            <button
              onClick={() => setActiveTab('stk_push')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'stk_push' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              STK Push
            </button>
          </div>

          {error && (
            <div className="mb-6">
              <ErrorState message={error} onDismiss={() => setError(null)} />
            </div>
          )}

          {success && <div className="app-alert-success mb-6">{success}</div>}

          {activeTab === 'ratiba' && (
            <div className="app-card">
              <div className="app-card-header">
                <h2 className="app-section-title">Setup Ratiba Standing Order</h2>
                <p className="mt-1 text-sm text-slate-600">Authorize recurring debits for ongoing subscriptions.</p>
              </div>
              <form onSubmit={handleRatibaSubmit} className="app-card-body space-y-4">
                <div>
                  <label htmlFor="ratiba_phone" className="block text-sm font-medium text-slate-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="ratiba_phone"
                    required
                    value={ratibaForm.phone_number}
                    onChange={(e) => setRatibaForm({ ...ratibaForm, phone_number: e.target.value })}
                    placeholder="254712345678"
                    className="app-input"
                  />
                </div>
                <div>
                  <label htmlFor="ratiba_amount" className="block text-sm font-medium text-slate-700">
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
                    className="app-input"
                  />
                </div>
                <div>
                  <label htmlFor="ratiba_reference" className="block text-sm font-medium text-slate-700">
                    Reference
                  </label>
                  <input
                    type="text"
                    id="ratiba_reference"
                    required
                    value={ratibaForm.reference}
                    onChange={(e) => setRatibaForm({ ...ratibaForm, reference: e.target.value })}
                    placeholder="Subscription reference"
                    className="app-input"
                  />
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={loading} className="app-btn-primary w-full">
                    {loading ? 'Setting up...' : 'Setup Ratiba'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'stk_push' && (
            <div className="app-card">
              <div className="app-card-header">
                <h2 className="app-section-title">Initiate STK Push</h2>
                <p className="mt-1 text-sm text-slate-600">Trigger one-time customer collection prompts.</p>
              </div>
              <form onSubmit={handleStkPushSubmit} className="app-card-body space-y-4">
                <div>
                  <label htmlFor="stk_phone" className="block text-sm font-medium text-slate-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="stk_phone"
                    required
                    value={stkForm.phone_number}
                    onChange={(e) => setStkForm({ ...stkForm, phone_number: e.target.value })}
                    placeholder="254712345678"
                    className="app-input"
                  />
                </div>
                <div>
                  <label htmlFor="stk_amount" className="block text-sm font-medium text-slate-700">
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
                    className="app-input"
                  />
                </div>
                <div>
                  <label htmlFor="stk_reference" className="block text-sm font-medium text-slate-700">
                    Reference
                  </label>
                  <input
                    type="text"
                    id="stk_reference"
                    required
                    value={stkForm.reference}
                    onChange={(e) => setStkForm({ ...stkForm, reference: e.target.value })}
                    placeholder="Payment reference"
                    className="app-input"
                  />
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={loading} className="app-btn-primary w-full">
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
