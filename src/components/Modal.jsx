import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, footer, dismissible = true, className = '' }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape' && dismissible) onClose(); }
    document.body.classList.add('no-scroll');
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('no-scroll');
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, dismissible]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={dismissible ? onClose : undefined} role="dialog" aria-modal="true">
      <div className={`modal ${className}`} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="modal__header">
            <h3>{title}</h3>
            {dismissible && (
              <button className="modal__close" onClick={onClose} aria-label="Cerrar">✕</button>
            )}
          </div>
        )}
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
