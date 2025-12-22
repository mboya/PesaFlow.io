import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../lib/auth-api';
import { ReactNode } from 'react';

// Mock the auth API
vi.mock('../../lib/auth-api', () => ({
  authApi: {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    verifyOtpLogin: vi.fn(),
  },
}));

// Test component that uses auth
function TestComponent() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (isAuthenticated) return <div>Authenticated: {user?.email}</div>;
  return <div>Not authenticated</div>;
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should provide loading state initially', async () => {
    localStorage.setItem('authToken', 'test-token');
    vi.mocked(authApi.getCurrentUser).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should show loading while checking auth
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should set user when token exists and getCurrentUser succeeds', async () => {
    localStorage.setItem('authToken', 'test-token');
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      created_at: '2024-01-01T00:00:00.000Z',
      otp_enabled: false,
    };

    vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Authenticated: test@example.com/)).toBeInTheDocument();
    });
  });

  it('should clear user when getCurrentUser fails', async () => {
    localStorage.setItem('authToken', 'invalid-token');
    // Mock an axios-like error with 401 status
    const axiosError = {
      response: {
        status: 401,
      },
      message: 'Unauthorized',
    };
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(axiosError);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Not authenticated')).toBeInTheDocument();
      expect(localStorage.getItem('authToken')).toBeNull();
    });
  });
});

