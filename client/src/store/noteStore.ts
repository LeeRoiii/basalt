import { create } from 'zustand';
import type { Note, Folder, Tag, EditorMode, SidebarView } from '../types';
import { api } from '../lib/api';

interface NoteState {
    notes: Note[];
    folders: Folder[];
    trashNotes: Note[];
    trashFolders: Folder[];
    tags: Tag[];
    activeNote: Note | null;
    openNotes: Note[];
    activeFolder: string | null;
    editorMode: EditorMode;
    sidebarView: SidebarView;
    sidebarOpen: boolean;
    isSaving: boolean;
    lastFetched: {
        notes: number;
        folders: number;
        tags: number;
    };
    isFetching: {
        notes: boolean;
        folders: boolean;
        tags: boolean;
    };

    // Actions
    setNotes: (notes: Note[]) => void;
    setFolders: (folders: Folder[]) => void;
    setTags: (tags: Tag[]) => void;
    setActiveNote: (note: Note | null) => void;
    closeNote: (id: string) => void;
    closeOtherNotes: (id: string) => void;
    closeAllNotes: () => void;
    setActiveFolder: (folderId: string | null) => void;
    setEditorMode: (mode: EditorMode) => void;
    setSidebarView: (view: SidebarView) => void;
    setSidebarOpen: (open: boolean) => void;
    fetchNotes: (userId: string, folderId?: string) => Promise<void>;
    fetchFolders: (userId: string) => Promise<void>;
    fetchTags: (userId: string) => Promise<void>;
    createNote: (userId: string, folderId?: string) => Promise<Note>;
    updateNote: (id: string, data: Partial<Note>) => Promise<void>;
    deleteNote: (id: string) => Promise<void>;
    createFolder: (name: string, userId: string, parentId?: string) => Promise<void>;
    deleteFolder: (id: string) => Promise<void>;
    renameFolder: (id: string, name: string) => Promise<void>;
    createTag: (name: string, color: string, userId: string) => Promise<Tag>;
    deleteTag: (id: string) => Promise<void>;
    moveNote: (id: string, folderId: string | null) => Promise<void>;
    moveFolder: (id: string, parentId: string | null) => Promise<void>;
    fetchTrash: (userId: string) => Promise<void>;
    restoreNote: (id: string) => Promise<void>;
    restoreFolder: (id: string) => Promise<void>;
    permanentlyDeleteNote: (id: string) => Promise<void>;
    permanentlyDeleteFolder: (id: string) => Promise<void>;
    emptyTrash: (userId: string) => Promise<void>;
}

