import React, { useState, useRef } from 'react';
import { Trash2, GripVertical, Calendar, AlignLeft, Flag, Palette, MoreHorizontal, Eye } from 'lucide-react';
import { useNoteStore } from '../../store/noteStore';
import { useAuthStore } from '../../store/authStore';
import type { Note, KanbanColumn, KanbanTask } from '../../types';
import TaskDetailModal from './TaskDetailModal';
import ConfirmationModal from '../common/ConfirmationModal';
import { format, isPast, isToday } from 'date-fns';

interface KanbanViewProps {
    note: Note;
}

const PRIORITIES = [
    { value: 'low', label: 'Low', color: '#4ade80' },
    { value: 'medium', label: 'Medium', color: '#facc15' },
    { value: 'high', label: 'High', color: '#fb923c' },
    { value: 'urgent', label: 'Urgent', color: '#f87171' },
];

const COLUMN_COLORS = [
    '#3ECF8E', '#4ade80', '#facc15', '#fb923c', '#f87171',
    '#38bdf8', '#e879f9', '#34d399', '#f472b6', '#94a3b8',
];

const DEFAULT_COLOR = '#3ECF8E';

const getPriority = (value?: string) => PRIORITIES.find(p => p.value === value);

const KanbanView: React.FC<KanbanViewProps> = ({ note }) => {
    const { updateColumn, deleteColumn, updateTask, deleteTask } = useNoteStore();
    const { user } = useAuthStore();

    // User display details
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
    const avatarUrl = user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${userName}&backgroundColor=1f2937`;

    const [renamingColumnId, setRenamingColumnId] = useState<string | null>(null);
    const [columnRenameValue, setColumnRenameValue] = useState('');
    const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
    const [columnToDelete, setColumnToDelete] = useState<string | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
    const [colorPickerColumnId, setColorPickerColumnId] = useState<string | null>(null);
    const [menuColumnId, setMenuColumnId] = useState<string | null>(null);
    const isCancelRef = useRef(false);

    const columns = note.columns || [];

    const handleRenameColumn = (columnId: string, title: string) => {
        updateColumn(columnId, { title });
        setRenamingColumnId(null);
    };

    const handleDeleteColumn = (columnId: string) => {
        setMenuColumnId(null);
        setColumnToDelete(columnId);
    };

    const confirmDeleteColumn = () => {
        if (columnToDelete) {
            deleteColumn(columnToDelete);
            setColumnToDelete(null);
        }
    };

    const handleDeleteTask = (e: React.MouseEvent, taskId: string) => {
        e.stopPropagation();
        setTaskToDelete(taskId);
    };

    const confirmDeleteTask = () => {
        if (taskToDelete) {
            deleteTask(taskToDelete);
            setTaskToDelete(null);
        }
    };

    const handleSetColumnColor = (columnId: string, color: string) => {
        updateColumn(columnId, { color });
        setColorPickerColumnId(null);
    };

    const onDragStart = (e: React.DragEvent, taskId: string, sourceColumnId: string) => {
        e.dataTransfer.setData('taskId', taskId);
        e.dataTransfer.setData('sourceColumnId', sourceColumnId);
    };

    const onDrop = (e: React.DragEvent, targetColumnId: string) => {
        const taskId = e.dataTransfer.getData('taskId');
        const sourceColumnId = e.dataTransfer.getData('sourceColumnId');
        if (!taskId || sourceColumnId === targetColumnId) return;
        const targetCol = columns.find(c => c.id === targetColumnId);
        if (!targetCol) return;
        const order = targetCol?.tasks?.length || 0;
        updateTask(taskId, { column_id: targetColumnId, order });
    };

    const isOverdue = (dateStr: string) => {
        const date = new Date(dateStr);
        return isPast(date) && !isToday(date);
    };

    // Close menus when clicking outside
    const handleBoardClick = () => {
        setMenuColumnId(null);
        setColorPickerColumnId(null);
    };

    return (
        <div className="kanban-view" onClick={handleBoardClick}>
            <div className="kanban-board">
                {columns.map((column: KanbanColumn) => {
                    const colColor = column.color || DEFAULT_COLOR;
                    const taskCount = column.tasks?.length || 0;

                    return (
                        <div
                            key={column.id}
                            className="kanban-column"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => onDrop(e, column.id)}
                        >
                            {/* Column Header */}
                            <div className="kanban-column-header">
                                <div className="kanban-column-header-left">
                                    {/* Colored circle */}
                                    <div
                                        className="kanban-column-dot"
                                        style={{ background: colColor, borderColor: colColor }}
                                    />
                                    {/* Title */}
                                    {renamingColumnId === column.id ? (
                                        <input
                                            className="kanban-column-title-input"
                                            autoFocus
                                            value={columnRenameValue}
                                            onChange={(e) => setColumnRenameValue(e.target.value)}
                                            onBlur={() => {
                                                if (isCancelRef.current) {
                                                    isCancelRef.current = false;
                                                    return;
                                                }
                                                handleRenameColumn(column.id, columnRenameValue);
                                            }}
                                            onClick={e => e.stopPropagation()}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleRenameColumn(column.id, columnRenameValue);
                                                if (e.key === 'Escape') {
                                                    isCancelRef.current = true;
                                                    setRenamingColumnId(null);
                                                }
                                            }}
                                        />
                                    ) : (
                                        <h3
                                            className="kanban-column-title"
                                            onDoubleClick={() => {
                                                setRenamingColumnId(column.id);
                                                setColumnRenameValue(column.title);
                                            }}
                                        >
                                            {column.title}
                                        </h3>
                                    )}
                                    {/* Task count badge */}
                                    <span className="kanban-column-count">{taskCount}</span>
                                </div>

                                {/* Actions: color picker + menu */}
                                <div className="kanban-column-actions" onClick={e => e.stopPropagation()}>
                                    {/* Color picker */}
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            className="icon-btn"
                                            title="Column color"
                                            onClick={() => {
                                                setColorPickerColumnId(colorPickerColumnId === column.id ? null : column.id);
                                                setMenuColumnId(null);
                                            }}
                                        >
                                            <Palette size={13} />
                                        </button>
                                        {colorPickerColumnId === column.id && (
                                            <div className="color-swatch-picker">
                                                {COLUMN_COLORS.map(c => (
                                                    <div
                                                        key={c}
                                                        onClick={() => handleSetColumnColor(column.id, c)}
                                                        style={{
                                                            width: 20, height: 20,
                                                            borderRadius: '50%',
                                                            background: c,
                                                            cursor: 'pointer',
                                                            border: column.color === c ? '2px solid white' : '2px solid transparent',
                                                            transition: 'transform 0.1s',
                                                        }}
                                                        onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.25)')}
                                                        onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Three-dot menu */}
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            className="icon-btn"
                                            title="More options"
                                            onClick={() => {
                                                setMenuColumnId(menuColumnId === column.id ? null : column.id);
                                                setColorPickerColumnId(null);
                                            }}
                                        >
                                            <MoreHorizontal size={14} />
                                        </button>
                                        {menuColumnId === column.id && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 'calc(100% + 4px)',
                                                right: 0,
                                                background: 'var(--bg-elevated)',
                                                border: '1px solid var(--border-subtle)',
                                                borderRadius: '8px',
                                                padding: '4px',
                                                zIndex: 100,
                                                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                                                minWidth: '140px',
                                            }}>
                                                <button
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: 8,
                                                        width: '100%', padding: '7px 10px', background: 'none',
                                                        border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                                                        borderRadius: '6px', fontSize: '13px', textAlign: 'left',
                                                    }}
                                                    onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                                                    onMouseOut={e => (e.currentTarget.style.background = 'none')}
                                                    onClick={() => {
                                                        setMenuColumnId(null);
                                                        setRenamingColumnId(column.id);
                                                        setColumnRenameValue(column.title);
                                                    }}
                                                >
                                                    Rename
                                                </button>
                                                <button
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: 8,
                                                        width: '100%', padding: '7px 10px', background: 'none',
                                                        border: 'none', color: 'var(--danger)', cursor: 'pointer',
                                                        borderRadius: '6px', fontSize: '13px', textAlign: 'left',
                                                    }}
                                                    onMouseOver={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
                                                    onMouseOut={e => (e.currentTarget.style.background = 'none')}
                                                    onClick={() => handleDeleteColumn(column.id)}
                                                >
                                                    Delete Column
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Cards */}
                            <div className="kanban-cards">
                                {(column.tasks || []).map((task: KanbanTask) => {
                                    const prio = getPriority(task.priority);
                                    return (
                                        <div
                                            key={task.id}
                                            className="kanban-card"
                                            draggable
                                            onDragStart={(e) => onDragStart(e, task.id, column.id)}
                                        >
                                            {/* Priority left bar */}
                                            {prio && (
                                                <div style={{
                                                    position: 'absolute', left: 0, top: 0, bottom: 0,
                                                    width: '3px', background: prio.color,
                                                }} />
                                            )}

                                            <div className="kanban-card-drag" draggable={false}>
                                                <GripVertical size={13} />
                                            </div>

                                            <div className="kanban-card-content">
                                                {/* Tags */}
                                                {task.tags && task.tags.length > 0 && (
                                                    <div className="task-tags">
                                                        {task.tags.map(tag => (
                                                            <span key={tag} className="task-tag">{tag}</span>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Title */}
                                                <span className="kanban-card-title">{task.content}</span>

                                                {/* Footer */}
                                                {(task.due_date || task.description || prio) && (
                                                    <div className="task-card-footer">
                                                        {prio && (
                                                            <div style={{
                                                                display: 'flex', alignItems: 'center', gap: 3,
                                                                fontSize: '10px', color: prio.color, fontWeight: 600,
                                                            }}>
                                                                <Flag size={9} />
                                                                {prio.label}
                                                            </div>
                                                        )}
                                                        {task.due_date && (
                                                            <div className={`task-date ${isOverdue(task.due_date) ? 'overdue' : ''}`}>
                                                                <Calendar size={10} />
                                                                {format(new Date(task.due_date), 'MMM d')}
                                                            </div>
                                                        )}
                                                        {task.description && (
                                                            <div className="task-description-indicator" title="Has description">
                                                                <AlignLeft size={10} />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions Container */}
                                            <div className="kanban-card-actions">
                                                <div style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    overflow: 'hidden',
                                                    marginBottom: '4px',
                                                    flexShrink: 0
                                                }}>
                                                    <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                                <button
                                                    className="kanban-card-action-btn view-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedTask(task);
                                                    }}
                                                    title="View Detail"
                                                >
                                                    <Eye size={13} />
                                                </button>
                                                <button
                                                    className="kanban-card-action-btn delete-btn"
                                                    onClick={(e) => handleDeleteTask(e, task.id)}
                                                    title="Delete Task"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                />
            )}

            <ConfirmationModal
                isOpen={!!columnToDelete}
                title="Delete Column"
                message="Are you sure you want to delete this column and all its tasks? This action cannot be undone."
                confirmText="Delete Column"
                isDanger
                onConfirm={confirmDeleteColumn}
                onCancel={() => setColumnToDelete(null)}
            />

            <ConfirmationModal
                isOpen={!!taskToDelete}
                title="Delete Task"
                message="Are you sure you want to delete this task? This action cannot be undone."
                confirmText="Delete Task"
                isDanger
                onConfirm={confirmDeleteTask}
                onCancel={() => setTaskToDelete(null)}
            />
        </div>
    );
};

export default KanbanView;
