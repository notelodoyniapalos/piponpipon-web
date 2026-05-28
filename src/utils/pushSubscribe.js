import { supabase, supabaseEnabled } from './supabaseClient.js';

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// Standard helper to convert the URL-safe base64 VAPID public key into the
// Uint8Array that PushManager.subscribe expects.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export async function ensurePushSubscription() {
  console.log('[push] ensurePushSubscription called');
  if (!supabaseEnabled) {
    console.warn('[push] aborted: supabase no configurado');
    return { ok: false, reason: 'supabase-disabled' };
  }
  if (!VAPID_PUBLIC) {
    console.warn('[push] aborted: VITE_VAPID_PUBLIC_KEY no está en el bundle');
    return { ok: false, reason: 'no-vapid-key' };
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[push] aborted: navegador no soporta PushManager');
    return { ok: false, reason: 'unsupported' };
  }
  if (Notification.permission !== 'granted') {
    console.warn('[push] aborted: permiso =', Notification.permission);
    return { ok: false, reason: 'no-permission' };
  }

  try {
    console.log('[push] esperando SW ready...');
    const reg = await navigator.serviceWorker.ready;
    console.log('[push] SW activo:', reg.active?.scriptURL);

    let sub = await reg.pushManager.getSubscription();
    console.log('[push] subscription previa:', sub ? 'SI' : 'NO');

    if (!sub) {
      console.log('[push] llamando pushManager.subscribe...');
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC)
      });
      console.log('[push] suscripto OK, endpoint:', sub.endpoint.slice(0, 60) + '...');
    }

    const json = sub.toJSON();
    const row = {
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      user_agent: navigator.userAgent.slice(0, 250)
    };

    console.log('[push] guardando en Supabase...');
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(row, { onConflict: 'endpoint' });

    if (error) {
      console.error('[push] ERROR al guardar en Supabase:', error);
      return { ok: false, reason: 'db-error', error };
    }
    console.log('[push] ✓ guardado OK');
    return { ok: true, subscription: sub };
  } catch (err) {
    console.error('[push] ERROR en subscribe:', err);
    return { ok: false, reason: 'subscribe-error', error: err };
  }
}

export async function dropPushSubscription() {
  if (!supabaseEnabled) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    }
  } catch { /* ignore */ }
}
