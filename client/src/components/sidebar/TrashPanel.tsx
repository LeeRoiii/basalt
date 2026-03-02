import React, { useEffect, useState } from 'react';
import { Trash2, RotateCcw, AlertCircle, FileText, Folder } from 'lucide-react';
import { useNoteStore } from '../../store/noteStore';
import { useAuthStore } from '../../store/authStore';
import type { Note, Folder as FolderType } from '../../types';
import ConfirmationModal from '../common/ConfirmationModal';

type ConfirmAction =
    | { type: 'delete_note', id: string, title?: string }
    | { type: 'delete_folder', id: string, name: string }
    | { type: 'empty_trash' }
    | null;

const TrashPanel: React.FC = () => {
    const { user } = useAuthStore();
    const {
        trashNotes,
        trashFolders,
        fetchTrash,
        restoreNote,
        restoreFolder,
        permanentlyDeleteNote,
        permanentlyDeleteFolder,
        emptyTrash
    } = useNoteStore();

    useEffect(() => {
        if (user) {
            fetchTrash(user.id);
        }
    }, [user, fetchTrash]);

    const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

    const executeConfirmAction = async () => {
        if (!confirmAction) return;

        try {
            if (confirmAction.type === 'empty_trash' && user) {
                await emptyTrash(user.id);
            } else if (confirmAction.type === 'delete_note') {
                await permanentlyDeleteNote(confirmAction.id);
            } else if (confirmAction.type === 'delete_folder') {
                await permanentlyDeleteFolder(confirmAction.id);
            }
        } finally {
            setConfirmAction(null);
        }
    };

    const handleRestoreFolder = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await restoreFolder(id);
    };

    const handlePermanentDeleteFolder = (e: React.MouseEvent, id: string, name: string) => {
        e.stopPropagation();
        setConfirmAction({ type: 'delete_folder', id, name });
    };

    const handleRestoreNote = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await restoreNote(id);
    };

    const handlePermanentDeleteNote = (e: React.MouseEvent, id: string, title?: string) => {
        e.stopPropagation();
        setConfirmAction({ type: 'delete_note', id, title });
    };

    const handleEmptyTrash = () => {
        if (!user) return;
        setConfirmAction({ type: 'empty_trash' });
    };

    const getModalContent = () => {
        if (!confirmAction) return null;
        if (confirmAction.type === 'empty_trash') {
            return {
                title: 'Clear Junk',
                message: 'Are you sure you want to permanently delete all items in the junk? This action cannot be undone.',
                confirmText: 'Clear All'
            };
        }
        if (confirmAction.type === 'delete_folder') {
            return {
                title: 'Delete Folder',
                message: `Permanently delete folder "${confirmAction.name}" and all its contents? This cannot be undone.`,
                confirmText: 'Delete Permanently'
            };
        }
        if (confirmAction.type === 'delete_note') {
            return {
                title: 'Delete Note',
                message: `Permanently delete note "${confirmAction.title || 'Untitled'}"? This cannot be undone.`,
                confirmText: 'Delete Permanently'
            };
        }
        return null;
    };

    const renderFolder = (folder: FolderType) => {
        const deletedAt = folder.deleted_at ? new Date(folder.deleted_at).toLocaleDateString() : 'Unknown';

        return (
            <div key={folder.id} className="tree-item" style={{ paddingLeft: 16, height: 40, borderBottom: '1px solid var(--border-subtle)' }} title={`Deleted: ${deletedAt}`}>
                <span className="tree-folder-icon" style={{ opacity: 0.7, marginRight: 8 }}>
                    <Folder size={16} />
                </span>
                <span className="tree-item-name" style={{ fontSize: 14 }}>{folder.name} <span style={{ opacity: 0.5, fontSize: '0.8em', marginLeft: 8 }}>({deletedAt})</span></span>
                <div className="tree-item-actions" style={{ gap: 8 }}>
                    <button className="icon-btn" title="Restore" onClick={(e) => handleRestoreFolder(e, folder.id)}>
                        <RotateCcw size={16} />
                    </button>
                    <button className="icon-btn danger" title="Delete Permanently" onClick={(e) => handlePermanentDeleteFolder(e, folder.id, folder.name)}>
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        );
    };

    const renderNote = (note: Note) => {
        const deletedAt = note.deleted_at ? new Date(note.deleted_at).toLocaleDateString() : 'Unknown';

        return (
            <div key={note.id} className="tree-item" style={{ paddingLeft: 16, height: 40, borderBottom: '1px solid var(--border-subtle)' }} title={`Deleted: ${deletedAt}`}>
                <span className="tree-note-icon" style={{ opacity: 0.7, marginRight: 8 }}>
                    <FileText size={16} />
                </span>
                <span className="tree-item-name" style={{ fontSize: 14 }}>{note.title || 'Untitled'} <span style={{ opacity: 0.5, fontSize: '0.8em', marginLeft: 8 }}>({deletedAt})</span></span>
                <div className="tree-item-actions" style={{ gap: 8 }}>
                    <button className="icon-btn" title="Restore" onClick={(e) => handleRestoreNote(e, note.id)}>
                        <RotateCcw size={16} />
                    </button>
                    <button className="icon-btn danger" title="Delete Permanently" onClick={(e) => handlePermanentDeleteNote(e, note.id, note.title)}>
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 32, maxWidth: 800, margin: '0 auto', width: '100%' }}>
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Junk</h1>
                    {(trashFolders.length > 0 || trashNotes.length > 0) && (
                        <button
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '6px 14px', fontSize: 13, fontWeight: 500,
                                backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 6,
                                cursor: 'pointer', transition: 'all 0.2s',
                                outline: 'none'
                            }}
                            onClick={handleEmptyTrash}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)'; }}
                        >
                            <Trash2 size={14} />
                            Clear all
                        </button>
                    )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertCircle size={16} />
                        <span>Items in the junk filter are deleted forever after 60 days.</span>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {trashFolders.map(renderFolder)}
                {trashNotes.map(renderNote)}

                {trashFolders.length === 0 && trashNotes.length === 0 && (
                    <div className="empty-state" style={{ marginTop: 40 }}>
                        <Trash2 size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                        <h3 style={{ margin: 0 }}>Junk is empty.</h3>
                    </div>
                )}
            </div>

            {confirmAction && getModalContent() && (
                <ConfirmationModal
                    isOpen={confirmAction !== null}
                    title={getModalContent()?.title || ''}
                    message={getModalContent()?.message || ''}
                    confirmText={getModalContent()?.confirmText || ''}
                    onConfirm={executeConfirmAction}
                    onCancel={() => setConfirmAction(null)}
                    isDanger={true}
                />
            )}
        </div>
    );
};

export default TrashPanel;
