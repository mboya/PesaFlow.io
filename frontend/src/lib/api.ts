// frontend/src/lib/api.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
    baseURL: `${API_URL}/api/v1`,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

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