export const useNoteStore = create<NoteState>((set) => ({
    notes: [],
    folders: [],
    trashNotes: [],
    trashFolders: [],
    tags: [],
    activeNote: null,
    openNotes: [],
    activeFolder: null,
    editorMode: 'edit',
    sidebarView: 'explorer',
    sidebarOpen: true,
    isSaving: false,
    lastFetched: {
        notes: 0,
        folders: 0,
        tags: 0,
    },
    isFetching: {
        notes: false,
        folders: false,
        tags: false,
    },

    setNotes: (notes) => set({ notes }),
    setFolders: (folders) => set({ folders }),
    setTags: (tags) => set({ tags }),
    setActiveNote: (note) => set((state) => {
        if (!note) return { activeNote: null };
        const exists = state.openNotes.find((n) => n.id === note.id);
        if (exists) {
            return { activeNote: note };
        } else {
            return { activeNote: note, openNotes: [...state.openNotes, note] };
        }
    }),
    closeNote: (id) => set((state) => {
        const remaining = state.openNotes.filter(n => n.id !== id);
        let newActive = state.activeNote;
        if (state.activeNote?.id === id) {
            newActive = remaining.length > 0 ? remaining[remaining.length - 1] : null;
        }
        return { openNotes: remaining, activeNote: newActive };
    }),
    closeOtherNotes: (id) => set((state) => {
        const kept = state.openNotes.filter(n => n.id === id);
        return { openNotes: kept, activeNote: kept[0] || null };
    }),
    closeAllNotes: () => set({ openNotes: [], activeNote: null }),
    setActiveFolder: (folderId) => set({ activeFolder: folderId }),
    setEditorMode: (mode) => set({ editorMode: mode }),
    setSidebarView: (view) => set({ sidebarView: view }),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    fetchNotes: async (userId, folderId) => {
        const { isFetching } = useNoteStore.getState();

        // Simple cache: if fetched in last 30s and not currently fetching, skip (unless folderId changes)
        // But for notes, folderId might change, so we usually want to fetch if folderId is different
        // For simplicity, let's just deduplicate concurrent requests first
        if (isFetching.notes) return;

        set((state) => ({ isFetching: { ...state.isFetching, notes: true } }));
        try {
            const params: Record<string, string> = { user_id: userId };
            if (folderId) params.folder_id = folderId;
            const { data } = await api.get('/notes', { params });
            set((state) => ({
                notes: data,
                lastFetched: { ...state.lastFetched, notes: Date.now() },
                isFetching: { ...state.isFetching, notes: false }
            }));
        } catch (error) {
            console.error('Failed to fetch notes:', error);
            set((state) => ({ isFetching: { ...state.isFetching, notes: false } }));
        }
    },

    fetchFolders: async (userId) => {
        const { lastFetched, isFetching } = useNoteStore.getState();
        const now = Date.now();

        if (isFetching.folders || (now - lastFetched.folders < 30000)) return;

        set((state) => ({ isFetching: { ...state.isFetching, folders: true } }));
        try {
            const { data } = await api.get('/folders', { params: { user_id: userId } });
            set((state) => ({
                folders: data,
                lastFetched: { ...state.lastFetched, folders: Date.now() },
                isFetching: { ...state.isFetching, folders: false }
            }));
        } catch (error) {
            console.error('Failed to fetch folders:', error);
            set((state) => ({ isFetching: { ...state.isFetching, folders: false } }));
        }
    },

    fetchTags: async (userId) => {
        const { lastFetched, isFetching } = useNoteStore.getState();
        const now = Date.now();

        if (isFetching.tags || (now - lastFetched.tags < 30000)) return;

        set((state) => ({ isFetching: { ...state.isFetching, tags: true } }));
        try {
            const { data } = await api.get('/tags', { params: { user_id: userId } });
            set((state) => ({
                tags: data,
                lastFetched: { ...state.lastFetched, tags: Date.now() },
                isFetching: { ...state.isFetching, tags: false }
            }));
        } catch (error) {
            console.error('Failed to fetch tags:', error);
            set((state) => ({ isFetching: { ...state.isFetching, tags: false } }));
        }
    },

    createNote: async (userId, folderId) => {
        try {
            const { data } = await api.post('/notes', {
                title: 'Untitled',
                content: '# Untitled\n\nStart writing here...',
                user_id: userId,
                folder_id: folderId || null,
            });
            set((state) => ({
                notes: [data, ...state.notes],
                activeNote: data,
                openNotes: [...state.openNotes, data]
            }));
            return data;
        } catch (error) {
            console.error('Failed to create note:', error);
            throw error;
        }
    },

    updateNote: async (id, noteData) => {
        set({ isSaving: true });
        try {
            const { data } = await api.put(`/notes/${id}`, noteData);
            set((state) => ({
                notes: state.notes.map((n) => (n.id === id ? { ...n, ...data } : n)),
                activeNote: state.activeNote?.id === id ? { ...state.activeNote, ...data } : state.activeNote,
                openNotes: state.openNotes.map((n) => (n.id === id ? { ...n, ...data } : n)),
                isSaving: false,
            }));
        } catch (error) {
            console.error('Failed to update note:', error);
            set({ isSaving: false });
        }
    },

    deleteNote: async (id) => {
        try {
            await api.delete(`/notes/${id}`);
            set((state) => {
                const updatedNotes = state.notes.filter((n) => n.id !== id);
                return {
                    notes: updatedNotes,
                };
            });
            // Also call closeNote to handle tab cleanup smoothly without a dual `set` call race condition
            useNoteStore.getState().closeNote(id);
        } catch (error) {
            console.error('Failed to delete note:', error);
        }
    },

    createFolder: async (name, userId, parentId) => {
        try {
            const { data } = await api.post('/folders', { name, user_id: userId, parent_id: parentId });
            set((state) => ({ folders: [...state.folders, data] }));
        } catch (error) {
            console.error('Failed to create folder:', error);
        }
    },

    deleteFolder: async (id) => {
        try {
            await api.delete(`/folders/${id}`);
            set((state) => ({ folders: state.folders.filter((f) => f.id !== id) }));
        } catch (error) {
            console.error('Failed to delete folder:', error);
        }
    },

    renameFolder: async (id, name) => {
        try {
            const { data } = await api.put(`/folders/${id}`, { name });
            set((state) => ({
                folders: state.folders.map((f) => (f.id === id ? { ...f, name: data.name } : f)),
            }));
        } catch (error) {
            console.error('Failed to rename folder:', error);
        }
    },

    createTag: async (name, color, userId) => {
        try {
            const { data } = await api.post('/tags', { name, color, user_id: userId });
            set((state) => ({ tags: [...state.tags, data] }));
            return data;
        } catch (error) {
            console.error('Failed to create tag:', error);
            throw error;
        }
    },

    deleteTag: async (id) => {
        try {
            await api.delete(`/tags/${id}`);
            set((state) => ({ tags: state.tags.filter((t) => t.id !== id) }));
        } catch (error) {
            console.error('Failed to delete tag:', error);
        }
    },

    moveNote: async (id, folderId) => {
        try {
            const { data } = await api.put(`/notes/${id}`, { folder_id: folderId });
            set((state) => ({
                notes: state.notes.map((n) => (n.id === id ? { ...n, folder_id: folderId, updated_at: data.updated_at } : n)),
                activeNote: state.activeNote?.id === id ? { ...state.activeNote, folder_id: folderId, updated_at: data.updated_at } : state.activeNote,
            }));
        } catch (error) {
            console.error('Failed to move note:', error);
        }
    },

    moveFolder: async (id, parentId) => {
        try {
            await api.put(`/folders/${id}`, { parent_id: parentId });
            set((state) => ({
                folders: state.folders.map((f) => (f.id === id ? { ...f, parent_id: parentId } : f)),
            }));
        } catch (error) {
            console.error('Failed to move folder:', error);
        }
    },

    fetchTrash: async (userId) => {
        try {
            const [notesRes, foldersRes] = await Promise.all([
                api.get('/notes/trash', { params: { user_id: userId } }),
                api.get('/folders/trash', { params: { user_id: userId } })
            ]);
            set({ trashNotes: notesRes.data, trashFolders: foldersRes.data });
        } catch (error) {
            console.error('Failed to fetch trash:', error);
        }
    },

    restoreNote: async (id) => {
        try {
            await api.put(`/notes/${id}/restore`);
            set((state) => {
                const restoredNote = state.trashNotes.find((n) => n.id === id);
                return {
                    trashNotes: state.trashNotes.filter((n) => n.id !== id),
                    notes: restoredNote ? [restoredNote, ...state.notes] : state.notes,
                };
            });
        } catch (error) {
            console.error('Failed to restore note:', error);
        }
    },

    restoreFolder: async (id) => {
        try {
            await api.put(`/folders/${id}/restore`);
            set((state) => {
                const restoredFolder = state.trashFolders.find((f) => f.id === id);
                return {
                    trashFolders: state.trashFolders.filter((f) => f.id !== id),
                    folders: restoredFolder ? [...state.folders, restoredFolder] : state.folders,
                };
            });
        } catch (error) {
            console.error('Failed to restore folder:', error);
        }
    },

    permanentlyDeleteNote: async (id) => {
        try {
            await api.delete(`/notes/${id}/permanent`);
            set((state) => ({ trashNotes: state.trashNotes.filter((n) => n.id !== id) }));
        } catch (error) {
            console.error('Failed to permanently delete note:', error);
        }
    },

    permanentlyDeleteFolder: async (id) => {
        try {
            await api.delete(`/folders/${id}/permanent`);
            set((state) => ({ trashFolders: state.trashFolders.filter((f) => f.id !== id) }));
        } catch (error) {
            console.error('Failed to permanently delete folder:', error);
        }
    },

    emptyTrash: async (userId) => {
        try {
            await Promise.all([
                api.delete('/notes/trash', { params: { user_id: userId } }),
                api.delete('/folders/trash', { params: { user_id: userId } }),
            ]);
            set({ trashNotes: [], trashFolders: [] });
        } catch (error) {
            console.error('Failed to empty trash:', error);
        }
    },
}));
