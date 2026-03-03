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
    createWelcomeNote: (userId: string) => Promise<void>;
    createKanban: (userId: string, folderId?: string, title?: string) => Promise<Note>;

    // Kanban Actions
    addColumn: (noteId: string, title: string, order: number) => Promise<void>;
    updateColumn: (id: string, data: { title?: string, order?: number }) => Promise<void>;
    deleteColumn: (id: string) => Promise<void>;
    addTask: (columnId: string, content: string, order: number, description?: string, due_date?: string, tags?: string[]) => Promise<void>;
    updateTask: (id: string, data: {
        content?: string,
        column_id?: string,
        order?: number,
        description?: string,
        due_date?: string,
        tags?: string[]
    }) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
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
    closeNote: (id) => set((state) => {
        const remaining = state.openNotes.filter(n => n.id !== id);
        let newActive = state.activeNote;
        if (state.activeNote?.id === id) {
            newActive = remaining.length > 0 ? remaining[remaining.length - 1] : null;
        }
        return { openNotes: remaining, activeNote: newActive };
    }),
    setActiveNote: (note) => set((state) => {
        if (!note) return { activeNote: null };
        const exists = state.openNotes.find((n) => n.id === note.id);

        // If it's a kanban note, we might need to fetch its full content (columns/tasks)
        // because the bulk fetch might not have included them or they might be stale
        if (note.type === 'kanban') {
            api.get(`/notes/${note.id}`).then(({ data }) => {
                set((s) => ({
                    notes: s.notes.map(n => n.id === data.id ? data : n),
                    activeNote: s.activeNote?.id === data.id ? data : s.activeNote,
                    openNotes: s.openNotes.map(n => n.id === data.id ? data : n)
                }));
            });
        }

        if (exists) {
            return { activeNote: note };
        } else {
            return { activeNote: note, openNotes: [...state.openNotes, note] };
        }
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

            // Handle Welcome Note for brand new accounts
            if (data.length === 0 && !localStorage.getItem(`basalt_welcome_${userId}`)) {
                await useNoteStore.getState().createWelcomeNote(userId);
            }
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
                type: 'note'
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

    restoreNote: async (id: string) => {
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

    restoreFolder: async (id: string) => {
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

    permanentlyDeleteNote: async (id: string) => {
        try {
            await api.delete(`/notes/${id}/permanent`);
            set((state) => ({ trashNotes: state.trashNotes.filter((n) => n.id !== id) }));
        } catch (error) {
            console.error('Failed to permanently delete note:', error);
        }
    },

    permanentlyDeleteFolder: async (id: string) => {
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

    createWelcomeNote: async (userId) => {
        const welcomeContent = `# Welcome to Basalt! 🗻

Welcome to your new second brain. Basalt is a minimalist, high-performance Markdown editor designed for deep thought and connected knowledge.

### 🚀 Getting Started
*   **Create a Note**: Click the **+** icon in the sidebar or use the "New Note" button.
*   **Organize with Folders**: Use the folder icon to group related notes.
*   **Tags**: Add \`#tag\` anywhere in your text, and Basalt will automatically track it in the Tags panel.

### 🔗 The Power of Backlinks
Basalt uses "Wiki-links" to connect your thoughts. 
*   Type \`[[Title of Another Note]]\` to create a link.
*   Check the **Backlinks** section at the bottom of any note to see what other notes reference it.

### 📄 Professional Export
Need to share your notes?
*   Switch to **Preview Mode**.
*   Click the **Print** icon to generate a professional PDF with automatic page numbering and Obsidian-style formatting.

### ⌨️ Keyboard Power
*   \`Ctrl + K\` (or \`Cmd + K\`): Open the Global Search and Command Palette.
*   \`Ctrl + S\`: Manual save (though Basalt auto-saves for you!).

---
*This note was automatically created to help you get started. You can delete it anytime!*`;

        try {
            const { data } = await api.post('/notes', {
                title: 'Welcome to Basalt',
                content: welcomeContent,
                user_id: userId,
            });
            set((state) => ({
                notes: [data, ...state.notes],
                activeNote: data,
                openNotes: [...state.openNotes, data]
            }));
            localStorage.setItem(`basalt_welcome_${userId}`, 'true');
        } catch (error) {
            console.error('Failed to create welcome note:', error);
        }
    },

    createKanban: async (userId: string, folderId?: string, title?: string) => {
        try {
            // 1. Create the base note
            const { data: note } = await api.post('/notes', {
                title: title || 'New Project',
                content: '',
                user_id: userId,
                folder_id: folderId || null,
                type: 'kanban'
            });

            // 2. Initialize default columns
            const col1 = await api.post('/kanban/columns', { note_id: note.id, title: 'To Do', order: 0 });
            const col2 = await api.post('/kanban/columns', { note_id: note.id, title: 'In Progress', order: 1 });
            const col3 = await api.post('/kanban/columns', { note_id: note.id, title: 'Done', order: 2 });

            const fullNote = { ...note, columns: [col1.data, col2.data, col3.data] };

            set((state) => ({
                notes: [fullNote, ...state.notes],
                activeNote: fullNote,
                openNotes: [...state.openNotes, fullNote]
            }));
            return fullNote;
        } catch (error) {
            console.error('❌ createKanban error:', error);
            throw error;
        }
    },

    addColumn: async (noteId, title, order) => {
        try {
            const { data: column } = await api.post('/kanban/columns', { note_id: noteId, title, order });
            set((state) => ({
                notes: state.notes.map(n => n.id === noteId ? { ...n, columns: [...(n.columns || []), { ...column, tasks: [] }] } : n),
                activeNote: state.activeNote?.id === noteId ? { ...state.activeNote, columns: [...(state.activeNote.columns || []), { ...column, tasks: [] }] } : state.activeNote,
                openNotes: state.openNotes.map(n => n.id === noteId ? { ...n, columns: [...(n.columns || []), { ...column, tasks: [] }] } : n),
            }));
        } catch (error) {
            console.error('Failed to add column:', error);
        }
    },

    updateColumn: async (id, columnData) => {
        try {
            const { data: column } = await api.put(`/kanban/columns/${id}`, columnData);
            set((state) => {
                const updateNoteObj = (n: Note) => {
                    if (!n.columns) return n;
                    return { ...n, columns: n.columns.map(c => c.id === id ? { ...c, ...column } : c) };
                };
                return {
                    notes: state.notes.map(updateNoteObj),
                    activeNote: state.activeNote ? updateNoteObj(state.activeNote) : null,
                    openNotes: state.openNotes.map(updateNoteObj),
                };
            });
        } catch (error) {
            console.error('Failed to update column:', error);
        }
    },

    deleteColumn: async (id) => {
        try {
            await api.delete(`/kanban/columns/${id}`);
            set((state) => {
                const updateNoteObj = (n: Note) => {
                    if (!n.columns) return n;
                    return { ...n, columns: n.columns.filter(c => c.id !== id) };
                };
                return {
                    notes: state.notes.map(updateNoteObj),
                    activeNote: state.activeNote ? updateNoteObj(state.activeNote) : null,
                    openNotes: state.openNotes.map(updateNoteObj),
                };
            });
        } catch (error) {
            console.error('Failed to delete column:', error);
        }
    },

    addTask: async (columnId, content, order, description, due_date, tags) => {
        try {
            const { data: task } = await api.post('/kanban/tasks', {
                column_id: columnId,
                content,
                order,
                description,
                due_date,
                tags
            });
            set((state) => {
                const updateNoteObj = (n: Note) => {
                    if (!n.columns) return n;
                    return {
                        ...n,
                        columns: n.columns.map(c => c.id === columnId ? { ...c, tasks: [...(c.tasks || []), task].sort((a, b) => a.order - b.order) } : c)
                    };
                };
                return {
                    notes: state.notes.map(updateNoteObj),
                    activeNote: state.activeNote ? updateNoteObj(state.activeNote) : null,
                    openNotes: state.openNotes.map(updateNoteObj),
                };
            });
        } catch (error) {
            console.error('Failed to add task:', error);
        }
    },

    updateTask: async (id, taskData) => {
        try {
            const { data: task } = await api.put(`/kanban/tasks/${id}`, taskData);
            set((state) => {
                const updateNoteObj = (n: Note) => {
                    if (!n.columns) return n;

                    // Task might have moved columns
                    return {
                        ...n,
                        columns: n.columns.map(c => {
                            // Remove from old column if it was there and moved
                            let tasks = c.tasks || [];
                            if (taskData.column_id && c.id !== taskData.column_id) {
                                tasks = tasks.filter(t => t.id !== id);
                            } else if (c.id === (taskData.column_id || task.column_id)) {
                                // Add or update in target column
                                const exists = tasks.find(t => t.id === id);
                                if (exists) {
                                    tasks = tasks.map(t => t.id === id ? { ...t, ...task } : t);
                                } else {
                                    tasks = [...tasks, task];
                                }
                                tasks.sort((a, b) => a.order - b.order);
                            }
                            return { ...c, tasks };
                        })
                    };
                };
                return {
                    notes: state.notes.map(updateNoteObj),
                    activeNote: state.activeNote ? updateNoteObj(state.activeNote) : null,
                    openNotes: state.openNotes.map(updateNoteObj),
                };
            });
        } catch (error) {
            console.error('Failed to update task:', error);
        }
    },

    deleteTask: async (id) => {
        try {
            await api.delete(`/kanban/tasks/${id}`);
            set((state) => {
                const updateNoteObj = (n: Note) => {
                    if (!n.columns) return n;
                    return {
                        ...n,
                        columns: n.columns.map(c => ({
                            ...c,
                            tasks: (c.tasks || []).filter(t => t.id !== id)
                        }))
                    };
                };
                return {
                    notes: state.notes.map(updateNoteObj),
                    activeNote: state.activeNote ? updateNoteObj(state.activeNote) : null,
                    openNotes: state.openNotes.map(updateNoteObj),
                };
            });
        } catch (error) {
            console.error('Failed to delete task:', error);
        }
    },
}));
