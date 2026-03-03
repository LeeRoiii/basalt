import { create } from 'zustand';

export type SnackbarType = 'success' | 'error' | 'info';

interface SnackbarState {
    message: string;
    type: SnackbarType;
    isOpen: boolean;
    showSnackbar: (message: string, type?: SnackbarType) => void;
    hideSnackbar: () => void;
}

export const useSnackbarStore = create<SnackbarState>((set) => ({
    message: '',
    type: 'info',
    isOpen: false,
    showSnackbar: (message, type = 'info') => {
        set({ message, type, isOpen: true });

        // Auto-hide after 5 seconds
        setTimeout(() => {
            set({ isOpen: false });
        }, 5000);
    },
    hideSnackbar: () => set({ isOpen: false }),
}));
