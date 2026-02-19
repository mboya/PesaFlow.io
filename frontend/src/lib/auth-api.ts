// frontend/src/lib/auth-api.ts
import { apiClient } from './api';

export interface User {
  id: number;
  email: string;
  created_at: string;
  otp_enabled: boolean;
  tenant_id?: number; // Tenant ID if available from backend
  tenant_subdomain?: string; // Tenant subdomain if available from backend (returned on signup)
}

export interface SignupData {
  email: string;
  password: string;
  tenantSubdomain?: string; // Optional tenant subdomain (backend will auto-generate if not provided)
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

/**
 * Extract JWT token from Axios response headers or body
 * Axios normalizes headers to lowercase, so we check both cases
 * On Render/Cloudflare, headers may be stripped, so we also check response body
 */
const extractToken = (response: any): string | null => {
  // Try to get token from response header first
  const authHeader = response.headers?.['authorization'] || response.headers?.['Authorization'];
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Fallback: get token from response body (for proxies that strip headers like Render/Cloudflare)
  if (response.data?.token) {
    return response.data.token;
  }
  
  return null;
};

export const authApi = {
  // Sign up new user
  signup: async (data: SignupData): Promise<{ user: User; token: string }> => {
    // Build headers - only include tenant subdomain if explicitly provided
    // Otherwise, backend will auto-generate a unique tenant from the email
    const config: any = {};
    
    if (data.tenantSubdomain && data.tenantSubdomain.trim().length > 0) {
      // Use exact header name that backend expects: X-Tenant-Subdomain
      config.headers = {
        'X-Tenant-Subdomain': data.tenantSubdomain.toLowerCase().trim()
      };
      console.log('[Auth API] Signup with explicit tenant subdomain:', data.tenantSubdomain);
    } else {
      console.log('[Auth API] Signup without tenant subdomain - backend will auto-generate from email');
    }

    const response = await apiClient.post(
      '/signup', 
      { user: { email: data.email, password: data.password } },
      config
    );
    
    const token = extractToken(response);
    if (!token) {
      throw new Error('No token received from server');
    }

    const user = response.data.data;
    
    // Store tenant subdomain from response (backend includes it after creating tenant)
    if (user?.tenant_subdomain && typeof window !== 'undefined') {
      localStorage.setItem('tenantSubdomain', user.tenant_subdomain);
    }

    return {
      user: user,
      token,
    };
  },

  // Login user
  login: async (data: LoginData): Promise<LoginResponse> => {
    const response = await apiClient.post('/login', { user: data });
    const token = extractToken(response);
    const loginData: LoginResponse = response.data;
    
    // The response interceptor should have already stored the token,
    // but store it here as well to ensure it's saved
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
      // Only log in development to reduce production log noise
      if (process.env.NODE_ENV === 'development') {
        console.log('[Auth API] Stored auth token after login');
      }
    } else if (!token && typeof window !== 'undefined') {
      // This should not happen if backend is configured correctly
      console.error('[Auth API] No token extracted from login response. Response data:', {
        hasToken: !!response.data?.token,
        hasHeader: !!(response.headers?.['authorization'] || response.headers?.['Authorization']),
        status: response.status
      });
    }
    
    // Store tenant subdomain from user data if available
    if (loginData.data?.tenant_subdomain && typeof window !== 'undefined') {
      localStorage.setItem('tenantSubdomain', loginData.data.tenant_subdomain);
    }
    
    return loginData;
  },

  // Login user with Google ID token
  googleLogin: async (credential: string): Promise<LoginResponse> => {
    const response = await apiClient.post('/google_login', { credential });
    const token = extractToken(response);
    const loginData: LoginResponse = response.data;

    if (token && typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
    }

    if (loginData.data?.tenant_subdomain && typeof window !== 'undefined') {
      localStorage.setItem('tenantSubdomain', loginData.data.tenant_subdomain);
    }

    return loginData;
  },

  // Verify OTP during login
  verifyOtpLogin: async (data: OtpVerifyData): Promise<{ user: User; token: string }> => {
    const response = await apiClient.post('/otp/verify_login', data);
    const token = extractToken(response);
    if (!token) {
      // Log detailed error for debugging
      console.error('[Auth API] No token in OTP verification response:', {
        hasToken: !!response.data?.token,
        hasHeader: !!(response.headers?.['authorization'] || response.headers?.['Authorization']),
        status: response.status,
        data: response.data
      });
      throw new Error('No token received from server. Check backend configuration.');
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
      
      // Store tenant subdomain from user data if available
      const user = response.data.data;
      if (user?.tenant_subdomain && typeof window !== 'undefined') {
        localStorage.setItem('tenantSubdomain', user.tenant_subdomain);
      }
    }
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
    const user = response.data.data;
    
    // Store tenant subdomain if available and not already stored
    if (user?.tenant_subdomain && typeof window !== 'undefined') {
      const currentTenantSubdomain = localStorage.getItem('tenantSubdomain');
      if (!currentTenantSubdomain || currentTenantSubdomain !== user.tenant_subdomain) {
        localStorage.setItem('tenantSubdomain', user.tenant_subdomain);
      }
    }
    
    return user;
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
