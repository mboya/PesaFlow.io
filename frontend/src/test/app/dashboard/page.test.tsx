import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import DashboardPage from '../../../app/dashboard/page';
import { useAuth } from '../../../contexts/AuthContext';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock AuthContext
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock AuthGuard
vi.mock('../../../components/AuthGuard', () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('DashboardPage', () => {
  const mockPush = vi.fn();
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    } as any);
  });

  it('should render dashboard with user information', () => {
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
      logout: mockLogout,
      checkAuth: vi.fn(),
      otpRequired: false,
      otpUserId: null,
      verifyOtpLogin: vi.fn(),
      clearOtpState: vi.fn(),
    } as any);

    render(<DashboardPage />);

    expect(screen.getByText(/pesaflow dashboard/i)).toBeInTheDocument();
    expect(screen.getAllByText('test@example.com').length).toBeGreaterThan(0);
    expect(screen.getByText(/welcome to your dashboard/i)).toBeInTheDocument();
  });

  it('should display OTP status', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      created_at: '2024-01-01T00:00:00.000Z',
      otp_enabled: true,
    };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      isAuthenticated: true,
      login: vi.fn(),
      signup: vi.fn(),
      logout: mockLogout,
      checkAuth: vi.fn(),
      otpRequired: false,
      otpUserId: null,
      verifyOtpLogin: vi.fn(),
      clearOtpState: vi.fn(),
    } as any);

    render(<DashboardPage />);

    expect(screen.getByText(/enabled/i)).toBeInTheDocument();
  });

  it('should handle logout', async () => {
    const user = userEvent.setup();
    mockLogout.mockResolvedValue(undefined);

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
      logout: mockLogout,
      checkAuth: vi.fn(),
      otpRequired: false,
      otpUserId: null,
      verifyOtpLogin: vi.fn(),
      clearOtpState: vi.fn(),
    } as any);

    render(<DashboardPage />);

    await user.click(screen.getByRole('button', { name: /logout/i }));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('should show loading state during logout', async () => {
    const user = userEvent.setup();
    mockLogout.mockImplementation(() => new Promise(() => {})); // Never resolves

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
      logout: mockLogout,
      checkAuth: vi.fn(),
      otpRequired: false,
      otpUserId: null,
      verifyOtpLogin: vi.fn(),
      clearOtpState: vi.fn(),
    } as any);

    render(<DashboardPage />);

    await user.click(screen.getByRole('button', { name: /logout/i }));

    expect(screen.getByRole('button', { name: /logging out/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logging out/i })).toBeDisabled();
  });
});

