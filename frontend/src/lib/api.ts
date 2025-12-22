// frontend/src/lib/api.ts
import axios from 'axios';
import type {
  Subscription,
  Payment,
  Invoice,
  Refund,
  DashboardData,
  Customer,
} from './types';

// API_URL points to the Next.js proxy route, which forwards requests to the backend
// The backend is on a private network and not directly accessible from the browser
// The proxy route is at /api/proxy, and it automatically prepends /api/v1/ to backend requests
// Using a relative path ensures it automatically adapts to the current origin (including subdomain)
// For example: if on "power-user.localhost:3001", API calls go to "power-user.localhost:3001/api/proxy"
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/proxy';

export const apiClient = axios.create({
    baseURL: API_URL, // Proxy already handles /api/v1 prefix, relative path adapts to subdomain automatically
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Add response interceptor to extract and store JWT tokens
apiClient.interceptors.response.use(
    (response) => {
        // Extract token from response headers if present (client-side only)
        if (typeof window !== 'undefined') {
            const authHeader = response.headers?.['authorization'] || response.headers?.['Authorization'];
            if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                if (token) {
                    localStorage.setItem('authToken', token);
                }
            }
        }
        return response;
    },
    (error) => {
        // Handle 401 errors by clearing token (client-side only)
        if (typeof window !== 'undefined' && error.response?.status === 401) {
            // Only clear token if we're sure it's an auth error
            // Don't clear on network errors or other issues
            localStorage.removeItem('authToken');
        }
        console.error('API Error:', error.response?.status, error.response?.data || error.message);
        return Promise.reject(error);
    }
);

// Add auth token and tenant headers to requests
apiClient.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        // Add authentication token
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Add tenant subdomain header if available (allows backend to identify tenant)
        if (!config.headers['X-Tenant-Subdomain'] && !config.headers['x-tenant-subdomain']) {
            const tenantSubdomain = localStorage.getItem('tenantSubdomain');
            if (tenantSubdomain) {
                config.headers['X-Tenant-Subdomain'] = tenantSubdomain;
            }
        }
    }

    return config;
});

// Helper to extract data from API responses (Axios response structure)
const extractData = <T>(response: any): { data: T } => ({ data: response.data as T });

// Subscriptions API
export const subscriptionsApi = {
    getAll: (): Promise<{ data: Subscription[] }> => 
        apiClient.get('/subscriptions').then(extractData),
    getById: (id: string | number): Promise<{ data: Subscription }> =>
        apiClient.get(`/subscriptions/${id}`).then(extractData),
    // Create a subscription directly with name/description/amount etc.
    create: (data: {
        subscription: {
            name: string;
            description?: string;
            amount: number;
            currency?: string;
            billing_cycle_days?: number;
            trial_days?: number;
            has_trial?: boolean;
        };
        customer?: {
            phone_number?: string;
            email?: string;
            first_name?: string;
            last_name?: string;
        };
        payment_method?: 'ratiba' | 'stk_push';
    }): Promise<{ data: Subscription }> =>
        apiClient.post('/subscriptions', data).then(res => ({ data: res.data })),
    update: (id: string | number, data: Partial<Subscription>): Promise<{ data: Subscription }> => 
        apiClient.patch(`/subscriptions/${id}`, data).then(res => ({ data: res.data })),
    cancel: (id: string | number, data?: { reason?: string; refund_unused?: boolean }): Promise<{ data: Subscription }> => 
        apiClient.post(`/subscriptions/${id}/cancel`, data).then(res => ({ data: res.data })),
    reactivate: (id: string | number): Promise<{ data: Subscription }> => 
        apiClient.post(`/subscriptions/${id}/reactivate`).then(res => ({ data: res.data })),
};

// Payment Methods API
export const paymentMethodsApi = {
    setupRatiba: (data: { phone_number: string; amount: number; reference: string }): Promise<{ data: any }> => 
        apiClient.post('/payment_methods/ratiba', data).then(extractData),
    initiateStkPush: (data: { phone_number: string; amount: number; reference: string }): Promise<{ data: any }> => 
        apiClient.post('/payment_methods/stk_push', data).then(extractData),
};

// Dashboard API
export const dashboardApi = {
    getData: (): Promise<{ data: DashboardData }> => 
        apiClient.get('/dashboard').then(extractData),
};

// Invoices API
export const invoicesApi = {
    getAll: (): Promise<{ data: Invoice[] }> => 
        apiClient.get('/invoices').then(extractData),
    getById: (id: string | number): Promise<{ data: Invoice }> => 
        apiClient.get(`/invoices/${id}`).then(extractData),
};

// Refunds API
export const refundsApi = {
    getAll: (): Promise<{ data: Refund[] }> => 
        apiClient.get('/refunds').then(extractData),
    create: (data: { payment_id: number; amount: number; reason: string }): Promise<{ data: Refund }> => 
        apiClient.post('/refunds', data).then(extractData),
    getById: (id: string | number): Promise<{ data: Refund }> => 
        apiClient.get(`/refunds/${id}`).then(extractData),
};

// Payments API (for subscription-specific payments)
export const paymentsApi = {
    getBySubscription: (subscriptionId: string | number): Promise<{ data: Payment[] }> => 
        apiClient.get(`/subscriptions/${subscriptionId}/payments`).then(extractData),
};

// Profile API
export const profileApi = {
    get: (): Promise<{ data: Customer }> =>
        apiClient.get('/profile').then(extractData),
    update: (data: { profile: { name?: string; phone_number?: string; preferred_payment_day?: string } }): Promise<{ data: Customer }> =>
        apiClient.patch('/profile', data).then(extractData),
};