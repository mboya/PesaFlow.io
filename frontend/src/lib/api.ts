// frontend/src/lib/api.ts
import axios from 'axios';

// API_URL points to the Next.js proxy route, which forwards requests to the backend
// The backend is on a private network and not directly accessible from the browser
// The proxy route is at /api/proxy, and it automatically prepends /api/v1/ to backend requests
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/proxy';

export const apiClient = axios.create({
    baseURL: `${API_URL}/api/v1`,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Add response interceptor for debugging
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
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