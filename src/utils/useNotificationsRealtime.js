import { useEffect, useRef } from 'react';
import { supabase, supabaseEnabled } from './supabaseClient.js';

// Subscribes to INSERT events on public.notifications via Supabase Realtime.
// Calls onNotification(payload) when a new row arrives.
//
// Also fetches the latest row on mount to handle the case where a notification
// arrived while the user wasn't connected — we show only notifications newer
// than the timestamp of the last one the user already saw.
const SEEN_KEY = 'piponpipon_notif_last_seen_v1';

function getLastSeen() {
  try { return localStorage.getItem(SEEN_KEY) || null; }
  catch { return null; }
}

function setLastSeen(iso) {
  try { localStorage.setItem(SEEN_KEY, iso); }
  catch { /* ignore */ }
}

export function useNotificationsRealtime(onNotification) {
  const cbRef = useRef(onNotification);
  useEffect(() => { cbRef.current = onNotification; }, [onNotification]);

  useEffect(() => {
    if (!supabaseEnabled) return;
    let cancelled = false;

    // Subscribe to INSERT events
    const channel = supabase
      .channel('notifications-broadcast')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const row = payload?.new;
          if (!row) return;
          setLastSeen(row.created_at);
          cbRef.current?.(row);
        }
      )
      .subscribe();

    // Replay: fetch the latest notification — if it's newer than last seen, fire it
    (async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);
        if (error || cancelled) return;
        const latest = data?.[0];
        if (!latest) return;
        const lastSeen = getLastSeen();
        if (!lastSeen || new Date(latest.created_at) > new Date(lastSeen)) {
          setLastSeen(latest.created_at);
          cbRef.current?.(latest);
        }
      } catch { /* ignore */ }
    })();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);
}
