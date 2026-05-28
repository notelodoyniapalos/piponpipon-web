import { useEffect, useRef } from 'react';
import { formatPrice } from '../utils/formatPrice.js';

export default function IncomingNotification({ notification, onClose, onOpenCart }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!notification) return;
    // Play a short attention sound. Some browsers block audio without user gesture —
    // we silently swallow that error.
    try {
      if (notification.sound !== false) {
        audioRef.current?.play?.()?.catch?.(() => {});
      }
    } catch { /* ignore */ }
  }, [notification]);

  if (!notification) return null;

  const items = Array.isArray(notification.items) ? notification.items : [];

  return (
    <>
      {/* Tiny inline beep (data URI). Falls back silently on browsers that block. */}
      <audio
        ref={audioRef}
        preload="auto"
        src="data:audio/wav;base64,UklGRiQGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAGAAA="
      />

      <div className="incoming" role="alertdialog" aria-live="assertive">
        <div className="incoming__inner">
          <button className="incoming__close" onClick={onClose} aria-label="Cerrar">✕</button>

          <div className="incoming__head">
            <img src="/logo-icon.svg" alt="" className="incoming__avatar" />
            <div className="incoming__label">Nuevo aviso de Pipón</div>
          </div>

          <h3 className="incoming__title">{notification.title}</h3>
          {notification.body && <p className="incoming__body">{notification.body}</p>}

          {items.length > 0 && (
            <div className="incoming__items">
              {items.map((it, i) => (
                <div className="incoming__item" key={it.id || i}>
                  {it.photo && <img src={it.photo} alt="" />}
                  <div className="incoming__item-info">
                    <div className="incoming__item-name">{it.name}</div>
                    {typeof it.price === 'number' && it.price > 0 && (
                      <div className="incoming__item-price">{formatPrice(it.price)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="incoming__actions">
            {items.length > 0 && onOpenCart && (
              <button className="oro-cta" onClick={() => { onClose(); document.getElementById(`cat-${items[0]?.categoryId || ''}`)?.scrollIntoView({ behavior: 'smooth' }); }}>
                Ver en el menú
              </button>
            )}
            <button className="btn-secondary" onClick={onClose}>OK, gracias</button>
          </div>
        </div>
      </div>
    </>
  );
}
