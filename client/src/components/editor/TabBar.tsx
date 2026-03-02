import React from 'react';
import { useNoteStore } from '../../store/noteStore';
import { X, FileText } from 'lucide-react';

const TabBar: React.FC = () => {
    const { openNotes, activeNote, setActiveNote, closeNote } = useNoteStore();

    if (openNotes.length === 0) return null;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'transparent',
            overflowX: 'auto',
            height: '100%',
            flex: 1
        }} className="tab-container">
            {openNotes.map((note) => {
                const isActive = activeNote?.id === note.id;
                return (
                    <div
                        key={note.id}
                        onClick={() => setActiveNote(note)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            height: '100%',
                            padding: '0 16px',
                            backgroundColor: isActive ? 'var(--bg-primary)' : 'transparent',
                            borderRight: '1px solid var(--border-subtle)',
                            minWidth: '120px',
                            maxWidth: '200px',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'background-color 0.2s',
                            position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                            if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                        }}
                        onMouseLeave={(e) => {
                            if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        {isActive && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '2px',
                                backgroundColor: 'var(--accent)'
                            }} />
                        )}
                        <FileText size={14} color={isActive ? 'var(--accent)' : 'var(--text-muted)'} style={{ marginRight: 8, flexShrink: 0 }} />
                        <span style={{
                            flex: 1,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: '13px',
                            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: isActive ? 500 : 400
                        }}>
                            {note.title || 'Untitled'}
                        </span>
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                closeNote(note.id);
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '20px',
                                height: '20px',
                                borderRadius: '4px',
                                marginLeft: '8px',
                                color: 'var(--text-muted)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.color = 'var(--text-primary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = 'var(--text-muted)';
                            }}
                        >
                            <X size={12} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default TabBar;
