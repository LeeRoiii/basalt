import React from 'react';
import { FileText, Hash } from 'lucide-react';
import { useNoteStore } from '../../store/noteStore';
import { useAuthStore } from '../../store/authStore';

const StatusBar: React.FC = () => {
    const { activeNote, notes, folders, tags } = useNoteStore();
    const { user } = useAuthStore();

    return (
        <div className="status-bar">
            <div className="status-bar-left">
                <span className="status-item">🪨 Basalt</span>
                <span className="status-item" title="Notes count">
                    <FileText size={11} />
                    {notes.length} notes
                </span>
                <span className="status-item">
                    {folders.length} folders
                </span>
                <span className="status-item">
                    <Hash size={11} />
                    {tags.length} tags
                </span>
            </div>
            <div className="status-bar-center">
                {activeNote && (
                    <span>{activeNote.title || 'Untitled'}</span>
                )}
            </div>
            <div className="status-bar-right">
                {activeNote && (
                    <span className="status-item">
                        {activeNote.content?.trim().split(/\s+/).filter(Boolean).length || 0} words
                    </span>
                )}
                <span className="status-item">
                    {user?.email}
                </span>
            </div>
        </div>
    );
};

export default StatusBar;
