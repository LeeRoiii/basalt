import React from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useSnackbarStore } from '../../store/snackbarStore';

const Snackbar: React.FC = () => {
    const { message, type, isOpen, hideSnackbar } = useSnackbarStore();

    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle className="snackbar-icon success" size={18} />;
            case 'error': return <AlertCircle className="snackbar-icon error" size={18} />;
            case 'info': return <Info className="snackbar-icon info" size={18} />;
            default: return <Info className="snackbar-icon info" size={18} />;
        }
    };

    return (
        <div className={`snackbar-container ${type} ${isOpen ? 'show' : ''}`}>
            <div className="snackbar-content">
                {getIcon()}
                <span className="snackbar-message">{message}</span>
                <button className="snackbar-close" onClick={hideSnackbar}>
                    <X size={16} />
                </button>
            </div>
            <div className="snackbar-progress" />
        </div>
    );
};

export default Snackbar;
