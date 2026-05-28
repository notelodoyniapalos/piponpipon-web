import { useRef } from 'react';

export default function Header({ itemCount, onCartClick, notifState, onBellClick }) {
  // Triple-tap on the logo opens the admin panel (replaces the visible footer link)
  const tapCount = useRef(0);
  const tapTimer = useRef(null);
  const handleLogoClick = (e) => {
    e.preventDefault();
    tapCount.current += 1;
    if (tapCount.current >= 3) {
      tapCount.current = 0;
      clearTimeout(tapTimer.current);
      window.location.hash = 'admin';
      return;
    }
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 600);
  };

  const state = notifState || 'default'; // 'granted' | 'denied' | 'default' | 'unsupported'
  const bellIcon = state === 'denied' ? '🔕' : '🔔';
  const bellTitle = {
    granted:     'Notificaciones activadas',
    denied:      'Notificaciones bloqueadas (cambialo en config del navegador)',
    default:     'Activar notificaciones',
    unsupported: 'Tu navegador no soporta notificaciones'
  }[state];

  return (
    <header className="header">
      <div className="header__inner">
        <a className="logo-link" href="#top" aria-label="Pipón Pipón — inicio" onClick={handleLogoClick}>
          <img
            src="/logo-lockup.svg"
            alt="Pipón Pipón"
            className="logo-img"
            width="160"
            height="40"
          />
        </a>

        {state !== 'unsupported' && (
          <button
            className={`bell-btn bell-btn--${state}`}
            onClick={onBellClick}
            aria-label={bellTitle}
            title={bellTitle}
          >
            {bellIcon}
            {state === 'granted' && <span className="bell-btn__dot" aria-hidden="true" />}
          </button>
        )}

        <button className="cart-btn" onClick={onCartClick} aria-label="Abrir carrito">
          🛒
          {itemCount > 0 && <span className="cart-btn__badge">{itemCount}</span>}
        </button>
      </div>
    </header>
  );
}
