'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { AuthGuard } from '@/components';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
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

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const router = useRouter();

  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordChecks, setPasswordChecks] = useState({
    minLength: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('authToken');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  useEffect(() => {
    const checks = {
      minLength: password.length >= 6,
    };
    setPasswordChecks(checks);
    setPasswordStrength(Object.values(checks).filter(Boolean).length * 100);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await signup(email, password);
      showSuccess('Account created successfully! Redirecting...');
      router.push('/dashboard');
    } catch (error: unknown) {
      const rateLimitInfo = extractRateLimitInfo(error);
      if (rateLimitInfo) {
        const errorMessage = getRateLimitErrorMessage(error);
        setError(errorMessage);
        showError(errorMessage);
      } else {
        const errorMessage = getApiErrorMessage(error, 'Signup failed');
        setError(errorMessage);
        showError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard requireAuth={false}>
      <AuthFrame>
        <div className="app-card p-8">
          <Link href="/" className="mb-6 inline-flex items-center text-sm text-slate-600 transition hover:text-slate-900">
            Back to home
          </Link>

          <div className="mb-6 text-center">
            <h1 className="font-display text-3xl font-semibold text-slate-900">Create your account</h1>
            <p className="mt-2 text-sm text-slate-600">Start managing subscriptions with PesaFlow.</p>
            <p className="mt-4 text-sm text-slate-600">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-teal-700 transition hover:text-teal-600">
                Sign in
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
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="app-input"
                placeholder="Create a password"
              />
              {password && (
                <div className="mt-2 space-y-2">
                  <div className="h-1.5 rounded-full bg-slate-200">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        passwordStrength >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${passwordStrength}%` }}
                    />
                  </div>
                  <div className={`text-xs ${passwordChecks.minLength ? 'text-emerald-700' : 'text-slate-500'}`}>
                    At least 6 characters
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`app-input ${
                  confirmPassword && password === confirmPassword
                    ? '!border-emerald-400 focus:!border-emerald-500 focus:!ring-emerald-500/20'
                    : confirmPassword && password !== confirmPassword
                      ? '!border-red-400 focus:!border-red-500 focus:!ring-red-500/20'
                      : ''
                }`}
                placeholder="Confirm your password"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-700">Passwords do not match</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="app-btn-primary w-full">
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>
      </AuthFrame>
    </AuthGuard>
  );
}
