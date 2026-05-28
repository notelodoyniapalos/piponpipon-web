import Modal from './Modal.jsx';
import { requestNotifPermission, markNotifDismissed, showLocalNotification } from '../utils/pwa.js';
import { ensurePushSubscription } from '../utils/pushSubscribe.js';

export default function NotificationPrompt({ open, onClose, onChange }) {
  const accept = async () => {
    const result = await requestNotifPermission();
    if (result === 'granted') {
      showLocalNotification('🔔 ¡Notificaciones activadas!', {
        body: 'Te vamos a avisar cuando haya nuevas promos exclusivas y descuentos Cliente ORO.'
      });
      // Register a Web Push subscription so the OS can wake the device even with app closed
      await ensurePushSubscription();
    }
    onChange?.(result);
    onClose();
  };

  const decline = () => {
    markNotifDismissed();
    onChange?.('default');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={decline}
      title={null}
      className="modal--notif"
      footer={
        <div className="modal-actions">
          <button className="btn-secondary" onClick={decline}>Ahora no</button>
          <button className="oro-cta" onClick={accept}>🔔 Activar avisos</button>
        </div>
      }
    >
      <div className="notif-pop">
        <div className="notif-pop__icon">🔔</div>
        <h3 className="notif-pop__title">¿Te avisamos las promos?</h3>
        <p className="notif-pop__lead">
          Activá las <strong>notificaciones</strong> para enterarte primero de los
          <strong> descuentos Cliente ORO</strong>, el Menú del Día y promos limitadas.
        </p>
        <p className="notif-pop__hint">
          Tu navegador te va a pedir permiso. Podés desactivarlas cuando quieras desde la 🔔 en la barra de arriba.
        </p>
      </div>
    </Modal>
  );
}
