'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import Link from 'next/link';
import { Zap, Mail, Lock, Shield, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, otpRequired, verifyOtpLogin, otpUserId, clearOtpState } = useAuth();
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
    setLoading(true);

    try {
      await login(email, password);
      // If OTP is required, stay on page to show OTP input
      // Otherwise, redirect to dashboard
      if (!otpRequired) {
        // Redirect to dashboard after successful login
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('authToken');
          if (!token) {
            setError('Login succeeded but token was not stored. Please try again.');
            return;
          }
        }
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.errors?.[0] || err.message || 'Login failed');
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
    } catch (err: any) {
      setError(err.response?.data?.status?.message || 'Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

  if (otpRequired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950 dark:via-purple-950 dark:to-pink-950 px-4 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="w-full max-w-md space-y-8 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-8 shadow-2xl border border-white/20 dark:border-zinc-800/50 relative z-10">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Two-Factor Authentication
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <form onSubmit={handleOtpSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="otp_code" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                OTP Code
              </label>
              <div className="relative">
                <input
                  id="otp_code"
                  name="otp_code"
                  type="text"
                  maxLength={6}
                  required
                  className="block w-full rounded-lg border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-center text-2xl font-mono tracking-widest text-zinc-900 placeholder-zinc-400 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-zinc-50 dark:placeholder-zinc-500"
                  placeholder="000000"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify OTP
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => clearOtpState()}
                className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Back to login
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard requireAuth={false}>
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950 dark:via-purple-950 dark:to-pink-950 px-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-blue-300/10 to-purple-300/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="w-full max-w-md space-y-8 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-8 shadow-2xl border border-white/20 dark:border-zinc-800/50 relative z-10 animate-scale-in">
          <div className="text-center">
            {/* Logo/Brand */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-lg">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Sign in to your PesaFlow account
            </p>
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              Don't have an account?{' '}
              <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                Sign up
              </Link>
            </p>
          </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 p-4 text-sm text-red-800 dark:text-red-400 animate-fade-in-up">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
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
                  className="block w-full rounded-lg border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-10 pr-4 py-3 text-zinc-900 placeholder-zinc-400 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-zinc-50 dark:placeholder-zinc-500"
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
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-10 pr-4 py-3 text-zinc-900 placeholder-zinc-400 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-zinc-50 dark:placeholder-zinc-500"
                  placeholder="Enter your password"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
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

