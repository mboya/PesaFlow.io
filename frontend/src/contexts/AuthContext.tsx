'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, User } from '@/lib/auth-api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  signup: (email: string, password: string, tenantSubdomain?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  otpRequired: boolean;
  otpChallengeToken: string | null;
  otpUserId: number | null;
  verifyOtpLogin: (otpCode: string) => Promise<void>;
  clearOtpState: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpChallengeToken, setOtpChallengeToken] = useState<string | null>(null);
  const [otpUserId, setOtpUserId] = useState<number | null>(null);

  const checkAuth = async () => {
    // Only access localStorage on client side
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      
      // Store tenant information if available from user data
      // The backend will set the tenant from the user's tenant_id
      // We rely on the tenant subdomain being set via localStorage from signup
    } catch (error) {
      // Only log error, don't clear token on 500 errors (might be temporary backend issue)
      const err = error as any;
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        // Only clear token on auth errors
        console.error('Auth check failed:', error);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('authToken');
        }
        setUser(null);
      } else {
        // For other errors (500, network, etc.), keep token but log error
        console.error('Auth check error (non-auth):', error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    
    if (response.otp_required && (response.otp_challenge_token || response.user_id)) {
      // OTP is required, don't set user yet
      setOtpRequired(true);
      setOtpChallengeToken(response.otp_challenge_token || null);
      setOtpUserId(response.user_id || null);
      return;
    }

    // Login successful, no OTP required
    if (response.data) {
      setUser(response.data);
      setOtpRequired(false);
      setOtpChallengeToken(null);
      setOtpUserId(null);
    }
  };

  const loginWithGoogle = async (credential: string) => {
    const response = await authApi.googleLogin(credential);

    if (response.otp_required && (response.otp_challenge_token || response.user_id)) {
      setOtpRequired(true);
      setOtpChallengeToken(response.otp_challenge_token || null);
      setOtpUserId(response.user_id || null);
      return;
    }

    if (response.data) {
      setUser(response.data);
      setOtpRequired(false);
      setOtpChallengeToken(null);
      setOtpUserId(null);
    }
  };

  const verifyOtpLogin = async (otpCode: string) => {
    if (!otpChallengeToken && !otpUserId) {
      throw new Error('No OTP challenge for verification');
    }

    const { user: loggedInUser } = await authApi.verifyOtpLogin({
      otp_challenge_token: otpChallengeToken || undefined,
      user_id: otpUserId || undefined,
      otp_code: otpCode,
    });

    setUser(loggedInUser);
    setOtpRequired(false);
    setOtpChallengeToken(null);
    setOtpUserId(null);
  };

  const signup = async (email: string, password: string, tenantSubdomain?: string) => {
    const { user: newUser } = await authApi.signup({ email, password, tenantSubdomain });
    setUser(newUser);
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    setOtpRequired(false);
    setOtpChallengeToken(null);
    setOtpUserId(null);
  };

  const clearOtpState = () => {
    setOtpRequired(false);
    setOtpChallengeToken(null);
    setOtpUserId(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        loginWithGoogle,
        signup,
        logout,
        checkAuth,
        otpRequired,
        otpChallengeToken,
        otpUserId,
        verifyOtpLogin,
        clearOtpState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
