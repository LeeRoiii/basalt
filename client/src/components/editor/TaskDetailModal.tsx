import React, { useState } from 'react';
import { X, Calendar, Tag as TagIcon, AlignLeft } from 'lucide-react';
import type { KanbanTask } from '../../types';
import { useNoteStore } from '../../store/noteStore';

interface TaskDetailModalProps {
    task: KanbanTask;
    onClose: () => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose }) => {
    const { updateTask } = useNoteStore();
    const [content, setContent] = useState(task.content);
    const [description, setDescription] = useState(task.description || '');
    const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.split('T')[0] : '');
    const [tags, setTags] = useState<string[]>(task.tags || []);
    const [newTag, setNewTag] = useState('');

    const handleSave = async () => {
        await updateTask(task.id, {
            content,
            description,
            due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
            tags
        });
        onClose();
    };

    const addTag = () => {
        if (newTag && !tags.includes(newTag)) {
            setTags([...tags, newTag]);
            setNewTag('');
        }
    };

    const removeTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag));
    };

    return (
        <div className="task-modal-overlay" onClick={onClose}>
            <div className="task-modal" onClick={e => e.stopPropagation()}>
                <div className="task-modal-header">
                    <h3 style={{ margin: 0, fontSize: 16 }}>Edit Task</h3>
                    <button className="icon-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="task-modal-content">
                    <div className="modal-section">
                        <label className="modal-section-label">Title</label>
                        <input
                            className="task-modal-input"
                            value={content}
                            onChange={e => setContent(e.target.value)}
                        />
                    </div>

                    <div className="modal-section">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <AlignLeft size={14} className="modal-section-label" />
                            <label className="modal-section-label" style={{ margin: 0 }}>Description</label>
                        </div>
                        <textarea
                            className="task-modal-input task-modal-textarea"
                            placeholder="Add a more detailed description..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <div className="modal-section">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <Calendar size={14} className="modal-section-label" />
                                <label className="modal-section-label" style={{ margin: 0 }}>Due Date</label>
                            </div>
                            <input
                                type="date"
                                className="task-modal-input"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                            />
                        </div>

                        <div className="modal-section">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <TagIcon size={14} className="modal-section-label" />
                                <label className="modal-section-label" style={{ margin: 0 }}>Tags</label>
                            </div>
                            <div className="tag-editor">
                                <div className="tag-list">
                                    {tags.map(tag => (
                                        <div key={tag} className="task-tag" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px' }}>
                                            {tag}
                                            <X size={10} style={{ cursor: 'pointer' }} onClick={() => removeTag(tag)} />
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        className="task-modal-input"
                                        style={{ height: 28, fontSize: 12, flex: 1 }}
                                        placeholder="Add tag..."
                                        value={newTag}
                                        onChange={e => setNewTag(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addTag()}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="task-modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
                </div>
            </div>
        </div>
    );
};

export default TaskDetailModal;
