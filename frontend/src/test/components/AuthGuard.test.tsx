import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthGuard } from '../../components/AuthGuard';
import { useAuth } from '../../contexts/AuthContext';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => '/'),
}));

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('AuthGuard', () => {
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace: mockReplace,
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    } as any);
    vi.mocked(usePathname).mockReturnValue('/');
  });

  it('should show loading state while checking auth', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      isAuthenticated: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
      otpRequired: false,
      otpUserId: null,
      verifyOtpLogin: vi.fn(),
      clearOtpState: vi.fn(),
    } as any);

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should redirect to login when not authenticated and requireAuth is true', async () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard'); // Different from redirect target
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
      otpRequired: false,
      otpUserId: null,
      verifyOtpLogin: vi.fn(),
      clearOtpState: vi.fn(),
    } as any);

    render(
      <AuthGuard requireAuth={true}>
        <div>Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('should render children when authenticated and requireAuth is true', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      created_at: '2024-01-01T00:00:00.000Z',
      otp_enabled: false,
    };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      isAuthenticated: true,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
      otpRequired: false,
      otpUserId: null,
      verifyOtpLogin: vi.fn(),
      clearOtpState: vi.fn(),
    } as any);

    render(
      <AuthGuard requireAuth={true}>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to dashboard when authenticated and requireAuth is false', async () => {
    vi.mocked(usePathname).mockReturnValue('/login'); // Different from redirect target
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      created_at: '2024-01-01T00:00:00.000Z',
      otp_enabled: false,
    };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      isAuthenticated: true,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
      otpRequired: false,
      otpUserId: null,
      verifyOtpLogin: vi.fn(),
      clearOtpState: vi.fn(),
    } as any);

    render(
      <AuthGuard requireAuth={false}>
        <div>Login Page</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should render children when not authenticated and requireAuth is false', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
      otpRequired: false,
      otpUserId: null,
      verifyOtpLogin: vi.fn(),
      clearOtpState: vi.fn(),
    } as any);

    render(
      <AuthGuard requireAuth={false}>
        <div>Login Page</div>
      </AuthGuard>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('should use custom redirectTo when provided', async () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard'); // Different from redirect target
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
      otpRequired: false,
      otpUserId: null,
      verifyOtpLogin: vi.fn(),
      clearOtpState: vi.fn(),
    } as any);

    render(
      <AuthGuard requireAuth={true} redirectTo="/custom-login">
        <div>Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/custom-login');
    });
  });
});

