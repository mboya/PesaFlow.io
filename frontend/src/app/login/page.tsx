'use client';

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import Link from 'next/link';

import { AuthGuard } from '@/components';
import { useAuth } from '@/contexts/AuthContext';
import { featureFlags } from '@/lib/feature-flags';
import { getRateLimitErrorMessage, extractRateLimitInfo } from '@/lib/rate-limit-helper';
import { getApiErrorMessage } from '@/lib/utils';

function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4 py-12">
      <div className="landing-grid absolute inset-0 -z-20 opacity-55" aria-hidden="true" />
      <div className="landing-noise absolute inset-0 -z-10 opacity-45" aria-hidden="true" />
      <div className="landing-orb landing-orb-one absolute -left-20 top-10 -z-10 h-72 w-72 rounded-full blur-3xl" aria-hidden="true" />
      <div className="landing-orb landing-orb-two absolute right-0 top-40 -z-10 h-[24rem] w-[24rem] rounded-full blur-3xl" aria-hidden="true" />
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleButtonReady, setGoogleButtonReady] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const { login, loginWithGoogle, otpRequired, verifyOtpLogin, clearOtpState } = useAuth();
  const router = useRouter();
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const passwordAuthEnabled = featureFlags.enablePasswordAuth;

  const redirectToDashboardIfAuthenticated = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('authToken');
    if (!token) return false;
    router.push('/dashboard');
    return true;
  }, [router]);

  const handleGoogleCredential = useCallback(async (credential?: string) => {
    if (!credential) {
      setError('Google login failed. Please try again.');
      return;
    }

    setError('');
    setGoogleLoading(true);

    try {
      await loginWithGoogle(credential);
      redirectToDashboardIfAuthenticated();
    } catch (authError: unknown) {
      const rateLimitInfo = extractRateLimitInfo(authError);
      if (rateLimitInfo) {
        setError(getRateLimitErrorMessage(authError));
      } else {
        setError(getApiErrorMessage(authError, 'Google login failed'));
      }
    } finally {
      setGoogleLoading(false);
    }
  }, [loginWithGoogle, redirectToDashboardIfAuthenticated]);

  const initializeGoogleSignIn = useCallback(() => {
    if (typeof window === 'undefined' || !googleClientId) return;
    if (!window.google?.accounts?.id || !googleButtonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: ({ credential }) => {
        void handleGoogleCredential(credential);
      },
      ux_mode: 'popup',
    });

    googleButtonRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'pill',
      width: 320,
    });
    setGoogleButtonReady(true);
  }, [googleClientId, handleGoogleCredential]);

  useEffect(() => {
    redirectToDashboardIfAuthenticated();
  }, [redirectToDashboardIfAuthenticated]);

  useEffect(() => {
    if (!googleClientId || otpRequired) return;
    initializeGoogleSignIn();
  }, [googleClientId, otpRequired, initializeGoogleSignIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      redirectToDashboardIfAuthenticated();
    } catch (error: unknown) {
      const rateLimitInfo = extractRateLimitInfo(error);
      if (rateLimitInfo) {
        setError(getRateLimitErrorMessage(error));
      } else {
        setError(getApiErrorMessage(error, 'Login failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const otpCode = formData.get('otp_code') as string;

    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit OTP code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await verifyOtpLogin(otpCode);
      router.push('/dashboard');
    } catch (error: unknown) {
      const rateLimitInfo = extractRateLimitInfo(error);
      if (rateLimitInfo) {
        setError(getRateLimitErrorMessage(error));
      } else {
        setError(getApiErrorMessage(error, 'Invalid OTP code'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (otpRequired) {
    return (
      <AuthFrame>
        <div className="app-card p-8">
          <Link href="/" className="mb-6 inline-flex items-center text-sm text-slate-600 transition hover:text-slate-900">
            Back to home
          </Link>

          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl font-semibold text-slate-900">Two-Factor Authentication</h1>
            <p className="mt-2 text-sm text-slate-600">Enter the 6-digit code from your authenticator app.</p>
          </div>

          <form onSubmit={handleOtpSubmit} className="space-y-5">
            {error && (
              <div
                className={`rounded-xl border p-3 text-sm ${
                  error.includes('Too many') || error.includes('rate limit') || error.includes('try again')
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-red-200 bg-red-50 text-red-800'
                }`}
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="otp_code" className="block text-sm font-medium text-slate-700">
                OTP Code
              </label>
              <input
                id="otp_code"
                name="otp_code"
                type="text"
                maxLength={6}
                required
                className="app-input text-center font-mono text-2xl tracking-[0.3em]"
                placeholder="000000"
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
              />
            </div>

            <button type="submit" disabled={loading} className="app-btn-primary w-full">
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <button
              type="button"
              onClick={() => clearOtpState()}
              className="w-full text-center text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              Back to login
            </button>
          </form>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthGuard requireAuth={false}>
      <AuthFrame>
        <div className="app-card p-8">
          <Link href="/" className="mb-6 inline-flex items-center text-sm text-slate-600 transition hover:text-slate-900">
            Back to home
          </Link>

          <div className="mb-6 text-center">
            <h1 className="font-display text-3xl font-semibold text-slate-900">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-600">
              {passwordAuthEnabled ? 'Sign in to your PesaFlow workspace.' : 'Sign in with Google to access your PesaFlow workspace.'}
            </p>
            {passwordAuthEnabled && (
              <p className="mt-4 text-sm text-slate-600">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="font-semibold text-teal-700 transition hover:text-teal-600">
                  Sign up
                </Link>
              </p>
            )}
          </div>

          {error && (
            <div
              className={`rounded-xl border p-4 text-sm ${
                error.includes('Too many') || error.includes('rate limit') || error.includes('try again')
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              <span>{error}</span>
            </div>
          )}

          {passwordAuthEnabled && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="app-input"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="app-input"
                  placeholder="Enter your password"
                />
              </div>

              <button type="submit" disabled={loading} className="app-btn-primary w-full">
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          )}

          {googleClientId && (
            <div className={passwordAuthEnabled ? 'mt-5 space-y-3' : 'space-y-3'}>
              {passwordAuthEnabled && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 font-semibold tracking-wide text-slate-500">or</span>
                  </div>
                </div>
              )}
              <div className="flex flex-col items-center gap-2">
                <div ref={googleButtonRef} className="flex min-h-[40px] w-full items-center justify-center" />
                {!googleButtonReady && !googleLoading && (
                  <p className="text-xs text-slate-500">Loading Google sign-in...</p>
                )}
                {googleLoading && <p className="text-xs text-slate-500">Signing in with Google...</p>}
              </div>
            </div>
          )}

          {!passwordAuthEnabled && !googleClientId && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              No login method is configured. Set <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> or enable password auth.
            </div>
          )}
        </div>
      </AuthFrame>
      {googleClientId && (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={initializeGoogleSignIn}
        />
      )}
    </AuthGuard>
  );
}
