import React, { useEffect, useState } from 'react';
import { Eye, Edit3, Link2, Save, Clock, Hash, Printer, Plus } from 'lucide-react';
import { useNoteStore } from '../../store/noteStore';
import { api } from '../../lib/api';
import type { Note } from '../../types';
import MarkdownEditor from './MarkdownEditor';
import MarkdownPreview from './MarkdownPreview';
import TabBar from './TabBar';
import KanbanView from './KanbanView';
import AddColumnModal from './AddColumnModal';
import AddTaskModal from './AddTaskModal';
import { formatDistanceToNow } from 'date-fns';

const EditorContainer: React.FC = () => {
    const { activeNote, editorMode, setEditorMode, isSaving, setActiveNote, addColumn } = useNoteStore();
    const [backlinks, setBacklinks] = useState<Note[]>([]);
    const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);

    useEffect(() => {
        if (activeNote) {
            // Fetch backlinks
            api.get(`/notes/${activeNote.id}/backlinks`)
                .then(({ data }) => setBacklinks(data))
                .catch(() => setBacklinks([]));
        }
    }, [activeNote?.id]);

    const handlePrint = () => {
        window.print();
    };

    if (!activeNote) {
        return (
            <div className="editor-area">
                <div className="tabs-row">
                    <TabBar />
                </div>
                <div className="empty-state">
                    <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <h3>No note selected</h3>
                    <p>Select a note from the sidebar or create a new one to start writing.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="editor-area">
            <div className="tabs-row">
                <TabBar />
            </div>

            <div className="editor-toolbar">
                <div className="toolbar-group">
                    {activeNote.type === 'note' && (
                        <>
                            <button
                                className={`toolbar-btn ${editorMode === 'edit' ? 'active' : ''}`}
                                onClick={() => setEditorMode('edit')}
                                title="Edit mode"
                            >
                                <Edit3 size={14} />
                                <span>Edit</span>
                            </button>
                            <button
                                className={`toolbar-btn ${editorMode === 'preview' ? 'active' : ''}`}
                                onClick={() => setEditorMode('preview')}
                                title="Preview mode"
                            >
                                <Eye size={14} />
                                <span>Preview</span>
                            </button>
                        </>
                    )}

                    {activeNote.type === 'kanban' && (
                        <>
                            <button
                                className="toolbar-btn"
                                onClick={() => setIsAddColumnModalOpen(true)}
                                title="Add Column"
                            >
                                <Plus size={14} />
                                <span>Add Column</span>
                            </button>
                            <button
                                className="toolbar-btn"
                                onClick={() => setIsAddTaskModalOpen(true)}
                                title="Add Task"
                            >
                                <Plus size={14} />
                                <span>Add Task</span>
                            </button>
                        </>
                    )}

                    {editorMode === 'preview' && activeNote.type === 'note' && (
                        <button
                            className="toolbar-btn print-btn"
                            onClick={handlePrint}
                            title="Print note to PDF"
                        >
                            <Printer size={14} />
                            <span>Print</span>
                        </button>
                    )}
                </div>

                <div className="toolbar-divider" />
                <div className="toolbar-spacer" />

                {/* Word count */}
                {activeNote.type === 'note' && (
                    <span className="word-count-badge">
                        {activeNote.content?.trim().split(/\s+/).filter(Boolean).length || 0} words
                    </span>
                )}

                {/* Tags indicator */}
                {activeNote.tags && activeNote.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {activeNote.tags.slice(0, 3).map((tag) => (
                            <span
                                key={tag.id}
                                className="tag-chip"
                                style={{ background: `${tag.color}22`, color: tag.color, border: `1px solid ${tag.color}44` }}
                            >
                                <Hash size={10} />
                                {tag.name}
                            </span>
                        ))}
                    </div>
                )}

                <div className="save-indicator" style={isSaving ? { color: 'var(--accent)' } : {}}>
                    {isSaving ? (
                        <><Save size={12} /> Saving...</>
                    ) : (
                        <><Clock size={12} /> {formatDistanceToNow(new Date(activeNote.updated_at), { addSuffix: true })}</>
                    )}
                </div>
            </div>


            {/* Editor Content */}
            <div className="editor-content">
                {activeNote.type === 'kanban' ? (
                    <KanbanView note={activeNote} />
                ) : editorMode === 'edit' ? (
                    <div className="editor-pane">
                        <MarkdownEditor noteId={activeNote.id} />
                    </div>
                ) : (
                    <div className="editor-pane preview-mode-container">
                        {/* Hidden print-only page header/footer */}
                        <div className="print-header">
                            <span className="print-title">{activeNote.title}</span>
                        </div>

                        <MarkdownPreview content={activeNote.content || ''} />

                        <div className="print-footer">
                            <span className="page-counter">Page </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Backlinks */}
            {activeNote.type === 'note' && backlinks.length > 0 && (
                <div className="backlinks-panel">
                    <div className="backlinks-title">
                        <Link2 size={10} style={{ display: 'inline', marginRight: '4px' }} />
                        Backlinks ({backlinks.length})
                    </div>
                    {backlinks.map((bl) => (
                        <div key={bl.id} className="backlink-item" onClick={() => setActiveNote(bl)}>
                            <Link2 size={11} />
                            {bl.title}
                        </div>
                    ))}
                </div>
            )}
            {activeNote.type === 'kanban' && isAddColumnModalOpen && (
                <AddColumnModal
                    onClose={() => setIsAddColumnModalOpen(false)}
                    onAdd={(title, color) => addColumn(activeNote.id, title, activeNote.columns?.length || 0, color)}
                />
            )}
            {activeNote.type === 'kanban' && isAddTaskModalOpen && (
                <AddTaskModal
                    onClose={() => setIsAddTaskModalOpen(false)}
                    onAdd={(title, description, dueDate, priority, tags) => {
                        const firstColumn = activeNote.columns?.[0];
                        if (firstColumn) {
                            const { addTask } = useNoteStore.getState();
                            addTask(firstColumn.id, title, firstColumn.tasks?.length || 0, description, dueDate, priority, tags);
                        }
                    }}
                />
            )}
        </div>
    );
};

export default EditorContainer;
