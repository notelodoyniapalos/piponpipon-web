// PWA install + notifications helpers (no backend yet — only local notifications)

const NOTIF_DISMISSED_KEY = 'piponpipon_notif_dismissed_v1';
const NOTIF_ASKED_KEY     = 'piponpipon_notif_asked_v1';

export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator?.standalone === true
  );
}

// ---------- Notifications ----------
export function notifSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notifPermission() {
  if (!notifSupported()) return 'unsupported';
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

export async function requestNotifPermission() {
  if (!notifSupported()) return 'unsupported';
  markNotifAsked();
  try {
    // Modern API returns a Promise
    const p = Notification.requestPermission();
    if (p && typeof p.then === 'function') return await p;
    return await new Promise((resolve) => Notification.requestPermission(resolve));
  } catch {
    return 'denied';
  }
}

export function showLocalNotification(title, opts = {}) {
  if (!notifSupported() || Notification.permission !== 'granted') return null;
  try {
    return new Notification(title, { icon: '/icon-192.png', badge: '/icon-192.png', ...opts });
  } catch {
    return null;
  }
}

export function markNotifDismissed() {
  try { localStorage.setItem(NOTIF_DISMISSED_KEY, String(Date.now())); } catch {}
}
export function wasNotifDismissed() {
  try { return !!localStorage.getItem(NOTIF_DISMISSED_KEY); } catch { return false; }
}
export function markNotifAsked() {
  try { localStorage.setItem(NOTIF_ASKED_KEY, '1'); } catch {}
}
export function wasNotifAsked() {
  try { return !!localStorage.getItem(NOTIF_ASKED_KEY); } catch { return false; }
}

// Should we surface the "activar notificaciones" prompt to this user?
export function shouldOfferNotifications() {
  if (!notifSupported()) return false;
  if (Notification.permission !== 'default') return false; // already granted / denied
  if (wasNotifDismissed()) return false;
  return true;
}
