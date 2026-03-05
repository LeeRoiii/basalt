import React, { useState } from 'react';
import { Plus, Tag, Trash2 } from 'lucide-react';
import { useNoteStore } from '../../store/noteStore';
import { useAuthStore } from '../../store/authStore';

const TAG_COLORS = [
    '#3ECF8E', '#ec4899', '#f59e0b', '#10b981',
    '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4',
];

const TagsPanel: React.FC = () => {
    const { user } = useAuthStore();
    const { tags, createTag, deleteTag, notes, setActiveNote } = useNoteStore();
    const [showNewTag, setShowNewTag] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    const handleCreateTag = async () => {
        if (!user || !newTagName.trim()) return;
        await createTag(newTagName.trim(), newTagColor, user.id);
        setNewTagName('');
        setShowNewTag(false);
    };

    const getNotesByTag = (tagId: string) => notes.filter((n) => n.tags?.some((t) => t.id === tagId));

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="sidebar-header">
                <span className="sidebar-title">Tags</span>
                <div className="sidebar-actions">
                    <button className="icon-btn" onClick={() => setShowNewTag(!showNewTag)}>
                        <Plus size={14} />
                    </button>
                </div>
            </div>

            {showNewTag && (
                <div style={{ padding: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <input
                        autoFocus
                        className="modal-input"
                        style={{ marginBottom: '8px' }}
                        placeholder="Tag name..."
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTag(); if (e.key === 'Escape') setShowNewTag(false); }}
                    />
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        {TAG_COLORS.map((color) => (
                            <button
                                key={color}
                                style={{
                                    width: '20px', height: '20px', borderRadius: '50%',
                                    background: color, border: newTagColor === color ? '2px solid white' : '2px solid transparent',
                                    cursor: 'pointer',
                                }}
                                onClick={() => setNewTagColor(color)}
                            />
                        ))}
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleCreateTag}>
                        Create Tag
                    </button>
                </div>
            )}

            <div className="sidebar-content">
                {tags.length === 0 && (
                    <div style={{ padding: '16px 12px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
                        No tags yet. Create one!
                    </div>
                )}
                {tags.map((tag) => {
                    const tagNotes = getNotesByTag(tag.id);
                    const isExpanded = selectedTag === tag.id;
                    return (
                        <div key={tag.id}>
                            <div
                                className={`tree-item ${isExpanded ? 'active' : ''}`}
                                style={{ paddingLeft: '8px' }}
                                onClick={() => setSelectedTag(isExpanded ? null : tag.id)}
                            >
                                <span className="tree-item-icon">
                                    <Tag size={14} style={{ color: tag.color }} />
                                </span>
                                <span className="tree-item-name" style={{ color: isExpanded ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                    {tag.name}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '4px' }}>
                                    {tagNotes.length}
                                </span>
                                <div className="tree-item-actions">
                                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); deleteTag(tag.id); }}>
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            </div>
                            {isExpanded && tagNotes.map((note) => (
                                <div
                                    key={note.id}
                                    className="tree-item"
                                    style={{ paddingLeft: '28px' }}
                                    onClick={() => setActiveNote(note)}
                                >
                                    <span className="tree-item-name" style={{ fontSize: '12px' }}>{note.title}</span>
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TagsPanel;
