import bundled from '../../menu-data.json';

const OVERRIDE_KEY = 'piponpipon_menu_override_v1';
// Path served from the deployment root; replace this file via FTP/admin to push live changes.
const LIVE_URL = '/menu-data.json';

function readOverride() {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.categories)) return parsed;
  } catch { /* ignore */ }
  return null;
}

// Sync load for first paint. Override > bundled (live fetch arrives shortly after).
export function loadMenuData() {
  return readOverride() || bundled;
}

// Async fetch of the live JSON deployed at /menu-data.json
export async function fetchLiveMenuData() {
  try {
    const resp = await fetch(LIVE_URL, { cache: 'no-store' });
    if (!resp.ok) throw new Error('fetch failed: ' + resp.status);
    const data = await resp.json();
    if (!data || !Array.isArray(data.categories)) throw new Error('invalid shape');
    return data;
  } catch (e) {
    return null;
  }
}

export function saveMenuData(data) {
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify(data));
}

export function resetMenuData() {
  localStorage.removeItem(OVERRIDE_KEY);
}

export function getBundledMenuData() {
  return JSON.parse(JSON.stringify(bundled));
}

export function hasOverride() {
  try { return !!localStorage.getItem(OVERRIDE_KEY); }
  catch { return false; }
}
