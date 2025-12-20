'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { Navigation } from '@/components/Navigation';
import { profileApi } from '@/lib/api';
import { Customer } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/auth-api';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const { user, checkAuth } = useAuth();
  const [profile, setProfile] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [tenantSubdomain, setTenantSubdomain] = useState<string>('Not available');

  // OTP/2FA state
  const [otpSetupData, setOtpSetupData] = useState<{ secret: string; qr_code: string; provisioning_uri: string } | null>(null);
  const [otpVerificationCode, setOtpVerificationCode] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [showDisableOtp, setShowDisableOtp] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableOtpCode, setDisableOtpCode] = useState('');
  const [disablingOtp, setDisablingOtp] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [regeneratePassword, setRegeneratePassword] = useState('');
  const [regeneratingBackupCodes, setRegeneratingBackupCodes] = useState(false);

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
    setProfileError(null);
    setProfileSuccess(null);

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
      setProfileSuccess('Profile updated successfully!');
    } catch (err: any) {
      setProfileError(err.response?.data?.errors?.join(', ') || 'Failed to update profile');
      console.error('Profile update error:', err);
    } finally {
      setSaving(false);
    }
  };

  // OTP Management Functions
  const handleEnableOtp = async () => {
    try {
      setError(null);
      setSuccess(null);
      const response = await authApi.enableOtp();
      setOtpSetupData(response.data);
      setSuccess('QR code generated. Scan it with your authenticator app.');
    } catch (err: any) {
      setError(err.response?.data?.status?.message || 'Failed to enable 2FA');
      console.error('Enable OTP error:', err);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpVerificationCode || otpVerificationCode.length !== 6) {
      setError('Please enter a valid 6-digit OTP code');
      return;
    }

    try {
      setOtpVerifying(true);
      setError(null);
      const response = await authApi.verifyOtp(otpVerificationCode);
      setBackupCodes(response.backup_codes || []);
      setShowBackupCodes(true);
      setOtpSetupData(null);
      setOtpVerificationCode('');
      setSuccess('2FA enabled successfully! Please save your backup codes.');
      // Refresh user data to update otp_enabled status
      await checkAuth();
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      console.error('Error response:', err.response?.data);
      const errorMessage = err.response?.data?.status?.message || err.response?.data?.message || err.message || 'Invalid OTP code';
      setError(errorMessage);
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleDisableOtp = async () => {
    if (!disablePassword || !disableOtpCode) {
      setError('Password and OTP code are required');
      return;
    }

    try {
      setDisablingOtp(true);
      setError(null);
      await authApi.disableOtp(disablePassword, disableOtpCode);
      setShowDisableOtp(false);
      setDisablePassword('');
      setDisableOtpCode('');
      setSuccess('2FA disabled successfully');
      // Refresh user data
      await checkAuth();
    } catch (err: any) {
      setError(err.response?.data?.status?.message || 'Failed to disable 2FA');
      console.error('Disable OTP error:', err);
    } finally {
      setDisablingOtp(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!regeneratePassword) {
      setError('Password is required to regenerate backup codes');
      return;
    }

    try {
      setRegeneratingBackupCodes(true);
      setError(null);
      const codes = await authApi.generateBackupCodes(regeneratePassword);
      setBackupCodes(codes);
      setRegeneratePassword('');
      setSuccess('Backup codes regenerated. Please save them now.');
    } catch (err: any) {
      setError(err.response?.data?.status?.message || 'Failed to regenerate backup codes');
      console.error('Regenerate backup codes error:', err);
    } finally {
      setRegeneratingBackupCodes(false);
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
            <>
              {/* Global Error/Success Messages */}
              {error && (
                <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 dark:bg-red-900/20 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
              {success && (
                <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4 dark:bg-green-900/20 dark:border-green-800">
                  <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Profile Card */}
              <div className="rounded-lg bg-white shadow dark:bg-zinc-900">
                <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    Profile Information
                  </h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {profileError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 dark:bg-red-900/20 dark:border-red-800">
                      <p className="text-sm text-red-800 dark:text-red-200">{profileError}</p>
                    </div>
                  )}
                  {profileSuccess && (
                    <div className="rounded-lg bg-green-50 border border-green-200 p-3 dark:bg-green-900/20 dark:border-green-800">
                      <p className="text-sm text-green-800 dark:text-green-200">{profileSuccess}</p>
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

              {/* Two-Factor Authentication Card */}
              <div className="rounded-lg bg-white shadow dark:bg-zinc-900">
                <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    Two-Factor Authentication
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  {/* Current Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">2FA Status</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      user?.otp_enabled
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}>
                      {user?.otp_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  {!user?.otp_enabled ? (
                    /* Enable 2FA Flow */
                    <>
                      {!otpSetupData ? (
                        <div>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                            Add an extra layer of security to your account by enabling two-factor authentication.
                          </p>
                          <button
                            onClick={handleEnableOtp}
                            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                          >
                            Enable 2FA
                          </button>
                        </div>
                      ) : (
                        /* QR Code and Verification */
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
                            </p>
                            {otpSetupData.qr_code && (
                              <div className="flex justify-center mb-4">
                                <img src={otpSetupData.qr_code} alt="2FA QR Code" className="w-48 h-48 border border-zinc-300 dark:border-zinc-700" />
                              </div>
                            )}
                            {otpSetupData.provisioning_uri && (
                              <div className="mb-4">
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Or enter this code manually:</p>
                                <code className="block p-2 bg-zinc-100 dark:bg-zinc-800 rounded text-xs break-all font-mono">
                                  {otpSetupData.secret}
                                </code>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                              Enter 6-digit code from your app
                            </label>
                            <input
                              type="text"
                              value={otpVerificationCode}
                              onChange={(e) => setOtpVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="000000"
                              maxLength={6}
                              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleVerifyOtp}
                              disabled={otpVerifying || otpVerificationCode.length !== 6}
                              className="flex-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                            >
                              {otpVerifying ? 'Verifying...' : 'Verify & Enable'}
                            </button>
                            <button
                              onClick={() => {
                                setOtpSetupData(null);
                                setOtpVerificationCode('');
                                setError(null);
                              }}
                              className="px-4 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Disable 2FA and Backup Codes */
                    <div className="space-y-4">
                      {!showDisableOtp ? (
                        <>
                          <div className="space-y-2">
                            <button
                              onClick={() => setShowDisableOtp(true)}
                              className="w-full rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                              Disable 2FA
                            </button>
                            <button
                              onClick={() => setShowBackupCodes(!showBackupCodes)}
                              className="w-full rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                            >
                              {showBackupCodes ? 'Hide Backup Codes' : 'View Backup Codes'}
                            </button>
                          </div>

                          {showBackupCodes && (
                            <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                              <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                  Regenerate Backup Codes
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="password"
                                    value={regeneratePassword}
                                    onChange={(e) => setRegeneratePassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                                  />
                                  <button
                                    onClick={handleRegenerateBackupCodes}
                                    disabled={!regeneratePassword || regeneratingBackupCodes}
                                    className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                  >
                                    {regeneratingBackupCodes ? '...' : 'Regenerate'}
                                  </button>
                                </div>
                              </div>
                              {backupCodes && backupCodes.length > 0 && (
                                <div>
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                                    Save these codes in a secure place. You can use them to access your account if you lose your device.
                                  </p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {backupCodes.map((code, index) => (
                                      <code key={index} className="block p-2 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono text-center">
                                        {code}
                                      </code>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        /* Disable 2FA Form */
                        <div className="space-y-4">
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            To disable 2FA, please enter your password and a code from your authenticator app.
                          </p>
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                              Password
                            </label>
                            <input
                              type="password"
                              value={disablePassword}
                              onChange={(e) => setDisablePassword(e.target.value)}
                              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                              OTP Code
                            </label>
                            <input
                              type="text"
                              value={disableOtpCode}
                              onChange={(e) => setDisableOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="000000 or backup code"
                              maxLength={10}
                              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleDisableOtp}
                              disabled={disablingOtp || !disablePassword || !disableOtpCode}
                              className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              {disablingOtp ? 'Disabling...' : 'Disable 2FA'}
                            </button>
                            <button
                              onClick={() => {
                                setShowDisableOtp(false);
                                setDisablePassword('');
                                setDisableOtpCode('');
                                setError(null);
                              }}
                              className="px-4 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            </>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}

