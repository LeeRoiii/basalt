import React, { useState } from 'react';
import { Mountain, Files, Search, Tag, GitGraph, LogOut, AlertTriangle, Trash2, PenTool, Layout } from 'lucide-react';
import { useNoteStore } from '../../store/noteStore';
import { useAuthStore } from '../../store/authStore';
import type { SidebarView } from '../../types';

interface ActivityBarProps {
    currentView: SidebarView;
    onViewChange: (view: SidebarView) => void;
}

const VIEWS: { id: SidebarView; icon: React.ReactNode; label: string }[] = [
    { id: 'explorer', icon: <Files size={18} />, label: 'Explorer' },
    { id: 'kanban', icon: <Layout size={18} />, label: 'Projects' },
    { id: 'search', icon: <Search size={18} />, label: 'Search' },
    { id: 'tags', icon: <Tag size={18} />, label: 'Tags' },
    { id: 'graph', icon: <GitGraph size={18} />, label: 'Graph' },
    { id: 'draw', icon: <PenTool size={18} />, label: 'Draw whiteboard' },
    { id: 'trash', icon: <Trash2 size={18} />, label: 'Trash' },
];

const ActivityBar: React.FC<ActivityBarProps> = ({ currentView, onViewChange }) => {
    const { signOut, user } = useAuthStore();
    const { sidebarOpen, setSidebarOpen } = useNoteStore();
    const [showConfirm, setShowConfirm] = useState(false);

    const handleViewClick = (view: SidebarView) => {
        if (currentView === view && sidebarOpen) {
            setSidebarOpen(false);
        } else {
            onViewChange(view);
            setSidebarOpen(true);
        }
    };

    return (
        <>
            <div className="activity-bar">
                <div className="activity-logo" title="Basalt">
                    <Mountain size={22} color="var(--accent)" />
                </div>

                {VIEWS.map((view) => (
                    <button
                        key={view.id}
                        className={`activity-btn ${currentView === view.id && sidebarOpen ? 'active' : ''}`}
                        onClick={() => handleViewClick(view.id)}
                        data-tooltip={view.label}
                        title={view.label}
                    >
                        {view.icon}
                    </button>
                ))}

                <div className="activity-spacer" />

                <div className="activity-divider" style={{ width: '20px', height: '1px', background: 'var(--border-subtle)', margin: '8px 0' }} />

                <div
                    className="activity-user-profile"
                    title={user?.email}
                    style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent), #9333ea)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: 'white',
                        marginBottom: '8px',
                        cursor: 'default',
                        boxShadow: '0 4px 12px rgba(124, 111, 239, 0.2)'
                    }}
                >
                    {user?.email?.[0].toUpperCase() || 'U'}
                </div>

                <button
                    className="activity-btn"
                    title="Sign Out"
                    data-tooltip="Sign Out"
                    onClick={() => setShowConfirm(true)}
                    style={{ marginBottom: '12px' }}
                >
                    <LogOut size={18} />
                </button>
            </div>

            {/* Logout confirmation modal */}
            {showConfirm && (
                <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
                    <div className="modal" style={{ maxWidth: '380px' }} onClick={(e) => e.stopPropagation()}>

                        {/* Icon + title */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
                                background: 'rgba(248, 113, 113, 0.12)', border: '1px solid rgba(248, 113, 113, 0.25)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                                <AlertTriangle size={20} color="var(--danger)" />
                            </div>
                            <div>
                                <h3 className="modal-title" style={{ marginBottom: '2px' }}>Sign out?</h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user?.email}</p>
                            </div>
                        </div>

                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.6' }}>
                            Any unsaved changes will be lost. Are you sure you want to sign out of Basalt?
                        </p>

                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowConfirm(false)}
                                autoFocus
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={() => { signOut(); setShowConfirm(false); }}
                            >
                                <LogOut size={14} />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ActivityBar;
