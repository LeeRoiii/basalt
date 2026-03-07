import React, { useEffect, useState } from 'react';
import { Download, X, RefreshCw, Smartphone } from 'lucide-react';
import { applyServiceWorkerUpdate, isRunningAsPWA } from '../../lib/pwaUtils';

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showInstallBanner, setShowInstallBanner] = useState(false);
    const [showUpdateBanner, setShowUpdateBanner] = useState(false);

    useEffect(() => {
        // Don't show if already running as PWA
        if (isRunningAsPWA()) {
            return;
        }

        // Listen for the install prompt
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);

            // Only show the banner if user hasn't dismissed it recently
            const dismissed = localStorage.getItem('pwa-install-dismissed');
            if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) {
                // Show after a small delay so it doesn't feel intrusive
                setTimeout(() => setShowInstallBanner(true), 3000);
            }
        };

        // Listen for successful install
        const handleInstalled = () => {
            setShowInstallBanner(false);
            setDeferredPrompt(null);
        };

        // Listen for SW update available
        const handleUpdateAvailable = () => {
            setShowUpdateBanner(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        window.addEventListener('appinstalled', handleInstalled);
        window.addEventListener('sw-update-available', handleUpdateAvailable);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            window.removeEventListener('appinstalled', handleInstalled);
            window.removeEventListener('sw-update-available', handleUpdateAvailable);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setShowInstallBanner(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismissInstall = () => {
        setShowInstallBanner(false);
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    };

    const handleUpdate = () => {
        applyServiceWorkerUpdate();
    };

    // Don't render anything if nothing to show
    if (!showInstallBanner && !showUpdateBanner) return null;

    return (
        <>
            {/* ── Install Banner ─────────────────────────────── */}
            {showInstallBanner && (
                <div className="pwa-banner pwa-install-banner">
                    <div className="pwa-banner-icon">
                        <Smartphone size={20} />
                    </div>
                    <div className="pwa-banner-content">
                        <span className="pwa-banner-title">Install Basalt</span>
                        <span className="pwa-banner-description">
                            Add to your home screen for a faster, offline-ready experience.
                        </span>
                    </div>
                    <div className="pwa-banner-actions">
                        <button className="pwa-btn pwa-btn-primary" onClick={handleInstall}>
                            <Download size={14} />
                            Install
                        </button>
                        <button className="pwa-btn pwa-btn-ghost" onClick={handleDismissInstall}>
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* ── Update Banner ──────────────────────────────── */}
            {showUpdateBanner && (
                <div className="pwa-banner pwa-update-banner">
                    <div className="pwa-banner-icon pwa-banner-icon-update">
                        <RefreshCw size={20} />
                    </div>
                    <div className="pwa-banner-content">
                        <span className="pwa-banner-title">Update Available</span>
                        <span className="pwa-banner-description">
                            A new version of Basalt is ready. Refresh to update.
                        </span>
                    </div>
                    <div className="pwa-banner-actions">
                        <button className="pwa-btn pwa-btn-primary" onClick={handleUpdate}>
                            <RefreshCw size={14} />
                            Update
                        </button>
                        <button className="pwa-btn pwa-btn-ghost" onClick={() => setShowUpdateBanner(false)}>
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default PWAInstallPrompt;
