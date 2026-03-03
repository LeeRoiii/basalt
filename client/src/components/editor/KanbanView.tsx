import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, Calendar, AlignLeft } from 'lucide-react';
import { useNoteStore } from '../../store/noteStore';
import type { Note, KanbanColumn, KanbanTask } from '../../types';
import TaskDetailModal from './TaskDetailModal';
import { format, isPast, isToday } from 'date-fns';

interface KanbanViewProps {
    note: Note;
}

const KanbanView: React.FC<KanbanViewProps> = ({ note }) => {
    const {
        addTask, updateTask, deleteTask,
        addColumn, updateColumn, deleteColumn
    } = useNoteStore();

    const [renamingColumnId, setRenamingColumnId] = useState<string | null>(null);
    const [columnRenameValue, setColumnRenameValue] = useState('');
    const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);

    const columns = note.columns || [];

    const handleAddColumn = () => {
        addColumn(note.id, 'New Column', columns.length);
    };

    const handleRenameColumn = (columnId: string, title: string) => {
        updateColumn(columnId, { title });
        setRenamingColumnId(null);
    };

    const handleDeleteColumn = (columnId: string) => {
        if (confirm('Delete this column and all its tasks?')) {
            deleteColumn(columnId);
        }
    };

    const handleAddTask = (columnId: string) => {
        const col = columns.find(c => c.id === columnId);
        const order = col?.tasks?.length || 0;
        addTask(columnId, 'New task', order);
    };

    const handleDeleteTask = (e: React.MouseEvent, taskId: string) => {
        e.stopPropagation();
        deleteTask(taskId);
    };

    const onDragStart = (e: React.DragEvent, taskId: string, sourceColumnId: string) => {
        e.dataTransfer.setData('taskId', taskId);
        e.dataTransfer.setData('sourceColumnId', sourceColumnId);
    };

    const onDrop = (e: React.DragEvent, targetColumnId: string) => {
        const taskId = e.dataTransfer.getData('taskId');
        const sourceColumnId = e.dataTransfer.getData('sourceColumnId');

        if (sourceColumnId === targetColumnId) return;

        const targetCol = columns.find(c => c.id === targetColumnId);
        const order = targetCol?.tasks?.length || 0;

        updateTask(taskId, { column_id: targetColumnId, order });
    };

    const handleTaskChange = (taskId: string, content: string) => {
        updateTask(taskId, { content });
    };

    const isOverdue = (dateStr: string) => {
        const date = new Date(dateStr);
        return isPast(date) && !isToday(date);
    };

    return (
        <div className="kanban-view">
            <div className="kanban-board">
                {columns.map((column: KanbanColumn) => (
                    <div
                        key={column.id}
                        className="kanban-column"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => onDrop(e, column.id)}
                    >
                        <div className="kanban-column-header">
                            {renamingColumnId === column.id ? (
                                <input
                                    className="kanban-column-title-input"
                                    autoFocus
                                    value={columnRenameValue}
                                    onChange={(e) => setColumnRenameValue(e.target.value)}
                                    onBlur={() => handleRenameColumn(column.id, columnRenameValue)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleRenameColumn(column.id, columnRenameValue);
                                        if (e.key === 'Escape') setRenamingColumnId(null);
                                    }}
                                />
                            ) : (
                                <h3
                                    className="kanban-column-title"
                                    onClick={() => {
                                        setRenamingColumnId(column.id);
                                        setColumnRenameValue(column.title);
                                    }}
                                >
                                    {column.title}
                                </h3>
                            )}
                            <div className="kanban-column-actions">
                                <button className="icon-btn" onClick={() => handleAddTask(column.id)}>
                                    <Plus size={14} />
                                </button>
                                <button
                                    className="icon-btn danger"
                                    onClick={() => handleDeleteColumn(column.id)}
                                    title="Delete Column"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="kanban-cards">
                            {(column.tasks || []).map((task: KanbanTask) => (
                                <div
                                    key={task.id}
                                    className="kanban-card"
                                    draggable
                                    onDragStart={(e) => onDragStart(e, task.id, column.id)}
                                    onClick={() => setSelectedTask(task)}
                                >
                                    <div className="kanban-card-drag">
                                        <GripVertical size={14} />
                                    </div>
                                    <div className="kanban-card-content">
                                        {task.tags && task.tags.length > 0 && (
                                            <div className="task-tags">
                                                {task.tags.map(tag => (
                                                    <span key={tag} className="task-tag">{tag}</span>
                                                ))}
                                            </div>
                                        )}
                                        <input
                                            className="kanban-card-title-input"
                                            value={task.content}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                handleTaskChange(task.id, e.target.value);
                                            }}
                                            onClick={e => e.stopPropagation()}
                                        />
                                        {(task.due_date || task.description) && (
                                            <div className="task-card-footer">
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
                                    <button
                                        className="kanban-card-delete"
                                        onClick={(e) => handleDeleteTask(e, task.id)}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <button className="kanban-add-column" onClick={handleAddColumn}>
                    <Plus size={20} />
                    <span>Add Column</span>
                </button>
            </div>

            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                />
            )}
        </div>
    );
};

export default KanbanView;
