'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import {
  AuthGuard,
  Navigation,
  BackgroundDecorations,
  PageHeader,
  LoadingState,
  ErrorState,
  StatusBadge,
} from '@/components';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { profileApi } from '@/lib/api';
import { authApi } from '@/lib/auth-api';
import { formatPhoneNumber, getApiErrorMessage } from '@/lib/utils';
import type { Customer } from '@/lib/types';

export default function SettingsPage() {
  const { user, checkAuth } = useAuth();
  const { success: showSuccess, error: showError } = useToast();

  const [profile, setProfile] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [tenantSubdomain, setTenantSubdomain] = useState<string>('Not available');

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
    if (typeof window !== 'undefined') {
      const subdomain = user?.tenant_subdomain || localStorage.getItem('tenantSubdomain') || 'Not available';
      setTenantSubdomain(subdomain);
    }
  }, [user?.tenant_subdomain]);

  const loadProfile = async () => {
    if (typeof window === 'undefined') return;

    try {
      setLoading(true);
      const { data } = await profileApi.get();
      setProfile(data);
      setName(data.name || '');
      setPhoneNumber(data.phone_number || '');
      setError(null);
    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error, 'Failed to load profile');
      setError(errorMessage);
      console.error('Profile load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
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
      setSuccess('Profile updated successfully.');
      showSuccess('Profile updated successfully.');
    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error, 'Failed to update profile');
      setError(errorMessage);
      showError(errorMessage);
      console.error('Profile update error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEnableOtp = async () => {
    try {
      setError(null);
      setSuccess(null);
      const response = await authApi.enableOtp();
      setOtpSetupData(response.data);
      const message = 'QR code generated. Scan it with your authenticator app.';
      setSuccess(message);
      showSuccess(message);
    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error, 'Failed to enable 2FA');
      setError(errorMessage);
      showError(errorMessage);
      console.error('Enable OTP error:', error);
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
      const message = '2FA enabled successfully. Save your backup codes.';
      setSuccess(message);
      showSuccess(message);
      await checkAuth();
    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error, 'Invalid OTP code');
      setError(errorMessage);
      showError(errorMessage);
      console.error('Verify OTP error:', error);
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
      const message = '2FA disabled successfully';
      setSuccess(message);
      showSuccess(message);
      await checkAuth();
    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error, 'Failed to disable 2FA');
      setError(errorMessage);
      showError(errorMessage);
      console.error('Disable OTP error:', error);
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
      const message = 'Backup codes regenerated. Save them now.';
      setSuccess(message);
      showSuccess(message);
    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error, 'Failed to regenerate backup codes');
      setError(errorMessage);
      showError(errorMessage);
      console.error('Regenerate backup codes error:', error);
    } finally {
      setRegeneratingBackupCodes(false);
    }
  };

  return (
    <AuthGuard>
      <div className="app-shell">
        <BackgroundDecorations />
        <Navigation />

        <main className="app-main relative">
          <PageHeader
            title="Settings"
            description="Manage profile information, tenant details, and account security."
          />

          {loading ? (
            <LoadingState message="Loading settings..." />
          ) : (
            <>
              {error && <ErrorState message={error} onDismiss={() => setError(null)} className="mb-6" />}
              {success && <div className="app-alert-success mb-6">{success}</div>}

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="app-card lg:col-span-1">
                  <div className="app-card-header">
                    <h2 className="app-section-title">Profile Information</h2>
                  </div>

                  <form onSubmit={handleProfileSubmit} className="app-card-body space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Name</label>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="app-input" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700">Email</label>
                      <input type="email" value={profile?.email || ''} disabled className="app-input" />
                      <p className="mt-1 text-xs text-slate-500">Email cannot be changed.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700">M-Pesa Phone Number</label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="0712345678"
                        className="app-input"
                      />
                      <p className="mt-1 text-xs text-slate-500">Used for STK Push and Standing Orders.</p>
                    </div>

                    <button type="submit" disabled={saving} className="app-btn-primary w-full">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </form>
                </div>

                <div className="app-card lg:col-span-1">
                  <div className="app-card-header">
                    <h2 className="app-section-title">Account & Tenant</h2>
                  </div>

                  <div className="app-card-body space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Tenant Subdomain</label>
                      <input type="text" value={tenantSubdomain} disabled className="app-input font-mono" />
                      <p className="mt-1 text-xs text-slate-500">
                        Automatically generated from your email during registration.
                      </p>
                    </div>

                    {user?.tenant_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Tenant ID</span>
                        <span className="font-mono text-sm text-slate-900">{user.tenant_id}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Status</span>
                      <StatusBadge status={profile?.status || 'unknown'} type="subscription" />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Standing Orders</span>
                      <StatusBadge status={profile?.standing_order_enabled ? 'active' : 'suspended'} type="subscription" />
                    </div>

                    {profile?.last_payment_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Last Payment</span>
                        <span className="text-sm text-slate-900">{new Date(profile.last_payment_at).toLocaleDateString()}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Member Since</span>
                      <span className="text-sm text-slate-900">
                        {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}
                      </span>
                    </div>

                    <Link href="/system-status" className="app-btn-secondary w-full">
                      System Status
                    </Link>
                  </div>
                </div>

                <div className="app-card lg:col-span-1">
                  <div className="app-card-header">
                    <h2 className="app-section-title">Two-Factor Authentication</h2>
                  </div>

                  <div className="app-card-body space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">2FA Status</span>
                      <StatusBadge status={user?.otp_enabled ? 'active' : 'suspended'} type="subscription" />
                    </div>

                    {!user?.otp_enabled ? (
                      <>
                        {!otpSetupData ? (
                          <div>
                            <p className="mb-4 text-sm text-slate-600">
                              Add an extra layer of security using Google Authenticator, Authy, or another TOTP app.
                            </p>
                            <button onClick={handleEnableOtp} className="app-btn-primary w-full">
                              Enable 2FA
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <p className="text-sm text-slate-600">Scan this QR code with your authenticator app.</p>
                            {otpSetupData.qr_code && (
                              <div className="flex justify-center">
                                <Image
                                  src={otpSetupData.qr_code}
                                  alt="2FA QR Code"
                                  width={192}
                                  height={192}
                                  unoptimized
                                  className="h-48 w-48 rounded-xl border border-slate-200 bg-white p-2"
                                />
                              </div>
                            )}
                            <div>
                              <p className="mb-1 text-xs text-slate-500">Manual setup code</p>
                              <code className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                                {otpSetupData.secret}
                              </code>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700">Enter 6-digit code</label>
                              <input
                                type="text"
                                value={otpVerificationCode}
                                onChange={(e) => setOtpVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                maxLength={6}
                                className="app-input"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleVerifyOtp}
                                disabled={otpVerifying || otpVerificationCode.length !== 6}
                                className="app-btn-primary flex-1"
                              >
                                {otpVerifying ? 'Verifying...' : 'Verify & Enable'}
                              </button>
                              <button
                                onClick={() => {
                                  setOtpSetupData(null);
                                  setOtpVerificationCode('');
                                  setError(null);
                                }}
                                className="app-btn-secondary !rounded-xl !px-4"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-4">
                        {!showDisableOtp ? (
                          <>
                            <button onClick={() => setShowDisableOtp(true)} className="app-btn-danger w-full">
                              Disable 2FA
                            </button>
                            <button onClick={() => setShowBackupCodes((prev) => !prev)} className="app-btn-secondary w-full">
                              {showBackupCodes ? 'Hide Backup Codes' : 'View Backup Codes'}
                            </button>

                            {showBackupCodes && (
                              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                                <div>
                                  <label className="block text-sm font-medium text-slate-700">Regenerate Backup Codes</label>
                                  <div className="mt-2 flex gap-2">
                                    <input
                                      type="password"
                                      value={regeneratePassword}
                                      onChange={(e) => setRegeneratePassword(e.target.value)}
                                      placeholder="Enter your password"
                                      className="app-input mt-0"
                                    />
                                    <button
                                      onClick={handleRegenerateBackupCodes}
                                      disabled={!regeneratePassword || regeneratingBackupCodes}
                                      className="app-btn-primary !rounded-xl !px-4"
                                    >
                                      {regeneratingBackupCodes ? '...' : 'Regenerate'}
                                    </button>
                                  </div>
                                </div>

                                {backupCodes && backupCodes.length > 0 && (
                                  <div>
                                    <p className="mb-2 text-xs text-slate-500">
                                      Save these codes in a secure place. Use them if your authenticator is unavailable.
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                      {backupCodes.map((code, index) => (
                                        <code
                                          key={index}
                                          className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-center font-mono text-xs text-slate-700"
                                        >
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
                          <div className="space-y-4">
                            <p className="text-sm text-slate-600">
                              Enter your password and a current authenticator code to disable 2FA.
                            </p>
                            <div>
                              <label className="block text-sm font-medium text-slate-700">Password</label>
                              <input
                                type="password"
                                value={disablePassword}
                                onChange={(e) => setDisablePassword(e.target.value)}
                                className="app-input"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700">OTP / Backup Code</label>
                              <input
                                type="text"
                                value={disableOtpCode}
                                onChange={(e) => setDisableOtpCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="000000 or backup code"
                                maxLength={10}
                                className="app-input"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleDisableOtp}
                                disabled={disablingOtp || !disablePassword || !disableOtpCode}
                                className="app-btn-danger flex-1"
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
                                className="app-btn-secondary !rounded-xl !px-4"
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
