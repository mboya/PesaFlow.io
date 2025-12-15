// frontend/src/lib/api.ts
import axios from 'axios';
import type {
  Subscription,
  Plan,
  Payment,
  Invoice,
  Refund,
  DashboardData,
  Customer,
} from './types';

// API_URL points to the Next.js proxy route, which forwards requests to the backend
// The backend is on a private network and not directly accessible from the browser
// The proxy route is at /api/proxy, and it automatically prepends /api/v1/ to backend requests
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/proxy';

export const apiClient = axios.create({
    baseURL: API_URL, // Proxy already handles /api/v1 prefix
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Add response interceptor to extract and store JWT tokens
apiClient.interceptors.response.use(
    (response) => {
        // Extract token from response headers if present
        // Axios normalizes headers to lowercase
        const authHeader = response.headers?.['authorization'] || response.headers?.['Authorization'];
        if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            localStorage.setItem('authToken', token);
        }
        return response;
    },
    (error) => {
        // Handle 401 errors by clearing token
        if (error.response?.status === 401) {
            localStorage.removeItem('authToken');
        }
        console.error('API Error:', error.response?.status, error.response?.data || error.message);
        return Promise.reject(error);
    }
);

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Subscriptions API
export const subscriptionsApi = {
    getAll: (): Promise<{ data: Subscription[] }> => 
        apiClient.get('/subscriptions').then(res => ({ data: res.data })),
    getById: (id: string | number): Promise<{ data: Subscription }> => 
        apiClient.get(`/subscriptions/${id}`).then(res => ({ data: res.data })),
    create: (data: { plan_id: number; payment_method?: 'ratiba' | 'stk_push' }): Promise<{ data: Subscription }> => 
        apiClient.post('/subscriptions', data).then(res => ({ data: res.data })),
    update: (id: string | number, data: Partial<Subscription>): Promise<{ data: Subscription }> => 
        apiClient.patch(`/subscriptions/${id}`, data).then(res => ({ data: res.data })),
    cancel: (id: string | number, data?: { reason?: string; refund_unused?: boolean }): Promise<{ data: Subscription }> => 
        apiClient.post(`/subscriptions/${id}/cancel`, data).then(res => ({ data: res.data })),
    reactivate: (id: string | number): Promise<{ data: Subscription }> => 
        apiClient.post(`/subscriptions/${id}/reactivate`).then(res => ({ data: res.data })),
    upgrade: (id: string | number, planId: number): Promise<{ data: Subscription }> => 
        apiClient.post(`/subscriptions/${id}/upgrade`, { plan_id: planId }).then(res => ({ data: res.data })),
    downgrade: (id: string | number, planId: number): Promise<{ data: Subscription }> => 
        apiClient.post(`/subscriptions/${id}/downgrade`, { plan_id: planId }).then(res => ({ data: res.data })),
};

// Plans API
export const plansApi = {
    getAll: (): Promise<{ data: Plan[] }> => 
        apiClient.get('/plans').then(res => ({ data: res.data })),
    getById: (id: string | number): Promise<{ data: Plan }> => 
        apiClient.get(`/plans/${id}`).then(res => ({ data: res.data })),
};

// Payment Methods API
export const paymentMethodsApi = {
    setupRatiba: (data: { phone_number: string; amount: number; reference: string }): Promise<{ data: any }> => 
        apiClient.post('/payment_methods/ratiba', data).then(res => ({ data: res.data })),
    initiateStkPush: (data: { phone_number: string; amount: number; reference: string }): Promise<{ data: any }> => 
        apiClient.post('/payment_methods/stk_push', data).then(res => ({ data: res.data })),
};

// Dashboard API
export const dashboardApi = {
    getData: (): Promise<{ data: DashboardData }> => 
        apiClient.get('/dashboard').then(res => ({ data: res.data })),
};

// Invoices API
export const invoicesApi = {
    getAll: (): Promise<{ data: Invoice[] }> => 
        apiClient.get('/invoices').then(res => ({ data: res.data })),
    getById: (id: string | number): Promise<{ data: Invoice }> => 
        apiClient.get(`/invoices/${id}`).then(res => ({ data: res.data })),
};

// Refunds API
export const refundsApi = {
    getAll: (): Promise<{ data: Refund[] }> => 
        apiClient.get('/refunds').then(res => ({ data: res.data })),
    create: (data: { payment_id: number; amount: number; reason: string }): Promise<{ data: Refund }> => 
        apiClient.post('/refunds', data).then(res => ({ data: res.data })),
    getById: (id: string | number): Promise<{ data: Refund }> => 
        apiClient.get(`/refunds/${id}`).then(res => ({ data: res.data })),
};

// Payments API (for subscription-specific payments)
export const paymentsApi = {
    getBySubscription: (subscriptionId: string | number): Promise<{ data: Payment[] }> => 
        apiClient.get(`/subscriptions/${subscriptionId}/payments`).then(res => ({ data: res.data })),
};