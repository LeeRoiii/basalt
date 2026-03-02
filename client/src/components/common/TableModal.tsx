import React, { useState, useEffect, useRef } from 'react';
import { Table } from 'lucide-react';

interface TableModalProps {
    isOpen: boolean;
    onConfirm: (cols: number) => void;
    onCancel: () => void;
}

const TableModal: React.FC<TableModalProps> = ({ isOpen, onConfirm, onCancel }) => {
    const [cols, setCols] = useState(2);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setCols(2);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(cols);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            zIndex: 2000
        }}>
            <div className="auth-card" style={{ maxWidth: 360, width: '100%', padding: 32 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        backgroundColor: 'rgba(124, 111, 239, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 16
                    }}>
                        <Table size={24} color="var(--accent)" />
                    </div>

                    <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, marginTop: 0, textAlign: 'center' }}>
                        Create Table
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, textAlign: 'center', marginTop: 0 }}>
                        Enter the number of columns for your new table.
                    </p>

                    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                        <div className="form-group" style={{ marginBottom: 24 }}>
                            <label className="form-label">
                                Column Count
                            </label>
                            <input
                                ref={inputRef}
                                type="number"
                                className="form-input"
                                value={cols}
                                onChange={(e) => setCols(parseInt(e.target.value, 10))}
                                min="1"
                                max="20"
                                required
                                style={{ width: '100%', height: 44 }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                type="button"
                                style={{
                                    flex: 1, height: 42, borderRadius: 8,
                                    backgroundColor: 'transparent', border: '1px solid var(--border-subtle)',
                                    color: 'var(--text-primary)', fontWeight: 500, cursor: 'pointer'
                                }}
                                onClick={onCancel}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="auth-btn"
                                style={{ flex: 1, marginTop: 0, height: 42 }}
                            >
                                Create
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TableModal;
