import React, { useState } from 'react';
import { Layout, Plus, Trash2, Edit2 } from 'lucide-react';
import { useNoteStore } from '../../store/noteStore';
import { useAuthStore } from '../../store/authStore';
import ConfirmationModal from '../common/ConfirmationModal';

const ProjectPanel: React.FC = () => {
    const { user } = useAuthStore();
    const { notes, activeNote, createKanban, deleteNote, updateNote, setActiveNote } = useNoteStore();
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

    const kanbanProjects = notes.filter(n => n.type === 'kanban');

    const handleCreateProject = async () => {
        if (!user || !newName.trim()) return;
        try {
            await createKanban(user.id, undefined, newName.trim());
            setIsAdding(false);
            setNewName('');
        } catch (err) {
            console.error('❌ Failed to create project:', err);
        }
    };

    const handleRename = async (id: string) => {
        if (renameValue.trim()) {
            await updateNote(id, { title: renameValue.trim() });
        }
        setRenamingId(null);
    };

    return (
        <div className="file-explorer-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="sidebar-header">
                <span className="sidebar-title">Projects</span>
                <div className="sidebar-actions">
                    <button
                        className="icon-btn"
                        title="New Project"
                        onClick={() => setIsAdding(true)}
                    >
                        <Plus size={14} />
                    </button>
                </div>
            </div>

            <div className="sidebar-content" style={{ padding: '8px 0' }}>
                {isAdding && (
                    <div className="tree-item active" style={{ paddingLeft: '16px' }}>
                        <span className="tree-item-icon" style={{ color: 'var(--accent)' }}>
                            <Layout size={14} />
                        </span>
                        <input
                            className="inline-input"
                            autoFocus
                            placeholder="Project name..."
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onBlur={() => {
                                if (!newName.trim()) setIsAdding(false);
                                else handleCreateProject();
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreateProject();
                                if (e.key === 'Escape') {
                                    setIsAdding(false);
                                    setNewName('');
                                }
                            }}
                        />
                    </div>
                )}
                {kanbanProjects.length === 0 && !isAdding ? (
                    <div className="empty-sidebar-msg">
                        No projects yet. Create your first board!
                    </div>
                ) : (
                    kanbanProjects.map(project => (
                        <div
                            key={project.id}
                            className={`tree-item ${activeNote?.id === project.id ? 'active' : ''}`}
                            style={{ paddingLeft: '16px' }}
                            onClick={() => setActiveNote(project)}
                        >
                            <span className="tree-item-icon" style={{ color: 'var(--accent)' }}>
                                <Layout size={14} />
                            </span>
                            {renamingId === project.id ? (
                                <input
                                    className="inline-input"
                                    value={renameValue}
                                    autoFocus
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onBlur={() => handleRename(project.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleRename(project.id);
                                        if (e.key === 'Escape') setRenamingId(null);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span className="tree-item-name">{project.title}</span>
                            )}
                            <div className="tree-item-actions">
                                <button
                                    className="icon-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setRenamingId(project.id);
                                        setRenameValue(project.title);
                                    }}
                                >
                                    <Edit2 size={12} />
                                </button>
                                <button
                                    className="icon-btn danger"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setProjectToDelete(project.id);
                                    }}
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <ConfirmationModal
                isOpen={!!projectToDelete}
                title="Delete Project"
                message="Are you sure you want to delete this project board? All columns and tasks within this project will be moved to the trash."
                confirmText="Delete Project"
                isDanger
                onConfirm={() => {
                    if (projectToDelete) {
                        deleteNote(projectToDelete);
                        setProjectToDelete(null);
                    }
                }}
                onCancel={() => setProjectToDelete(null)}
            />
        </div>
    );
};

export default ProjectPanel;
