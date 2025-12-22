import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import Home from '../../app/page';
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

describe('Home Page', () => {
  const mockReplace = vi.fn();
  const mockPathname = vi.fn(() => '/');

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

  it('should show loading state initially', () => {
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

    render(<Home />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should redirect to dashboard when authenticated', async () => {
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

    render(<Home />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should redirect to login when not authenticated', async () => {
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

    render(<Home />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });
});

