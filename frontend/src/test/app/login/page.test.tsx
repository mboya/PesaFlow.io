import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import LoginPage from '../../../app/login/page';
import { useAuth } from '../../../contexts/AuthContext';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => '/login'),
}));

// Mock AuthContext
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock AuthGuard
vi.mock('../../../components/AuthGuard', () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('LoginPage', () => {
  const mockPush = vi.fn();
  const mockLogin = vi.fn();
  const mockVerifyOtpLogin = vi.fn();

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

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
      login: mockLogin,
      signup: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
      otpRequired: false,
      otpUserId: null,
      verifyOtpLogin: mockVerifyOtpLogin,
      clearOtpState: vi.fn(),
    } as any);
  });

  it('should render login form', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
  });

  it('should submit login form with email and password', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(undefined);

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    }, { timeout: 3000 });
  });

  it('should redirect to dashboard after successful login', async () => {
    const user = userEvent.setup();
    // Mock login to store token in localStorage (simulating what authApi.login does)
    mockLogin.mockImplementation(() => {
      localStorage.setItem('authToken', 'test-token');
      return Promise.resolve(undefined);
    });

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    }, { timeout: 3000 });
  });

  it('should display error message on login failure', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('should show OTP input when OTP is required', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
      login: mockLogin,
      signup: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
      otpRequired: true,
      otpUserId: 1,
      verifyOtpLogin: mockVerifyOtpLogin,
      clearOtpState: vi.fn(),
    } as any);

    render(<LoginPage />);

    expect(screen.getByText(/two-factor authentication/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/otp code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /verify otp/i })).toBeInTheDocument();
  });

  it('should submit OTP code', async () => {
    const user = userEvent.setup();
    mockVerifyOtpLogin.mockResolvedValue(undefined);

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
      login: mockLogin,
      signup: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
      otpRequired: true,
      otpUserId: 1,
      verifyOtpLogin: mockVerifyOtpLogin,
      clearOtpState: vi.fn(),
    } as any);

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/otp code/i), '123456');
    await user.click(screen.getByRole('button', { name: /verify otp/i }));

    await waitFor(() => {
      expect(mockVerifyOtpLogin).toHaveBeenCalledWith('123456');
    });
  });

  it('should show loading state during login', async () => {
    const user = userEvent.setup();
    mockLogin.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
  });
});
