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
  if (!supabaseEnabled) return { ok: false, reason: 'supabase-disabled' };
  if (!VAPID_PUBLIC) return { ok: false, reason: 'no-vapid-key' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' };
  }
  if (Notification.permission !== 'granted') {
    return { ok: false, reason: 'no-permission' };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC)
      });
    }

    const json = sub.toJSON();
    const row = {
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      user_agent: navigator.userAgent.slice(0, 250)
    };

    // Upsert by endpoint — re-subscribing the same browser shouldn't duplicate
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(row, { onConflict: 'endpoint' });

    if (error) return { ok: false, reason: 'db-error', error };
    return { ok: true, subscription: sub };
  } catch (err) {
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
