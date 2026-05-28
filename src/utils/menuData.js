import bundled from '../../menu-data.json';
import { supabase, supabaseEnabled } from './supabaseClient.js';

// Local cache so reloads are instant even before Supabase responds.
// NOT an "override" anymore — Supabase is the source of truth.
const CACHE_KEY = 'piponpipon_menu_cache_v2';

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.categories)) return parsed;
  } catch { /* ignore */ }
  return null;
}

function writeCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); }
  catch { /* ignore */ }
}

// Sync load for first paint — cache > bundled
export function loadMenuData() {
  return readCache() || bundled;
}

// Async fetch — Supabase row > fallback /menu-data.json
export async function fetchLiveMenuData() {
  if (supabaseEnabled) {
    try {
      const { data, error } = await supabase
        .from('menu')
        .select('data')
        .eq('id', 1)
        .maybeSingle();
      if (!error && data?.data && Array.isArray(data.data.categories)) {
        writeCache(data.data);
        return data.data;
      }
    } catch { /* fall through to legacy */ }
  }
  // Legacy fallback (in case Supabase row not seeded yet)
  try {
    const resp = await fetch('/menu-data.json', { cache: 'no-store' });
    if (resp.ok) {
      const json = await resp.json();
      if (json && Array.isArray(json.categories)) {
        writeCache(json);
        return json;
      }
    }
  } catch { /* offline */ }
  return null;
}

// Persist the full menu to Supabase. Upsert on id=1 (single-row design).
export async function saveMenuToSupabase(menuData) {
  if (!supabaseEnabled) return { ok: false, error: 'Supabase no configurado' };
  const { error } = await supabase
    .from('menu')
    .upsert(
      { id: 1, data: menuData, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
  if (error) return { ok: false, error: error.message };
  writeCache(menuData);
  return { ok: true };
}

// Subscribe to live menu updates. Returns unsubscribe fn.
export function subscribeToMenu(callback) {
  if (!supabaseEnabled) return () => {};
  const channel = supabase
    .channel('menu-live')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'menu' },
      (payload) => {
        const next = payload?.new?.data;
        if (next && Array.isArray(next.categories)) {
          writeCache(next);
          callback(next);
        }
      }
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// ---------- Legacy shims for backward compat ----------
export function saveMenuData(_data) {
  // No-op: real saves now go through saveMenuToSupabase()
}
export function resetMenuData() {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}
export function getBundledMenuData() {
  return JSON.parse(JSON.stringify(bundled));
}
export function hasOverride() { return false; }
