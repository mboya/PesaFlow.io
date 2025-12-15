'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, User } from '@/lib/auth-api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  otpRequired: boolean;
  otpUserId: number | null;
  verifyOtpLogin: (otpCode: string) => Promise<void>;
  clearOtpState: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpUserId, setOtpUserId] = useState<number | null>(null);

  const checkAuth = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('authToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    
    if (response.otp_required && response.user_id) {
      // OTP is required, don't set user yet
      setOtpRequired(true);
      setOtpUserId(response.user_id);
      return;
    }

    // Login successful, no OTP required
    if (response.data) {
      setUser(response.data);
      setOtpRequired(false);
      setOtpUserId(null);
    }
  };

  const verifyOtpLogin = async (otpCode: string) => {
    if (!otpUserId) {
      throw new Error('No user ID for OTP verification');
    }

    const { user: loggedInUser } = await authApi.verifyOtpLogin({
      user_id: otpUserId,
      otp_code: otpCode,
    });

    setUser(loggedInUser);
    setOtpRequired(false);
    setOtpUserId(null);
  };

  const signup = async (email: string, password: string) => {
    const { user: newUser } = await authApi.signup({ email, password });
    setUser(newUser);
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    setOtpRequired(false);
    setOtpUserId(null);
  };

  const clearOtpState = () => {
    setOtpRequired(false);
    setOtpUserId(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        checkAuth,
        otpRequired,
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

