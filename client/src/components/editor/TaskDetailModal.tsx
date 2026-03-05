import React, { useState } from 'react';
import { X, Flag, MoreHorizontal, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import type { KanbanTask } from '../../types';
import { useNoteStore } from '../../store/noteStore';
import { useAuthStore } from '../../store/authStore';

interface TaskDetailModalProps {
    task: KanbanTask;
    onClose: () => void;
}

const PRIORITIES = [
    { value: 'low', label: 'Low', color: '#4ade80' },
    { value: 'medium', label: 'Medium', color: '#facc15' },
    { value: 'high', label: 'High', color: '#fb923c' },
    { value: 'urgent', label: 'Urgent', color: '#f87171' },
];

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose }) => {
    const { updateTask } = useNoteStore();
    const { user } = useAuthStore();
    const [isEditing, setIsEditing] = useState(false);

    // User display details
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
    const avatarUrl = user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${userName}&backgroundColor=1f2937`;

    // Edit state
    const [content, setContent] = useState(task.content);
    const [description, setDescription] = useState(task.description || '');
    const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.split('T')[0] : '');
    const [priority, setPriority] = useState<string>(task.priority || '');
    const [tags, setTags] = useState<string[]>(task.tags || []);
    const [newTag, setNewTag] = useState('');

    const handleSave = async () => {
        await updateTask(task.id, {
            content,
            description,
            due_date: dueDate ? new Date(dueDate + 'T00:00:00').toISOString() : undefined,
            priority: priority || undefined,
            tags
        });
        setIsEditing(false);
    };

    const addTag = () => {
        if (newTag && !tags.includes(newTag)) {
            setTags([...tags, newTag]);
            setNewTag('');
        }
    };
    const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag));

    // For view mode formatting
    const createdAt = task.created_at ? new Date(task.created_at) : new Date();
    const formattedDate = format(createdAt, 'MMM d');
    const priorityInfo = PRIORITIES.find(p => p.value === task.priority);

    return (
        <div className="task-modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* 
              This box matches the dark theme GitHub/Linear issue style shown in the screenshot
            */}
            <div
                className="github-issue-container"
                onClick={e => e.stopPropagation()}
            >
                {isEditing ? (
                    /* ----- EDIT MODE ----- */
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-elevated)', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>Edit Task</h3>
                            <button className="icon-btn" onClick={() => setIsEditing(false)}><X size={16} /></button>
                        </div>

                        <input
                            className="task-modal-input"
                            style={{ fontSize: '16px', fontWeight: 600, padding: '8px 12px' }}
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder="Task title"
                        />

                        <textarea
                            className="task-modal-input"
                            style={{ minHeight: '160px', padding: '12px', resize: 'vertical' }}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Add your description using markdown..."
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Priority</label>
                                <select
                                    className="task-modal-input"
                                    value={priority}
                                    onChange={e => setPriority(e.target.value)}
                                >
                                    <option value="">No priority</option>
                                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Due Date</label>
                                <input
                                    type="date"
                                    className="task-modal-input"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Tags</label>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                {tags.map(tag => (
                                    <span key={tag} className="task-tag" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {tag} <X size={10} style={{ cursor: 'pointer' }} onClick={() => removeTag(tag)} />
                                    </span>
                                ))}
                            </div>
                            <input
                                className="task-modal-input"
                                placeholder="Add new tag & press Enter"
                                value={newTag}
                                onChange={e => setNewTag(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                            <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
                        </div>
                    </div>
                ) : (
                    /* ----- VIEW MODE ----- */
                    <>
                        <div className="github-issue-header">
                            <div className="github-issue-author-info">
                                <div className="github-issue-avatar">
                                    <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <span style={{ fontWeight: 600, color: '#c9d1d9' }}>{userName}</span>
                                <span style={{ color: '#8b949e' }}>opened on {formattedDate}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {/* Small badges for Tags/Priority */}
                                {priorityInfo && (
                                    <span style={{ fontSize: '12px', color: priorityInfo.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Flag size={12} /> {priorityInfo.label}
                                    </span>
                                )}
                                <button className="github-icon-btn" onClick={() => setIsEditing(true)}>
                                    <MoreHorizontal size={16} />
                                </button>
                                <button className="github-icon-btn" onClick={onClose}>
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="github-issue-body">
                            {/* Instead of just a title field, merge title and description into the content box */}
                            <h2 style={{ fontSize: '18px', margin: '0 0 16px 0', color: '#c9d1d9', fontWeight: 600 }}>{task.content}</h2>
                            <div className="markdown-body">
                                {task.description ? (
                                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatDescription(task.description)) }} />
                                ) : (
                                    <p style={{ color: '#8b949e', fontStyle: 'italic' }}>No description provided.</p>
                                )}
                            </div>
                        </div>

                        <div className="github-issue-footer">
                            {task.due_date && (
                                <button className="github-action-btn">
                                    <Calendar size={14} style={{ opacity: 0.6 }} />
                                    Due {format(new Date(task.due_date), 'MMM d, yyyy')}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// Simple pseudo-markdown parser to make things like **Bold** work, and preserve line breaks 
// just like the reference github image.
function formatDescription(text: string) {
    let html = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');
    return html;
}

export default TaskDetailModal;
