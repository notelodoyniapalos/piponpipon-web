import { useEffect, useState } from 'react';
import { getStatus, formatHM, formatRelative, minutesUntil } from '../utils/scheduleStatus.js';

export default function StatusBanner({ schedule }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Re-tick every 30s so the banner stays accurate as time crosses thresholds
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const status = getStatus(schedule, now);
  const { delivery, mostrador } = status;

  let level = 'closed';
  let dot = '○';
  let main = '';
  let detail = '';

  if (delivery.isOpen) {
    const minsLeft = minutesUntil(delivery.closesAt, now);
    if (minsLeft <= 30) {
      level = 'warn';
      dot = '●';
      main = `Cerramos delivery a las ${formatHM(delivery.closesAt)}`;
      detail = `(en ${minsLeft} min)`;
    } else {
      level = 'open';
      dot = '●';
      main = `Abierto · Delivery hasta las ${formatHM(delivery.closesAt)}`;
    }
  } else if (mostrador.isOpen) {
    level = 'partial';
    dot = '●';
    main = `Mostrador abierto hasta las ${formatHM(mostrador.closesAt)}`;
    detail = delivery.opensAt
      ? `Delivery desde las ${formatHM(delivery.opensAt)}`
      : '';
  } else {
    level = 'closed';
    dot = '○';
    const next = delivery.opensAt || mostrador.opensAt;
    if (next) {
      main = 'Cerrado por ahora';
      detail = `Reabrimos ${formatRelative(next, now)}. Podés dejar tu pedido como reserva.`;
    } else {
      main = 'Cerrado';
    }
  }

  return (
    <div className={`status-banner status-banner--${level}`} role="status" aria-live="polite">
      <span className="status-dot" aria-hidden="true">{dot}</span>
      <span className="status-main">{main}</span>
      {detail && <span className="status-detail">{detail}</span>}
    </div>
  );
}
