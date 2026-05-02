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

// Handle errors silently
api.interceptors.response.use(
    (response) => response,
    (error) => {
        return Promise.reject(error);
    }
);
