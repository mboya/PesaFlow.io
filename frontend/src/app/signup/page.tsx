'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import Link from 'next/link';
import { Zap, Mail, Lock, UserPlus, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { getRateLimitErrorMessage, extractRateLimitInfo } from '@/lib/rate-limit-helper';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    // Only check localStorage on client side
    if (typeof window === 'undefined') return;
    
    const token = localStorage.getItem('authToken');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

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
      // No tenant subdomain needed - backend will auto-generate from email
      await signup(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      // Handle rate limit errors gracefully
      const rateLimitInfo = extractRateLimitInfo(err);
      if (rateLimitInfo) {
        setError(getRateLimitErrorMessage(err));
      } else {
        const errorMessage = err.response?.data?.status?.message || 
                            err.response?.data?.message ||
                            err.response?.data?.errors?.[0] || 
                            err.message || 
                            'Signup failed';
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    minLength: false,
  });

  useEffect(() => {
    const checks = {
      length: password.length > 0,
      minLength: password.length >= 6,
    };
    setPasswordChecks(checks);
    setPasswordStrength(
      Object.values(checks).filter(Boolean).length * 50
    );
  }, [password]);

  return (
    <AuthGuard requireAuth={false}>
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950 dark:via-emerald-950 dark:to-teal-950 px-4 py-12 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-green-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-green-300/10 to-emerald-300/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="w-full max-w-md space-y-8 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-8 shadow-2xl border border-white/20 dark:border-zinc-800/50 relative z-10 animate-scale-in">
          <div className="text-center">
            {/* Logo/Brand */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 mb-4 shadow-lg">
              <UserPlus className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Start managing subscriptions with PesaFlow
            </p>
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors">
                Sign in
              </Link>
            </p>
          </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className={`rounded-lg border-2 p-4 text-sm animate-fade-in-up ${
              error.includes('Too many') || error.includes('rate limit') || error.includes('try again')
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-400'
            }`}>
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0">
                  {error.includes('Too many') || error.includes('rate limit') || error.includes('try again') ? (
                    <Clock className="h-5 w-5" />
                  ) : (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Mail className="h-5 w-5 text-zinc-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-10 pr-4 py-3 text-zinc-900 placeholder-zinc-400 transition-all duration-200 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:text-zinc-50 dark:placeholder-zinc-500"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Lock className="h-5 w-5 text-zinc-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-10 pr-4 py-3 text-zinc-900 placeholder-zinc-400 transition-all duration-200 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:text-zinc-50 dark:placeholder-zinc-500"
                  placeholder="Create a password"
                />
              </div>
              {/* Password strength indicator */}
              {password && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordStrength === 100
                            ? 'bg-green-500'
                            : passwordStrength === 50
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${passwordStrength}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {passwordStrength === 100 ? 'Strong' : passwordStrength === 50 ? 'Medium' : 'Weak'}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className={`flex items-center gap-2 ${passwordChecks.minLength ? 'text-green-600 dark:text-green-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
                      <CheckCircle2 className={`h-3 w-3 ${passwordChecks.minLength ? '' : 'opacity-30'}`} />
                      <span>At least 6 characters</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Lock className="h-5 w-5 text-zinc-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`block w-full rounded-lg border-2 bg-white dark:bg-zinc-800 pl-10 pr-4 py-3 text-zinc-900 placeholder-zinc-400 transition-all duration-200 focus:outline-none focus:ring-2 dark:text-zinc-50 dark:placeholder-zinc-500 ${
                    confirmPassword && password === confirmPassword
                      ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                      : confirmPassword && password !== confirmPassword
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-zinc-200 dark:border-zinc-700 focus:border-green-500 focus:ring-green-500/20'
                  }`}
                  placeholder="Confirm your password"
                />
                {confirmPassword && password === confirmPassword && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                )}
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">Passwords do not match</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:from-green-700 hover:to-emerald-700 hover:shadow-xl hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          </button>
        </form>
      </div>
    </div>
    </AuthGuard>
  );
}

