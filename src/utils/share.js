// Web Share API helper. On Android with PWA installed, the share target
// can open the PWA directly when the user taps the shared link.
export async function shareMenuDelDia(items) {
  const url = 'https://piponpipon-web.vercel.app/#menu-del-dia';
  const names = (items || []).map((i) => i.name).filter(Boolean).join(', ');
  const text = names
    ? `🍽️ Menú del Día de Pipón Pipón\n\nHoy: ${names}\n\nPedilo online:`
    : '🍽️ Mirá el Menú del Día de Pipón Pipón. Pedilo online:';

  if (navigator.share) {
    try {
      await navigator.share({ title: 'Menú del Día — Pipón Pipón', text, url });
      return { ok: true, via: 'share' };
    } catch (err) {
      if (err?.name === 'AbortError') return { ok: false, cancelled: true };
    }
  }
  // Fallback: copy link to clipboard
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return { ok: true, via: 'clipboard' };
  } catch {
    return { ok: false, error: 'no-share-no-clipboard' };
  }
}
