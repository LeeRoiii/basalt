import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Tag as TagIcon, AlignLeft, Flag } from 'lucide-react';

interface AddTaskModalProps {
    onClose: () => void;
    onAdd: (title: string, description?: string, dueDate?: string, priority?: string, tags?: string[]) => void;
}

const PRIORITIES = [
    { value: 'low', label: 'Low', color: '#4ade80' },
    { value: 'medium', label: 'Medium', color: '#facc15' },
    { value: 'high', label: 'High', color: '#fb923c' },
    { value: 'urgent', label: 'Urgent', color: '#f87171' },
];

const AddTaskModal: React.FC<AddTaskModalProps> = ({ onClose, onAdd }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState<string>('');
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim()) {
            onAdd(
                title.trim(),
                description.trim() || undefined,
                dueDate ? new Date(dueDate + 'T00:00:00').toISOString() : undefined,
                priority || undefined,
                tags.length > 0 ? tags : undefined
            );
            onClose();
        }
    };

    const addTag = () => {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            setTags([...tags, newTag.trim()]);
            setNewTag('');
        }
    };

    const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag));

    return (
        <div className="task-modal-overlay" onClick={onClose}>
            <div className="task-modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
                <div className="task-modal-header" style={{ padding: '12px 16px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>New Task</h3>
                    <button className="icon-btn" onClick={onClose}><X size={16} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="task-modal-content" style={{ padding: '16px', gap: '16px' }}>
                        {/* Title */}
                        <div className="modal-section" style={{ gap: '6px' }}>
                            <label className="modal-section-label" style={{ fontSize: '11px' }}>Title</label>
                            <input
                                ref={inputRef}
                                className="task-modal-input"
                                placeholder="What needs to be done?"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                required
                                style={{ fontSize: '15px', height: '40px' }}
                            />
                        </div>

                        {/* Description */}
                        <div className="modal-section" style={{ gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <AlignLeft size={12} className="modal-section-label" />
                                <label className="modal-section-label" style={{ margin: 0, fontSize: '11px' }}>Description</label>
                            </div>
                            <textarea
                                className="task-modal-input task-modal-textarea"
                                placeholder="Add more details..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                style={{ minHeight: '72px', fontSize: '13px' }}
                            />
                        </div>

                        {/* Priority */}
                        <div className="modal-section" style={{ gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Flag size={12} className="modal-section-label" />
                                <label className="modal-section-label" style={{ margin: 0, fontSize: '11px' }}>Priority</label>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {PRIORITIES.map(p => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => setPriority(priority === p.value ? '' : p.value)}
                                        style={{
                                            flex: 1,
                                            height: '30px',
                                            borderRadius: '6px',
                                            border: `1.5px solid ${priority === p.value ? p.color : 'var(--border-subtle)'}`,
                                            background: priority === p.value ? `${p.color}22` : 'var(--bg-secondary)',
                                            color: priority === p.value ? p.color : 'var(--text-muted)',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Due Date + Tags */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="modal-section" style={{ gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Calendar size={12} className="modal-section-label" />
                                    <label className="modal-section-label" style={{ margin: 0, fontSize: '11px' }}>Due Date</label>
                                </div>
                                <input
                                    type="date"
                                    className="task-modal-input"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                />
                            </div>

                            <div className="modal-section" style={{ gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <TagIcon size={12} className="modal-section-label" />
                                    <label className="modal-section-label" style={{ margin: 0, fontSize: '11px' }}>Tags</label>
                                </div>
                                <div className="tag-editor">
                                    {tags.length > 0 && (
                                        <div className="tag-list" style={{ marginBottom: '8px' }}>
                                            {tags.map(tag => (
                                                <div key={tag} className="task-tag" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', fontSize: '10px' }}>
                                                    {tag}
                                                    <button type="button" aria-label={`Remove ${tag}`} onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'inherit' }}><X size={10} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <input
                                        className="task-modal-input"
                                        placeholder="Add tag..."
                                        value={newTag}
                                        onChange={e => setNewTag(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="task-modal-footer" style={{ padding: '12px 16px', background: 'var(--bg-tertiary)' }}>
                        <button type="button" className="btn btn-secondary" style={{ flex: 1, height: '36px' }} onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '36px' }}>Create Task</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddTaskModal;
