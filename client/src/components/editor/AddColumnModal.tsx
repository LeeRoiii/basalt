import React, { useState, useEffect, useRef } from 'react';

const COLUMN_COLORS = [
    '#3ECF8E', '#4ade80', '#facc15', '#fb923c', '#f87171',
    '#38bdf8', '#e879f9', '#34d399', '#f472b6', '#94a3b8',
];

const COLOR_NAMES: Record<string, string> = {
    '#3ECF8E': 'Green', '#4ade80': 'Lime', '#facc15': 'Yellow', '#fb923c': 'Orange', '#f87171': 'Red',
    '#38bdf8': 'Blue', '#e879f9': 'Pink', '#34d399': 'Teal', '#f472b6': 'Rose', '#94a3b8': 'Gray',
};

interface AddColumnModalProps {
    onClose: () => void;
    onAdd: (title: string, color?: string) => void;
}

const AddColumnModal: React.FC<AddColumnModalProps> = ({ onClose, onAdd }) => {
    const [title, setTitle] = useState('');
    const [color, setColor] = useState(COLUMN_COLORS[0]);
    const [titleError, setTitleError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim()) {
            setTitleError('');
            onAdd(title.trim(), color);
            onClose();
        } else {
            setTitleError('Column title cannot be empty.');
            inputRef.current?.focus();
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: '360px' }} onClick={e => e.stopPropagation()}>
                <h3 className="modal-title">Add New Column</h3>
                <form onSubmit={handleSubmit}>
                    <input
                        ref={inputRef}
                        className="modal-input"
                        placeholder="Column title..."
                        value={title}
                        onChange={e => { setTitle(e.target.value); setTitleError(''); }}
                        required
                        aria-invalid={!!titleError}
                        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
                    />
                    {titleError && (
                        <div style={{ color: '#f87171', fontSize: '12px', marginTop: '6px' }}>{titleError}</div>
                    )}

                    {/* Color picker */}
                    <div style={{ marginTop: '14px' }}>
                        <div style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: '10px',
                        }}>
                            Column Color
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {COLUMN_COLORS.map(c => (
                                <div
                                    key={c}
                                    onClick={() => setColor(c)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setColor(c); } }}
                                    tabIndex={0}
                                    role="button"
                                    aria-label={`Select ${COLOR_NAMES[c] || c} color`}
                                    style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        background: c,
                                        cursor: 'pointer',
                                        border: color === c ? '3px solid white' : '3px solid transparent',
                                        boxShadow: color === c ? `0 0 0 2px ${c}` : 'none',
                                        transition: 'transform 0.1s, box-shadow 0.1s',
                                        transform: color === c ? 'scale(1.15)' : 'scale(1)',
                                        outline: 'none',
                                    }}
                                />
                            ))}
                        </div>
                        {/* Preview */}
                        <div style={{
                            marginTop: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 10px',
                            background: 'var(--bg-secondary)',
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: 'var(--text-secondary)',
                        }}>
                            <div style={{
                                width: '12px', height: '12px',
                                borderRadius: '50%',
                                background: color,
                            }} />
                            <span style={{ color, fontWeight: 600 }}>{title || 'Column Name'}</span>
                        </div>
                    </div>

                    <div className="modal-actions" style={{ marginTop: '16px' }}>
                        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                            Add Column
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddColumnModal;
