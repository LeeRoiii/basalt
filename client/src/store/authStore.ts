import { create } from 'zustand';
import type { User } from '../types';
import { supabase } from '../lib/supabase';

interface AuthState {
    user: User | null;
    loading: boolean;
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    loading: true,
    setUser: (user) => set({ user }),
    setLoading: (loading) => set({ loading }),
    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null });

        // Clear all cached data across the app on signout
        try {
            const { useNoteStore } = await import('./noteStore');
            useNoteStore.getState().clearStore();
        } catch (err) {
            console.error('Failed to clear store on signout:', err);
        }
    },
}));
