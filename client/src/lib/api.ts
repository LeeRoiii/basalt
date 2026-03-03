import axios from 'axios';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    withCredentials: true,
});

// Production error logging
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (import.meta.env.PROD) {
            console.error('📡 API Error:', error.response?.data?.message || error.message);
        }
        return Promise.reject(error);
    }
);
