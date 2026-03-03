import React, { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { useNoteStore } from './store/noteStore';
import { supabase } from './lib/supabase';
import type { SidebarView } from './types';

import AuthPage from './components/auth/AuthPage';
import ActivityBar from './components/layout/ActivityBar';
import StatusBar from './components/layout/StatusBar';
import FileExplorer from './components/sidebar/FileExplorer';
import SearchPanel from './components/sidebar/SearchPanel';
import TagsPanel from './components/sidebar/TagsPanel';
import GraphView from './components/sidebar/GraphView';
import DrawView from './components/sidebar/DrawView';
import TrashPanel from './components/sidebar/TrashPanel';
import EditorContainer from './components/editor/EditorContainer';

const App: React.FC = () => {
  const { user, setUser, setLoading, loading } = useAuthStore();
  const { fetchNotes, fetchFolders, fetchTags, sidebarOpen } = useNoteStore();
  const [sidebarView, setSidebarView] = useState<SidebarView>('explorer');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleViewChange = (view: SidebarView) => {
    if (view === 'search') {
      setIsSearchOpen((prev) => !prev);
    } else {
      setSidebarView(view);
      setIsSearchOpen(false);
    }
  };

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email!, created_at: session.user.created_at });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email!, created_at: session.user.created_at });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD+K or CTRL+K for Search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch data when user logs in
  useEffect(() => {
    if (user) {
      fetchFolders(user.id);
      fetchNotes(user.id);
      fetchTags(user.id);
    }
  }, [user]);

  // Check for critical config
  const isConfigMissing = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (isConfigMissing) {
    return (
      <div className="loading-overlay" style={{ background: '#0d0f12' }}>
        <div className="auth-card" style={{ textAlign: 'center', border: '1px solid var(--danger)' }}>
          <h2 style={{ color: 'var(--danger)', marginBottom: '12px' }}>Configuration Error</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
            Critical environment variables are missing. Please check your <code>.env</code> file and ensure
            <code> VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> are set.
          </p>
          <button
            className="auth-btn"
            style={{ marginTop: '24px' }}
            onClick={() => window.location.reload()}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-logo">Basalt</div>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const renderSidebarContent = () => {
    switch (sidebarView) {
      case 'explorer': return <FileExplorer onSearchClick={() => setIsSearchOpen(true)} />;
      case 'tags': return <TagsPanel />;
      case 'graph': return null;
      case 'draw': return null;
      case 'trash': return null;
      default: return <FileExplorer onSearchClick={() => setIsSearchOpen(true)} />;
    }
  };

  return (
    <div className="app-layout">
      <ActivityBar currentView={isSearchOpen ? 'search' : sidebarView} onViewChange={handleViewChange} />

      {/* Sidebar */}
      {(sidebarView !== 'trash' && sidebarView !== 'graph' && sidebarView !== 'draw') && (
        <div className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
          {renderSidebarContent()}
        </div>
      )}

      {/* Main editor area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {sidebarView === 'trash' ? (
          <TrashPanel />
        ) : sidebarView === 'graph' ? (
          <GraphView />
        ) : sidebarView === 'draw' ? (
          <DrawView />
        ) : (
          <EditorContainer />
        )}
        <StatusBar />
      </div>

      {/* Search Overlay */}
      {isSearchOpen && (
        <SearchPanel
          onResultClick={() => setIsSearchOpen(false)}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
