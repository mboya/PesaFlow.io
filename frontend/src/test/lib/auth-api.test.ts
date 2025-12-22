import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the API client before importing auth-api
const mockPost = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();

vi.mock('../../lib/api', () => ({
  apiClient: {
    post: (...args: any[]) => mockPost(...args),
    get: (...args: any[]) => mockGet(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
}));

import { authApi } from '../../lib/auth-api';

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('signup', () => {
    it('should sign up a user and return user data and token', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00.000Z',
        otp_enabled: false,
      };

      const mockResponse = {
        data: {
          status: { code: 200, message: 'Signed up successfully.' },
          data: mockUser,
        },
        headers: {
          authorization: 'Bearer test-jwt-token',
        },
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await authApi.signup({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockPost).toHaveBeenCalledWith('/signup', {
        user: { email: 'test@example.com', password: 'password123' },
      }, {});
      expect(result.user).toEqual(mockUser);
      expect(result.token).toBe('test-jwt-token');
    });

    it('should throw error if no token received', async () => {
      const mockResponse = {
        data: {
          status: { code: 200, message: 'Signed up successfully.' },
          data: { id: 1, email: 'test@example.com' },
        },
        headers: {},
      };

      mockPost.mockResolvedValue(mockResponse);

      await expect(
        authApi.signup({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('No token received from server');
    });
  });

  describe('login', () => {
    it('should login user and return response with token', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00.000Z',
        otp_enabled: false,
      };

      const mockResponse = {
        data: {
          status: { code: 200, message: 'Logged in successfully' },
          data: mockUser,
        },
        headers: {
          authorization: 'Bearer test-jwt-token',
        },
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await authApi.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockPost).toHaveBeenCalledWith('/login', {
        user: { email: 'test@example.com', password: 'password123' },
      });
      expect(result.data).toEqual(mockUser);
      expect(localStorage.getItem('authToken')).toBe('test-jwt-token');
    });

    it('should handle OTP required response', async () => {
      const mockResponse = {
        data: {
          status: { code: 200, message: 'OTP verification required' },
          otp_required: true,
          user_id: 1,
        },
        headers: {},
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await authApi.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.otp_required).toBe(true);
      expect(result.user_id).toBe(1);
      expect(localStorage.getItem('authToken')).toBeNull();
    });
  });

  describe('verifyOtpLogin', () => {
    it('should verify OTP and return user with token', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00.000Z',
        otp_enabled: true,
      };

      const mockResponse = {
        data: {
          status: { code: 200, message: 'Logged in successfully' },
          data: mockUser,
        },
        headers: {
          authorization: 'Bearer test-jwt-token',
        },
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await authApi.verifyOtpLogin({
        user_id: 1,
        otp_code: '123456',
      });

      expect(mockPost).toHaveBeenCalledWith('/otp/verify_login', {
        user_id: 1,
        otp_code: '123456',
      });
      expect(result.user).toEqual(mockUser);
      expect(result.token).toBe('test-jwt-token');
      expect(localStorage.getItem('authToken')).toBe('test-jwt-token');
    });
  });

  describe('logout', () => {
    it('should logout user and clear token', async () => {
      localStorage.setItem('authToken', 'test-token');

      mockDelete.mockResolvedValue({
        data: { status: { code: 200, message: 'Logged out successfully' } },
      });

      await authApi.logout();

      expect(mockDelete).toHaveBeenCalledWith('/logout');
      expect(localStorage.getItem('authToken')).toBeNull();
    });

    it('should clear token even if logout request fails', async () => {
      localStorage.setItem('authToken', 'test-token');

      mockDelete.mockRejectedValue(new Error('Network error'));

      await authApi.logout();

      expect(localStorage.getItem('authToken')).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00.000Z',
        otp_enabled: false,
      };

      const mockResponse = {
        data: {
          status: { code: 200, message: 'User retrieved successfully' },
          data: mockUser,
        },
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await authApi.getCurrentUser();

      expect(mockGet).toHaveBeenCalledWith('/current_user');
      expect(result).toEqual(mockUser);
    });
  });
});

