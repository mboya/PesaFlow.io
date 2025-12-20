'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { Navigation } from '@/components/Navigation';
import { profileApi } from '@/lib/api';
import { Customer } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [tenantSubdomain, setTenantSubdomain] = useState<string>('Not available');

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    // Get tenant subdomain from user or localStorage as fallback (client-side only)
    if (typeof window !== 'undefined') {
      const subdomain = user?.tenant_subdomain || localStorage.getItem('tenantSubdomain') || 'Not available';
      setTenantSubdomain(subdomain);
    }
  }, [user?.tenant_subdomain]);

  const loadProfile = async () => {
    // Only make request if we're on the client side
    if (typeof window === 'undefined') {
      return;
    }

    try {
      setLoading(true);
      const { data } = await profileApi.get();
      setProfile(data);
      setName(data.name || '');
      setPhoneNumber(data.phone_number || '');
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load profile';
      setError(errorMessage);
      console.error('Profile load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Format phone number to 254XXXXXXXXX format
  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      return `254${cleaned.slice(1)}`;
    } else if (cleaned.startsWith('7')) {
      return `254${cleaned}`;
    } else if (cleaned.startsWith('254')) {
      return cleaned;
    }
    return cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formattedPhone = formatPhoneNumber(phoneNumber);

    try {
      setSaving(true);
      const { data } = await profileApi.update({
        profile: {
          name: name.trim(),
          phone_number: formattedPhone || undefined,
        },
      });
      setProfile(data);
      setPhoneNumber(data.phone_number || '');
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.response?.data?.errors?.join(', ') || 'Failed to update profile');
      console.error('Profile update error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <Navigation />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Settings
            </h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Manage your account and payment preferences
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-50" />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Profile Card */}
              <div className="rounded-lg bg-white shadow dark:bg-zinc-900">
                <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    Profile Information
                  </h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {error && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 dark:bg-red-900/20 dark:border-red-800">
                      <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                    </div>
                  )}
                  {success && (
                    <div className="rounded-lg bg-green-50 border border-green-200 p-3 dark:bg-green-900/20 dark:border-green-800">
                      <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="mt-1 block w-full rounded-md border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                    />
                    <p className="mt-1 text-xs text-zinc-500">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      M-Pesa Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="0712345678"
                      className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Used for M-Pesa payments (STK Push & Standing Orders)
                    </p>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Account Status & Tenant Information Card */}
              <div className="rounded-lg bg-white shadow dark:bg-zinc-900">
                <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    Account & Tenant Information
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  {/* Tenant Information Section */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Tenant Subdomain
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tenantSubdomain}
                        disabled
                        className="flex-1 rounded-md border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-900 font-mono dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                      />
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Your unique tenant identifier. This is automatically generated from your email during registration.
                    </p>
                  </div>

                  {user?.tenant_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">Tenant ID</span>
                      <span className="text-sm text-zinc-900 dark:text-zinc-50 font-mono">
                        {user.tenant_id}
                      </span>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-4"></div>

                  {/* Account Status Section */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Status</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      profile?.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {profile?.status || 'Unknown'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Standing Orders</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      profile?.standing_order_enabled
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}>
                      {profile?.standing_order_enabled ? 'Enabled' : 'Not Enabled'}
                    </span>
                  </div>

                  {profile?.last_payment_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">Last Payment</span>
                      <span className="text-sm text-zinc-900 dark:text-zinc-50">
                        {new Date(profile.last_payment_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Member Since</span>
                    <span className="text-sm text-zinc-900 dark:text-zinc-50">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}

