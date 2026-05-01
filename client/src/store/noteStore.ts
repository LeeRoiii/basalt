import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
        folderId: string | null;
    };
    isFetching: {
        notes: boolean;
        folders: boolean;
        tags: boolean;
    };
    isSearchOpen: boolean;
    setSearchOpen: (open: boolean) => void;

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
    fetchFolders: () => Promise<void>;
    fetchTags: () => Promise<void>;
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
    addColumn: (noteId: string, title: string, order: number, color?: string) => Promise<void>;
    updateColumn: (id: string, data: { title?: string, color?: string, order?: number }) => Promise<void>;
    deleteColumn: (id: string) => Promise<void>;
    addTask: (columnId: string, content: string, order: number, description?: string, due_date?: string, priority?: string, tags?: string[]) => Promise<void>;
    updateTask: (id: string, data: {
        content?: string,
        column_id?: string,
        order?: number,
        description?: string,
        due_date?: string,
        priority?: string,
        tags?: string[]
    }) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;

    // Store Management
    clearStore: () => void;
}

export const useNoteStore = create<NoteState>()(
    persist(
        (set) => ({
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
            isSearchOpen: false,
            isSaving: false,
            lastFetched: {
                notes: 0,
                folders: 0,
                tags: 0,
                folderId: null,
            },
            isFetching: {
                notes: false,
                folders: false,
                tags: false,
            },

            setNotes: (notes) => set({ notes }),
            setFolders: (folders) => set({ folders }),
            setTags: (tags) => set({ tags }),
            setSearchOpen: (open) => set({ isSearchOpen: open }),
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

            clearStore: () => set({
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
                isSearchOpen: false,
                isSaving: false,
                lastFetched: { notes: 0, folders: 0, tags: 0, folderId: null },
                isFetching: { notes: false, folders: false, tags: false }
            }),

            fetchNotes: async (userId, folderId) => {
                const { isFetching, lastFetched } = useNoteStore.getState();
                const now = Date.now();
                const normalizedFolderId = folderId ?? null;
                const folderChanged = normalizedFolderId !== lastFetched.folderId;

                // Skip if currently fetching, or if we fetched within 30s AND the folder hasn't changed
                if (isFetching.notes || (!folderChanged && now - lastFetched.notes < 30000)) return;

                set((state) => ({ isFetching: { ...state.isFetching, notes: true } }));
                try {
                    // Use minimal=true for much faster sidebar/listing loads
                    const params: Record<string, string> = { minimal: 'true' };
                    if (normalizedFolderId) params.folder_id = normalizedFolderId;
                    const { data } = await api.get('/notes', { params });
                    set((state) => ({
                        notes: data,
                        lastFetched: { ...state.lastFetched, notes: Date.now(), folderId: normalizedFolderId },
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

            fetchFolders: async () => {
                const { lastFetched, isFetching } = useNoteStore.getState();
                const now = Date.now();

                if (isFetching.folders || (now - lastFetched.folders < 30000)) return;

                set((state) => ({ isFetching: { ...state.isFetching, folders: true } }));
                try {
                    const { data } = await api.get('/folders');
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

            fetchTags: async () => {
                const { lastFetched, isFetching } = useNoteStore.getState();
                const now = Date.now();

                if (isFetching.tags || (now - lastFetched.tags < 30000)) return;

                set((state) => ({ isFetching: { ...state.isFetching, tags: true } }));
                try {
                    const { data } = await api.get('/tags');
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
                const previousState = useNoteStore.getState();
                set({ isSaving: true });

                // Optimistic update
                set((state) => ({
                    notes: state.notes.map((n) => (n.id === id ? { ...n, ...noteData } : n)),
                    activeNote: state.activeNote?.id === id ? { ...state.activeNote, ...noteData } : state.activeNote,
                    openNotes: state.openNotes.map((n) => (n.id === id ? { ...n, ...noteData } : n)),
                }));

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
                    // Rollback
                    set({
                        notes: previousState.notes,
                        activeNote: previousState.activeNote,
                        openNotes: previousState.openNotes,
                        isSaving: false
                    });
                }
            },

            deleteNote: async (id) => {
                const previousState = useNoteStore.getState();

                // Optimistic update
                set((state) => ({
                    notes: state.notes.filter((n) => n.id !== id),
                    openNotes: state.openNotes.filter((n) => n.id !== id),
                    activeNote: state.activeNote?.id === id
                        ? (state.openNotes.length > 1 ? state.openNotes.filter(n => n.id !== id).slice(-1)[0] : null)
                        : state.activeNote
                }));

                try {
                    await api.delete(`/notes/${id}`);
                } catch (error) {
                    console.error('Failed to delete note:', error);
                    // Rollback
                    set({
                        notes: previousState.notes,
                        openNotes: previousState.openNotes,
                        activeNote: previousState.activeNote
                    });
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
                const previousState = useNoteStore.getState();
                // Optimistic update
                set((state) => ({ folders: state.folders.filter((f) => f.id !== id) }));

                try {
                    await api.delete(`/folders/${id}`);
                } catch (error) {
                    console.error('Failed to delete folder:', error);
                    // Rollback
                    set({ folders: previousState.folders });
                }
            },

            renameFolder: async (id, name) => {
                const previousState = useNoteStore.getState();
                // Optimistic update
                set((state) => ({
                    folders: state.folders.map((f) => (f.id === id ? { ...f, name } : f)),
                }));

                try {
                    const { data } = await api.put(`/folders/${id}`, { name });
                    set((state) => ({
                        folders: state.folders.map((f) => (f.id === id ? { ...f, name: data.name } : f)),
                    }));
                } catch (error) {
                    console.error('Failed to rename folder:', error);
                    // Rollback
                    set({ folders: previousState.folders });
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
                const previousState = useNoteStore.getState();
                // Optimistic update
                set((state) => ({
                    notes: state.notes.map((n) => (n.id === id ? { ...n, folder_id: folderId } : n)),
                    activeNote: state.activeNote?.id === id ? { ...state.activeNote, folder_id: folderId } : state.activeNote,
                }));

                try {
                    const { data } = await api.put(`/notes/${id}`, { folder_id: folderId });
                    set((state) => ({
                        notes: state.notes.map((n) => (n.id === id ? { ...n, folder_id: folderId, updated_at: data.updated_at } : n)),
                        activeNote: state.activeNote?.id === id ? { ...state.activeNote, folder_id: folderId, updated_at: data.updated_at } : state.activeNote,
                    }));
                } catch (error) {
                    console.error('Failed to move note:', error);
                    // Rollback
                    set({ notes: previousState.notes, activeNote: previousState.activeNote });
                }
            },

            moveFolder: async (id, parentId) => {
                const previousState = useNoteStore.getState();
                // Optimistic update
                set((state) => ({
                    folders: state.folders.map((f) => (f.id === id ? { ...f, parent_id: parentId } : f)),
                }));

                try {
                    await api.put(`/folders/${id}`, { parent_id: parentId });
                } catch (error) {
                    console.error('Failed to move folder:', error);
                    // Rollback
                    set({ folders: previousState.folders });
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

### 📊 Advanced Visualization
You can now visualize complex ideas with **Mermaid** and **MathJax**:

\`\`\`mermaid
graph TD;
    A[Start] --> B{Decision};
    B -- Yes --> C[Result 1];
    B -- No --> D[Result 2];
\`\`\`

$$ \sqrt{a^2 + b^2} = c $$

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
                    const col1 = await api.post('/kanban/columns', { note_id: note.id, title: 'To Do', color: '#3ECF8E', order: 0 });
                    const col2 = await api.post('/kanban/columns', { note_id: note.id, title: 'In Progress', color: '#facc15', order: 1 });
                    const col3 = await api.post('/kanban/columns', { note_id: note.id, title: 'Done', color: '#4ade80', order: 2 });

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

            addColumn: async (noteId, title, order, color) => {
                const previousState = useNoteStore.getState();
                const tempId = `temp-${Date.now()}`;
                const newColumn = { id: tempId, note_id: noteId, title, color, order, tasks: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() };

                // Optimistic update
                set((state) => ({
                    notes: state.notes.map(n => n.id === noteId ? { ...n, columns: [...(n.columns || []), newColumn as any] } : n),
                    activeNote: state.activeNote?.id === noteId ? { ...state.activeNote, columns: [...(state.activeNote.columns || []), newColumn as any] } : state.activeNote,
                    openNotes: state.openNotes.map(n => n.id === noteId ? { ...n, columns: [...(n.columns || []), newColumn as any] } : n),
                }));

                try {
                    const { data: column } = await api.post('/kanban/columns', { note_id: noteId, title, color, order });
                    set((state) => {
                        const replaceTemp = (n: Note) => {
                            if (!n.columns) return n;
                            return { ...n, columns: n.columns.map(c => c.id === tempId ? { ...column, tasks: [] } : c) };
                        };
                        return {
                            notes: state.notes.map(replaceTemp),
                            activeNote: state.activeNote ? replaceTemp(state.activeNote) : null,
                            openNotes: state.openNotes.map(replaceTemp),
                        };
                    });
                } catch (error) {
                    console.error('Failed to add column:', error);
                    set({ notes: previousState.notes, activeNote: previousState.activeNote, openNotes: previousState.openNotes });
                }
            },

            updateColumn: async (id, columnData) => {
                const previousState = useNoteStore.getState();

                const applyUpdate = (n: Note) => {
                    if (!n.columns) return n;
                    return { ...n, columns: n.columns.map(c => c.id === id ? { ...c, ...columnData } : c) };
                };

                // Optimistic update
                set((state) => ({
                    notes: state.notes.map(applyUpdate),
                    activeNote: state.activeNote ? applyUpdate(state.activeNote) : null,
                    openNotes: state.openNotes.map(applyUpdate),
                }));

                try {
                    const { data: column } = await api.put(`/kanban/columns/${id}`, columnData);
                    set((state) => {
                        const applyFinal = (n: Note) => ({
                            ...n,
                            columns: n.columns?.map(c => c.id === id ? { ...c, ...column } : c)
                        });
                        return {
                            notes: state.notes.map(applyFinal as any),
                            activeNote: state.activeNote ? applyFinal(state.activeNote) : null,
                            openNotes: state.openNotes.map(applyFinal as any),
                        };
                    });
                } catch (error) {
                    console.error('Failed to update column:', error);
                    set({ notes: previousState.notes, activeNote: previousState.activeNote, openNotes: previousState.openNotes });
                }
            },

            deleteColumn: async (id) => {
                const previousState = useNoteStore.getState();

                const applyDelete = (n: Note) => {
                    if (!n.columns) return n;
                    return { ...n, columns: n.columns.filter(c => c.id !== id) };
                };

                // Optimistic update
                set((state) => ({
                    notes: state.notes.map(applyDelete),
                    activeNote: state.activeNote ? applyDelete(state.activeNote) : null,
                    openNotes: state.openNotes.map(applyDelete),
                }));

                try {
                    await api.delete(`/kanban/columns/${id}`);
                } catch (error) {
                    console.error('Failed to delete column:', error);
                    set({ notes: previousState.notes, activeNote: previousState.activeNote, openNotes: previousState.openNotes });
                }
            },

            addTask: async (columnId, content, order, description, due_date, priority, tags) => {
                const previousState = useNoteStore.getState();
                const tempId = `temp-${Date.now()}`;
                const newTask = {
                    id: tempId, column_id: columnId, content, order,
                    description, due_date, priority, tags,
                    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
                };

                const applyAddTask = (n: Note) => {
                    if (!n.columns) return n;
                    return {
                        ...n,
                        columns: n.columns.map(c => c.id === columnId ? { ...c, tasks: [...(c.tasks || []), newTask as any].sort((a, b) => a.order - b.order) } : c)
                    };
                };

                // Optimistic update
                set((state) => ({
                    notes: state.notes.map(applyAddTask),
                    activeNote: state.activeNote ? applyAddTask(state.activeNote) : null,
                    openNotes: state.openNotes.map(applyAddTask),
                }));

                try {
                    const { data: task } = await api.post('/kanban/tasks', {
                        column_id: columnId, content, order, description, due_date, priority, tags
                    });
                    set((state) => {
                        const replaceTemp = (n: Note) => {
                            if (!n.columns) return n;
                            return {
                                ...n,
                                columns: n.columns.map(c => c.id === columnId ? { ...c, tasks: c.tasks?.map(t => t.id === tempId ? task : t) } : c)
                            };
                        };
                        return {
                            notes: state.notes.map(replaceTemp as any),
                            activeNote: state.activeNote ? replaceTemp(state.activeNote) : null,
                            openNotes: state.openNotes.map(replaceTemp as any),
                        };
                    });
                } catch (error) {
                    console.error('Failed to add task:', error);
                    set({ notes: previousState.notes, activeNote: previousState.activeNote, openNotes: previousState.openNotes });
                }
            },

            updateTask: async (id, taskData) => {
                const previousState = useNoteStore.getState();

                // Helper for task updates (handles moving columns)
                const applyTaskUpdate = (n: Note, targetTask: any) => {
                    if (!n.columns) return n;
                    return {
                        ...n,
                        columns: n.columns.map(c => {
                            let tasks = c.tasks || [];
                            // If task moved FROM this column
                            if (taskData.column_id && c.id !== taskData.column_id) {
                                tasks = tasks.filter(t => t.id !== id);
                            }
                            // If task moved TO this column or updated in this column
                            else if (c.id === (taskData.column_id || targetTask.column_id)) {
                                const exists = tasks.find(t => t.id === id);
                                if (exists) {
                                    tasks = tasks.map(t => t.id === id ? { ...t, ...targetTask } : t);
                                } else {
                                    tasks = [...tasks, { ...targetTask, id }];
                                }
                                tasks.sort((a, b) => a.order - b.order);
                            }
                            return { ...c, tasks };
                        })
                    };
                };

                // Optimistic update
                set((state) => ({
                    notes: state.notes.map(n => applyTaskUpdate(n, taskData)),
                    activeNote: state.activeNote ? applyTaskUpdate(state.activeNote, taskData) : null,
                    openNotes: state.openNotes.map(n => applyTaskUpdate(n, taskData)),
                }));

                try {
                    const { data: task } = await api.put(`/kanban/tasks/${id}`, taskData);
                    set((state) => ({
                        notes: state.notes.map(n => applyTaskUpdate(n, task)),
                        activeNote: state.activeNote ? applyTaskUpdate(state.activeNote, task) : null,
                        openNotes: state.openNotes.map(n => applyTaskUpdate(n, task)),
                    }));
                } catch (error) {
                    console.error('Failed to update task:', error);
                    // Rollback
                    set({
                        notes: previousState.notes,
                        activeNote: previousState.activeNote,
                        openNotes: previousState.openNotes
                    });
                }
            },

            deleteTask: async (id) => {
                const previousState = useNoteStore.getState();

                const applyTaskDelete = (n: Note) => {
                    if (!n.columns) return n;
                    return {
                        ...n,
                        columns: n.columns.map(c => ({
                            ...c,
                            tasks: (c.tasks || []).filter(t => t.id !== id)
                        }))
                    };
                };

                // Optimistic update
                set((state) => ({
                    notes: state.notes.map(applyTaskDelete),
                    activeNote: state.activeNote ? applyTaskDelete(state.activeNote) : null,
                    openNotes: state.openNotes.map(applyTaskDelete),
                }));

                try {
                    await api.delete(`/kanban/tasks/${id}`);
                } catch (error) {
                    console.error('Failed to delete task:', error);
                    // Rollback
                    set({
                        notes: previousState.notes,
                        activeNote: previousState.activeNote,
                        openNotes: previousState.openNotes
                    });
                }
            },
        }),
        { name: 'basalt-note-store' }
    )
);
