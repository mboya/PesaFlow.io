// frontend/src/lib/api.ts
import axios from 'axios';

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

// API functions
export const subscriptionsApi = {
    getAll: () => apiClient.get('/subscriptions'),
    getById: (id: string) => apiClient.get(`/subscriptions/${id}`),
    create: (data: any) => apiClient.post('/subscriptions', data),
    cancel: (id: string) => apiClient.post(`/subscriptions/${id}/cancel`),
};

export const paymentsApi = {
    initiateStkPush: (subscriptionId: string) =>
        apiClient.post(`/subscriptions/${subscriptionId}/initiate_payment`),
    getHistory: (subscriptionId: string) =>
        apiClient.get(`/subscriptions/${subscriptionId}/payments`),
};

export const plansApi = {
    getAll: () => apiClient.get('/plans'),
    getById: (id: string) => apiClient.get(`/plans/${id}`),
};