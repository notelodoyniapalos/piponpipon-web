import { useEffect, useState, useCallback } from 'react';
import { isStandalone, isIOS } from './pwa.js';

// Hook that exposes the browser install prompt (Chromium / Edge / Android),
// detects iOS (manual A2HS), and reflects whether the app is already installed.
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => isStandalone());

  useEffect(() => {
    const onBefore = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBefore);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBefore);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return null;
    try {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return choice?.outcome || null;
    } catch {
      return null;
    }
  }, [deferredPrompt]);

  return {
    canInstall: !!deferredPrompt && !installed,
    installed,
    isIOS: isIOS() && !installed,
    promptInstall
  };
}
