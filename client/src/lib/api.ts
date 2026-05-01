import axios from 'axios';
import { supabase } from './supabase';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    withCredentials: true,
});

// Automatically inject JWT token into every request
api.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
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
