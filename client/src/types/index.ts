export interface User {
    id: string;
    email: string;
    created_at: string;
}

export interface Folder {
    id: string;
    name: string;
    user_id: string;
    parent_id: string | null;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
    children?: Folder[];
    notes?: Note[];
}

export interface Tag {
    id: string;
    name: string;
    color: string;
    user_id: string;
    created_at: string;
}

export interface Note {
    id: string;
    title: string;
    content: string;
    user_id: string;
    folder_id: string | null;
    is_pinned: boolean;
    is_archived: boolean;
    word_count: number;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
    tags?: Tag[];
    folders?: { name: string };
}

export interface SearchResult {
    id: string;
    title: string;
    content: string;
    excerpt: string;
    updated_at: string;
    folder_id: string | null;
}

export type EditorMode = 'edit' | 'preview';
export type SidebarView = 'explorer' | 'search' | 'tags' | 'graph' | 'trash' | 'draw';
