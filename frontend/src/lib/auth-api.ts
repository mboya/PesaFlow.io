// frontend/src/lib/auth-api.ts
import { apiClient } from './api';

export interface User {
  id: number;
  email: string;
  created_at: string;
  otp_enabled: boolean;
}

export interface SignupData {
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface LoginResponse {
  status: {
    code: number;
    message: string;
  };
  data?: User;
  otp_required?: boolean;
  user_id?: number;
}

export interface OtpVerifyData {
  user_id: number;
  otp_code: string;
}

export interface OtpSetupResponse {
  status: {
    code: number;
    message: string;
  };
  data: {
    secret: string;
    qr_code: string;
    provisioning_uri: string;
  };
}

export interface OtpVerifyResponse {
  status: {
    code: number;
    message: string;
  };
  backup_codes?: string[];
}

// Extract JWT token from response headers
// Axios response headers are in response.headers object
const extractToken = (response: any): string | null => {
  // Axios normalizes headers to lowercase
  const authHeader = response.headers?.['authorization'] || 
                     response.headers?.['Authorization'];
  
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
};

export const authApi = {
  // Sign up new user
  signup: async (data: SignupData): Promise<{ user: User; token: string }> => {
    const response = await apiClient.post('/signup', { user: data });
    const token = extractToken(response);
    if (!token) {
      throw new Error('No token received from server');
    }
    return {
      user: response.data.data,
      token,
    };
  },

  // Login user
  login: async (data: LoginData): Promise<LoginResponse> => {
    const response = await apiClient.post('/login', { user: data });
    const token = extractToken(response);
    const loginData: LoginResponse = response.data;
    
    if (token && !loginData.otp_required) {
      // Store token if login is complete (no OTP required)
      localStorage.setItem('authToken', token);
    }
    
    return loginData;
  },

  // Verify OTP during login
  verifyOtpLogin: async (data: OtpVerifyData): Promise<{ user: User; token: string }> => {
    const response = await apiClient.post('/otp/verify_login', data);
    const token = extractToken(response);
    if (!token) {
      throw new Error('No token received from server');
    }
    localStorage.setItem('authToken', token);
    return {
      user: response.data.data,
      token,
    };
  },

  // Logout user
  logout: async (): Promise<void> => {
    try {
      await apiClient.delete('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
    }
  },

  // Get current user
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/current_user');
    return response.data.data;
  },

  // Enable OTP
  enableOtp: async (): Promise<OtpSetupResponse> => {
    const response = await apiClient.post('/otp/enable');
    return response.data;
  },

  // Verify OTP and enable 2FA
  verifyOtp: async (otpCode: string): Promise<OtpVerifyResponse> => {
    const response = await apiClient.post('/otp/verify', { otp_code: otpCode });
    return response.data;
  },

  // Disable OTP
  disableOtp: async (password: string, otpCode: string): Promise<void> => {
    await apiClient.post('/otp/disable', {
      password,
      otp_code: otpCode,
    });
  },

  // Get QR code
  getQrCode: async (): Promise<{ qr_code: string; provisioning_uri: string }> => {
    const response = await apiClient.get('/otp/qr_code');
    return response.data;
  },

  // Generate new backup codes
  generateBackupCodes: async (password: string): Promise<string[]> => {
    const response = await apiClient.post('/otp/backup_codes', { password });
    return response.data.backup_codes;
  },
};

