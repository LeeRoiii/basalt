import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    console.error('❌ Missing Supabase keys in .env');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Creates a user-scoped Supabase client that respects RLS.
 * Useful for operations where we want the database to enforce ownership via JWT.
 */
export const getSupabaseClient = (token?: string) => {
    if (!token) return supabase;
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    });
};
