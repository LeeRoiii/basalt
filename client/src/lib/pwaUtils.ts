// ============================================================
// PWA Utilities — Service Worker registration & update handling
// ============================================================

/**
 * Registers the service worker and returns a cleanup function.
 * Called once from main.tsx on app startup.
 */
export async function registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
        console.log('[PWA] Service workers are not supported');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
        });

        console.log('[PWA] Service worker registered:', registration.scope);

        // Check for updates periodically (every 60 minutes)
        setInterval(() => {
            registration.update();
        }, 60 * 60 * 1000);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New version available — dispatch custom event for UI to handle
                    window.dispatchEvent(new CustomEvent('sw-update-available'));
                }
            });
        });
    } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
    }
}

/**
 * Tells the waiting service worker to take over immediately.
 */
export function applyServiceWorkerUpdate(): void {
    navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration?.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
        }
    });
}

/**
 * Checks if the app is currently running as an installed PWA.
 */
export function isRunningAsPWA(): boolean {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
    );
}
