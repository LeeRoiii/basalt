import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDanger?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    isDanger = false
}) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000
        }}>
            <div className="auth-card" style={{ maxWidth: 400, width: '100%', margin: '0 24px', padding: 32 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        backgroundColor: isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(124, 111, 239, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 16
                    }}>
                        <AlertTriangle size={24} color={isDanger ? '#ef4444' : 'var(--accent)'} />
                    </div>

                    <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, marginTop: 0 }}>
                        {title}
                    </h2>

                    <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5, marginTop: 0 }}>
                        {message}
                    </p>

                    <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                        <button
                            style={{
                                flex: 1, height: 40, borderRadius: 6,
                                backgroundColor: 'transparent', border: '1px solid var(--border-strong)',
                                color: 'var(--text-primary)', fontWeight: 500, cursor: 'pointer', outline: 'none'
                            }}
                            onClick={onCancel}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                            {cancelText}
                        </button>
                        <button
                            className="auth-btn"
                            style={{
                                flex: 1, marginTop: 0, ...(isDanger ? {
                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)'
                                } : {})
                            }}
                            onClick={onConfirm}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
