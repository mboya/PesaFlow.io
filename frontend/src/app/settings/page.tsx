'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { Navigation } from '@/components/Navigation';
import { profileApi } from '@/lib/api';
import { Customer } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/auth-api';
import { formatPhoneNumber } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Settings, User, Building2, Shield } from 'lucide-react';

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
      <div className="min-h-screen bg-white relative">
        {/* Subtle background decorative elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-zinc-200/10 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-zinc-200/10 to-transparent rounded-full blur-3xl"></div>
        </div>
        
        <Navigation />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 relative">
          <div className="mb-8 flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl blur opacity-50"></div>
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                <Settings className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                Settings
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Manage your account and payment preferences
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900" />
            </div>
          ) : (
            <>
              {/* Global Error/Success Messages */}
              {error && (
                <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              {success && (
                <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Profile Card */}
              <div className="rounded-2xl bg-zinc-50 border border-zinc-200/50 shadow-sm">
                <div className="border-b border-zinc-200/50 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg blur opacity-50"></div>
                      <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <h2 className="text-lg font-semibold text-zinc-900">
                      Profile Information
                    </h2>
                  </div>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {profileError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                      <p className="text-sm text-red-800">{profileError}</p>
                    </div>
                  )}
                  {profileSuccess && (
                    <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                      <p className="text-sm text-green-800">{profileSuccess}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-zinc-700">
                      Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="mt-1 block w-full rounded-md border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-500"
                    />
                    <p className="mt-1 text-xs text-zinc-500">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700">
                      M-Pesa Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="0712345678"
                      className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 bg-white"
                    />
                    <p className="mt-1 text-xs text-zinc-500">
                      Used for M-Pesa payments (STK Push & Standing Orders)
                    </p>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Account Status & Tenant Information Card */}
              <div className="rounded-2xl bg-zinc-50 border border-zinc-200/50 shadow-sm">
                <div className="border-b border-zinc-200/50 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg blur opacity-50"></div>
                      <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg">
                        <Building2 className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <h2 className="text-lg font-semibold text-zinc-900">
                      Account & Tenant Information
                    </h2>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {/* Tenant Information Section */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 text-zinc-700 mb-1">
                      Tenant Subdomain
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tenantSubdomain}
                        disabled
                        className="flex-1 rounded-md border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-900 font-mono bg-zinc-100 text-zinc-900"
                      />
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 text-zinc-600">
                      Your unique tenant identifier. This is automatically generated from your email during registration.
                    </p>
                  </div>

                  {user?.tenant_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-600">Tenant ID</span>
                      <span className="text-sm text-zinc-900 font-mono">
                        {user.tenant_id}
                      </span>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="border-t border-zinc-200 border-zinc-200 pt-4 mt-4"></div>

                  {/* Account Status Section */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-600">Status</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      profile?.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800 bg-yellow-100 text-yellow-800'
                    }`}>
                      {profile?.status || 'Unknown'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-600">Standing Orders</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      profile?.standing_order_enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-zinc-100 text-zinc-800'
                    }`}>
                      {profile?.standing_order_enabled ? 'Enabled' : 'Not Enabled'}
                    </span>
                  </div>

                  {profile?.last_payment_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-600">Last Payment</span>
                      <span className="text-sm text-zinc-900">
                        {new Date(profile.last_payment_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-600">Member Since</span>
                    <span className="text-sm text-zinc-900">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Two-Factor Authentication Card */}
              <div className="rounded-2xl bg-zinc-50 border border-zinc-200/50 shadow-sm">
                <div className="border-b border-zinc-200/50 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg blur opacity-50"></div>
                      <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
                        <Shield className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <h2 className="text-lg font-semibold text-zinc-900">
                      Two-Factor Authentication
                    </h2>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {/* Current Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-600">2FA Status</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      user?.otp_enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-zinc-100 text-zinc-800'
                    }`}>
                      {user?.otp_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  {!user?.otp_enabled ? (
                    /* Enable 2FA Flow */
                    <>
                      {!otpSetupData ? (
                        <div>
                          <p className="text-sm text-zinc-600 mb-4">
                            Add an extra layer of security to your account by enabling two-factor authentication.
                          </p>
                          <button
                            onClick={handleEnableOtp}
                            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800"
                          >
                            Enable 2FA
                          </button>
                        </div>
                      ) : (
                        /* QR Code and Verification */
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-zinc-600 mb-2">
                              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
                            </p>
                            {otpSetupData.qr_code && (
                              <div className="flex justify-center mb-4">
                                <img src={otpSetupData.qr_code} alt="2FA QR Code" className="w-48 h-48 border border-zinc-300" />
                              </div>
                            )}
                            {otpSetupData.provisioning_uri && (
                              <div className="mb-4">
                                <p className="text-xs text-zinc-500 text-zinc-600 mb-1">Or enter this code manually:</p>
                                <code className="block p-2 bg-zinc-100 bg-zinc-100 rounded text-xs break-all font-mono">
                                  {otpSetupData.secret}
                                </code>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 text-zinc-700 mb-1">
                              Enter 6-digit code from your app
                            </label>
                            <input
                              type="text"
                              value={otpVerificationCode}
                              onChange={(e) => setOtpVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="000000"
                              maxLength={6}
                              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 bg-zinc-100 text-zinc-900"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleVerifyOtp}
                              disabled={otpVerifying || otpVerificationCode.length !== 6}
                              className="flex-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 bg-zinc-900 text-white hover:bg-zinc-800"
                            >
                              {otpVerifying ? 'Verifying...' : 'Verify & Enable'}
                            </button>
                            <button
                              onClick={() => {
                                setOtpSetupData(null);
                                setOtpVerificationCode('');
                                setError(null);
                              }}
                              className="px-4 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 text-zinc-600 hover:text-zinc-900"
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
                              className="w-full rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 border-red-300 text-red-700 hover:bg-red-50"
                            >
                              Disable 2FA
                            </button>
                            <button
                              onClick={() => setShowBackupCodes(!showBackupCodes)}
                              className="w-full rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 text-zinc-600"
                            >
                              {showBackupCodes ? 'Hide Backup Codes' : 'View Backup Codes'}
                            </button>
                          </div>

                          {showBackupCodes && (
                            <div className="space-y-4 pt-4 border-t border-zinc-200 border-zinc-200">
                              <div>
                                <label className="block text-sm font-medium text-zinc-700 text-zinc-700 mb-2">
                                  Regenerate Backup Codes
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="password"
                                    value={regeneratePassword}
                                    onChange={(e) => setRegeneratePassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 bg-zinc-100 text-zinc-900"
                                  />
                                  <button
                                    onClick={handleRegenerateBackupCodes}
                                    disabled={!regeneratePassword || regeneratingBackupCodes}
                                    className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 bg-zinc-900 text-white hover:bg-zinc-800"
                                  >
                                    {regeneratingBackupCodes ? '...' : 'Regenerate'}
                                  </button>
                                </div>
                              </div>
                              {backupCodes && backupCodes.length > 0 && (
                                <div>
                                  <p className="text-xs text-zinc-500 text-zinc-600 mb-2">
                                    Save these codes in a secure place. You can use them to access your account if you lose your device.
                                  </p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {backupCodes.map((code, index) => (
                                      <code key={index} className="block p-2 bg-zinc-100 bg-zinc-100 rounded text-xs font-mono text-center">
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
                          <p className="text-sm text-zinc-600">
                            To disable 2FA, please enter your password and a code from your authenticator app.
                          </p>
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 text-zinc-700 mb-1">
                              Password
                            </label>
                            <input
                              type="password"
                              value={disablePassword}
                              onChange={(e) => setDisablePassword(e.target.value)}
                              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 bg-zinc-100 text-zinc-900"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 text-zinc-700 mb-1">
                              OTP Code
                            </label>
                            <input
                              type="text"
                              value={disableOtpCode}
                              onChange={(e) => setDisableOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="000000 or backup code"
                              maxLength={10}
                              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 bg-zinc-100 text-zinc-900"
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
                              className="px-4 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 text-zinc-600 hover:text-zinc-900"
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

