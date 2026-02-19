'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { AuthGuard } from '@/components';
import { useAuth } from '@/contexts/AuthContext';
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
  const { login, otpRequired, verifyOtpLogin, clearOtpState } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('authToken');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      if (!otpRequired) {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('authToken');
          if (!token) {
            setError('Login succeeded but token was not stored. Please try again.');
            return;
          }
        }
        router.push('/dashboard');
      }
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
            <p className="mt-2 text-sm text-slate-600">Sign in to your PesaFlow workspace.</p>
            <p className="mt-4 text-sm text-slate-600">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-semibold text-teal-700 transition hover:text-teal-600">
                Sign up
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
        </div>
      </AuthFrame>
    </AuthGuard>
  );
}
