import React, { useState, useCallback } from 'react';
import { Plus, FolderPlus, ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Trash2, Edit2, Search } from 'lucide-react';
import { useNoteStore } from '../../store/noteStore';
import { useAuthStore } from '../../store/authStore';
import type { Folder as FolderType, Note } from '../../types';

interface ContextMenuState {
    x: number;
    y: number;
    type: 'folder' | 'note';
    id: string;
    name: string;
}

interface FileExplorerProps {
    onSearchClick?: () => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ onSearchClick }) => {
    const { user } = useAuthStore();
    const {
        notes, folders, activeNote, activeFolder,
        createNote, createFolder, deleteNote, deleteFolder, renameFolder, updateNote, moveNote, moveFolder,
        setActiveNote, setActiveFolder,
    } = useNoteStore();

    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [showNewFolderModal, setShowNewFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [targetParentId, setTargetParentId] = useState<string | undefined>(undefined);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    const toggleFolder = (id: string) => {
        setExpandedFolders((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleCreateNote = async (folderId?: string) => {
        if (!user) return;
        const note = await createNote(user.id, folderId);
        if (folderId) {
            setExpandedFolders((prev) => new Set([...prev, folderId]));
        }
        // Force rename mode for new note
        setRenamingId(note.id);
        setRenameValue(note.title);
    };

    const handleCreateFolder = async () => {
        if (!user || !newFolderName.trim()) return;
        await createFolder(newFolderName.trim(), user.id, targetParentId);
        if (targetParentId) {
            setExpandedFolders((prev) => new Set([...prev, targetParentId]));
        }
        setNewFolderName('');
        setShowNewFolderModal(false);
        setTargetParentId(undefined);
    };

    const handleRename = async (id: string, type: 'folder' | 'note') => {
        if (renameValue.trim()) {
            if (type === 'folder') {
                await renameFolder(id, renameValue.trim());
            } else {
                await updateNote(id, { title: renameValue.trim() });
            }
        }
        setRenamingId(null);
    };

    const handleContextMenu = useCallback((e: React.MouseEvent, type: 'folder' | 'note', id: string, name: string) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedItems((prev) => {
            if (!prev.has(id)) {
                return new Set([id]);
            }
            return prev;
        });
        setContextMenu({ x: e.clientX, y: e.clientY, type, id, name });
    }, []);

    const closeContextMenu = () => setContextMenu(null);

    const handleBackgroundClick = () => {
        closeContextMenu();
        setSelectedItems(new Set());
    };

    const handleBulkDelete = async () => {
        closeContextMenu();
        const promises = Array.from(selectedItems).map((id) => {
            if (folders.some((f) => f.id === id)) return deleteFolder(id);
            if (notes.some((n) => n.id === id)) return deleteNote(id);
        });
        await Promise.all(promises);
        setSelectedItems(new Set());
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        let dragSelection = selectedItems;
        if (!selectedItems.has(id)) {
            dragSelection = new Set([id]);
            setSelectedItems(dragSelection);
        }

        const payload = Array.from(dragSelection).map(itemId => {
            const isFolder = folders.some(f => f.id === itemId);
            return { id: itemId, type: isFolder ? 'folder' : 'note' };
        });

        e.dataTransfer.setData('application/json', JSON.stringify(payload));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, targetId: string | 'root') => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        setDragOverId(targetId);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverId(null);
    };

    const handleDrop = async (e: React.DragEvent, targetId: string | 'root') => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverId(null);

        const payloadStr = e.dataTransfer.getData('application/json');
        if (!payloadStr) return;

        try {
            const items = JSON.parse(payloadStr) as { id: string, type: 'note' | 'folder' }[];
            const actualTargetId = targetId === 'root' ? null : targetId;

            if (items.some(item => item.id === actualTargetId)) return;

            const promises = items.map(item => {
                if (item.type === 'note') return moveNote(item.id, actualTargetId);
                if (item.type === 'folder') return moveFolder(item.id, actualTargetId);
                return Promise.resolve();
            });

            await Promise.all(promises);
        } catch (error) {
            console.error('Drop failed:', error);
        }
    };

    const handleNodeSelect = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (e.ctrlKey || e.metaKey) {
            setSelectedItems((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
            });
        } else {
            setSelectedItems(new Set([id]));
        }
    };

    const handleNoteClick = async (e: React.MouseEvent, note: Note) => {
        handleNodeSelect(e, note.id);
        setActiveNote(note);
        setActiveFolder(note.folder_id);
    };

    const handleFolderClick = async (e: React.MouseEvent, folder: FolderType) => {
        handleNodeSelect(e, folder.id);
        toggleFolder(folder.id);
        setActiveFolder(folder.id);
    };

    // Build folder tree
    const rootFolders = folders.filter((f) => !f.parent_id);
    const rootNotes = notes.filter((n) => !n.folder_id);

    const getFolderNotes = (folderId: string) => notes.filter((n) => n.folder_id === folderId);
    const getChildFolders = (parentId: string) => folders.filter((f) => f.parent_id === parentId);

    const renderFolder = (folder: FolderType, depth = 0) => {
        const isExpanded = expandedFolders.has(folder.id);
        const isSelected = selectedItems.has(folder.id);
        const folderNotes = getFolderNotes(folder.id);
        const childFolders = getChildFolders(folder.id);
        const paddingLeft = 8 + depth * 14;

        return (
            <div key={folder.id}>
                <div
                    className={`tree-item ${activeFolder === folder.id ? 'active' : ''} ${dragOverId === folder.id ? 'drag-over' : ''} ${isSelected ? 'selected' : ''}`}
                    style={{ paddingLeft }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, folder.id)}
                    onDragOver={(e) => handleDragOver(e, folder.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, folder.id)}
                    onClick={(e) => handleFolderClick(e, folder)}
                    onContextMenu={(e) => handleContextMenu(e, 'folder', folder.id, folder.name)}
                >
                    <span className="tree-item-icon" style={{ opacity: 0.5 }}>
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </span>
                    <span className={`tree-item-icon ${isExpanded ? 'tree-folder-icon open' : 'tree-folder-icon'}`}>
                        {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
                    </span>
                    {renamingId === folder.id ? (
                        <input
                            className="inline-input"
                            value={renameValue}
                            autoFocus
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => handleRename(folder.id, 'folder')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRename(folder.id, 'folder');
                                if (e.key === 'Escape') setRenamingId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span className="tree-item-name">{folder.name}</span>
                    )}
                    <div className="tree-item-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="icon-btn"
                            title="New note"
                            onClick={() => handleCreateNote(folder.id)}
                        >
                            <Plus size={12} />
                        </button>
                    </div>
                </div>
                {isExpanded && (
                    <div className="tree-children">
                        {childFolders.map((cf) => renderFolder(cf, depth + 1))}
                        {folderNotes.map((note) => renderNote(note, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    const renderNote = (note: Note, depth = 0) => {
        const paddingLeft = 14 + depth * 14; // Indent more for notes without toggle icon
        const isActive = activeNote?.id === note.id;
        const isSelected = selectedItems.has(note.id);

        return (
            <div
                key={note.id}
                className={`tree-item ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
                style={{ paddingLeft }}
                draggable
                onDragStart={(e) => handleDragStart(e, note.id)}
                onClick={(e) => handleNoteClick(e, note)}
                onContextMenu={(e) => handleContextMenu(e, 'note', note.id, note.title)}
            >
                <span className={`tree-item-icon ${isActive ? 'tree-note-icon active' : 'tree-note-icon'}`}>
                    <FileText size={14} />
                </span>
                {renamingId === note.id ? (
                    <input
                        className="inline-input"
                        value={renameValue}
                        autoFocus
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleRename(note.id, 'note')}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(note.id, 'note');
                            if (e.key === 'Escape') setRenamingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span className="tree-item-name">{note.title || 'Untitled'}</span>
                )}
            </div>
        );
    };

    const isMultiSelection = selectedItems.size > 1;

    return (
        <div className="file-explorer-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={handleBackgroundClick}>
            {/* Header */}
            <div className="sidebar-header">
                <span className="sidebar-title">Files</span>
                <div className="sidebar-actions">
                    <button
                        className="icon-btn"
                        title="New Note"
                        onClick={() => handleCreateNote()}
                    >
                        <Plus size={14} />
                    </button>
                    <button
                        className="icon-btn"
                        title="New Folder"
                        onClick={() => {
                            setTargetParentId(undefined);
                            setShowNewFolderModal(true);
                        }}
                    >
                        <FolderPlus size={14} />
                    </button>
                </div>
            </div>

            {/* Quick Search Trigger */}
            <div style={{ padding: '8px 16px' }}>
                <div
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)',
                        borderRadius: 6, padding: '6px 10px', cursor: 'pointer',
                        color: 'var(--text-muted)', fontSize: 13,
                        transition: 'border-color 0.2s',
                        justifyContent: 'space-between'
                    }}
                    onClick={onSearchClick}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Search size={14} style={{ flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Search notes...</span>
                    </div>
                    <div style={{
                        fontSize: 11, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                        padding: '2px 6px', borderRadius: 4, opacity: 0.7
                    }}>
                        {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'}+K
                    </div>
                </div>
            </div>

            {/* Tree */}
            <div
                className={`sidebar-content ${dragOverId === 'root' ? 'drag-over-root' : ''}`}
                onDragOver={(e) => handleDragOver(e, 'root')}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'root')}
            >
                {rootFolders.map((f) => renderFolder(f))}
                {rootNotes.map((n) => renderNote(n))}
                {folders.length === 0 && notes.length === 0 && (
                    <div className="empty-sidebar-msg">
                        No notes yet. Create one!
                    </div>
                )}
            </div>

            {/* New Folder Modal */}
            {showNewFolderModal && (
                <div className="modal-overlay" onClick={() => setShowNewFolderModal(false)}>
                    <div className="modal" style={{ maxWidth: '320px' }} onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-title">Folder Name</h3>
                        <input
                            autoFocus
                            className="modal-input"
                            placeholder="Eg, Assignments..."
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreateFolder();
                                if (e.key === 'Escape') setShowNewFolderModal(false);
                            }}
                        />
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowNewFolderModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleCreateFolder}>Create</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="context-menu"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    {isMultiSelection ? (
                        <div className="context-menu-item danger" onClick={handleBulkDelete}>
                            <Trash2 size={14} /> Delete {selectedItems.size} items
                        </div>
                    ) : contextMenu.type === 'folder' ? (
                        <>
                            <div className="context-menu-item" onClick={() => { handleCreateNote(contextMenu.id); closeContextMenu(); }}>
                                <Plus size={14} /> New Note Inside
                            </div>
                            <div className="context-menu-item" onClick={() => {
                                setTargetParentId(contextMenu.id);
                                setShowNewFolderModal(true);
                                closeContextMenu();
                            }}>
                                <FolderPlus size={14} /> New Subfolder
                            </div>
                            <div className="context-menu-divider" />
                            <div className="context-menu-item" onClick={() => {
                                setRenamingId(contextMenu.id);
                                setRenameValue(contextMenu.name);
                                closeContextMenu();
                            }}>
                                <Edit2 size={14} /> Rename
                            </div>
                            <div className="context-menu-item danger" onClick={handleBulkDelete}>
                                <Trash2 size={14} /> Delete Folder
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="context-menu-item" onClick={() => {
                                setRenamingId(contextMenu.id);
                                setRenameValue(contextMenu.name);
                                closeContextMenu();
                            }}>
                                <Edit2 size={14} /> Rename
                            </div>
                            <div className="context-menu-item danger" onClick={handleBulkDelete}>
                                <Trash2 size={14} /> Delete Note
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default FileExplorer;
