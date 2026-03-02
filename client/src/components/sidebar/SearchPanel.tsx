import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import axios from 'axios';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useNoteStore } from '../../store/noteStore';
import type { SearchResult } from '../../types';
import { formatDistanceToNow } from 'date-fns';


const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
};

interface SearchPanelProps {
    onResultClick?: () => void;
    onClose: () => void;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ onResultClick, onClose }) => {
    const { user } = useAuthStore();
    const { setActiveNote, notes } = useNoteStore();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const debouncedQuery = useDebounce(query, 300);

    useEffect(() => {
        if (!debouncedQuery.trim() || !user) {
            setResults([]);
            return;
        }

        const controller = new AbortController();
        setLoading(true);

        api.get('/search', {
            params: { q: debouncedQuery, user_id: user.id },
            signal: controller.signal
        })
            .then(({ data }) => setResults(data))
            .catch((err) => {
                if (err.name === 'CanceledError' || axios.isCancel(err)) {
                    return; // Ignore cancellation
                }
                console.error(err);
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [debouncedQuery, user]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const highlightQuery = (text: string) => {
        if (!query) return text;
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return parts.map((part, i) =>
            part.toLowerCase() === query.toLowerCase()
                ? <mark key={i} className="search-highlight">{part}</mark>
                : part
        );
    };

    const handleResultClick = (result: SearchResult) => {
        const note = notes.find((n) => n.id === result.id);
        if (note) {
            setActiveNote(note);
            onResultClick?.();
        }
    };

    return (
        <div
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
                zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                paddingTop: '10vh'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '100%', maxWidth: 640, backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 12, border: '1px solid var(--border-strong)',
                    boxShadow: 'var(--shadow-xl)', display: 'flex', flexDirection: 'column',
                    maxHeight: '80vh', overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ position: 'relative', width: '100%' }}>
                        <Search style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
                        <input
                            style={{
                                width: '100%',
                                height: 54,
                                padding: '0 20px 0 48px',
                                fontSize: 16,
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--border-default)',
                                borderRadius: 12,
                                color: 'var(--text-primary)',
                                outline: 'none',
                                transition: 'all 0.2s',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                            placeholder="Search for titles, excerpts, or content..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-muted)'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                            autoFocus
                        />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, textAlign: 'right', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Try <kbd style={{ fontFamily: 'inherit', padding: '2px 4px', background: 'var(--bg-primary)', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>{navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} K</kbd> to open anytime</span>
                        <span>Press <kbd style={{ fontFamily: 'inherit', padding: '2px 4px', background: 'var(--bg-primary)', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>ESC</kbd> to close</span>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loading && (
                        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                            <div className="loading-spinner" style={{ width: 24, height: 24, margin: '0 auto 16px', borderTopColor: 'var(--accent)' }} />
                            Searching...
                        </div>
                    )}
                    {!loading && results.length === 0 && debouncedQuery && (
                        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                            No results found for "<strong>{debouncedQuery}</strong>"
                        </div>
                    )}
                    {results.map((result) => (
                        <div
                            key={result.id}
                            style={{
                                padding: '16px 20px',
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 8,
                                marginBottom: 12,
                                cursor: 'pointer',
                                transition: 'transform 0.1s, border-color 0.1s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-muted)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                            onClick={() => handleResultClick(result)}
                        >
                            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                                {highlightQuery(result.title)}
                            </div>
                            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {highlightQuery(result.excerpt)}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                Updated {formatDistanceToNow(new Date(result.updated_at), { addSuffix: true })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SearchPanel;
