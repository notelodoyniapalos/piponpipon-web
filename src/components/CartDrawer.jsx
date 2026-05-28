import { useEffect, useMemo, useRef, useState } from 'react';
import { formatPrice } from '../utils/formatPrice.js';
import { buildWhatsappMsg, buildWhatsappUrl } from '../utils/buildWhatsappMsg.js';
import {
  getStatus,
  formatRelative,
  formatHM,
  nextSlot,
  isOpenAt
} from '../utils/scheduleStatus.js';
import Modal from './Modal.jsx';

const FORM_KEY = 'piponpipon_form_v4';

const CONDIMENTOS = [
  'Aceite', 'Vinagre', 'Mayonesa', 'Mostaza',
  'Ketchup', 'Sal', 'Pimienta', 'Queso rallado'
];

const DIETARY = [
  { id: 'celiaco',     label: 'Soy celíaco (sin TACC)' },
  { id: 'sin-sal',     label: 'Sin sal' },
  { id: 'sin-azucar',  label: 'Sin azúcar' },
  { id: 'vegetariano', label: 'Vegetariano' },
  { id: 'vegano',      label: 'Vegano' }
];

const STEP_ORDER = [
  'name', 'phone', 'orderType', 'delivery', 'time', 'payment', 'condimentos', 'dietary', 'notes', 'summary'
];

function loadForm() {
  try { return JSON.parse(localStorage.getItem(FORM_KEY) || 'null'); }
  catch { return null; }
}

function formatExtras(extras) {
  if (!extras) return '';
  return Object.entries(extras).map(([k, v]) => `${k}: ${v}`).join(' · ');
}

function SummaryRow({ label, value, onEdit }) {
  return (
    <div className="summary-row">
      <span className="summary-row__label">{label}:</span>
      <span className="summary-row__value">{value}</span>
      <button
        type="button"
        className="summary-row__edit"
        onClick={onEdit}
        aria-label={`Editar ${label}`}
      >✎</button>
    </div>
  );
}

export default function CartDrawer({
  open, onClose, cart, total, whatsapp, schedule, hoursLabel,
  onInc, onDec, onRemove, onClear
}) {
  const saved = loadForm() || {};
  const [name,        setName]        = useState(saved.name        || '');
  const [phone,       setPhone]       = useState(saved.phone       || '');
  const [orderType,   setOrderType]   = useState(saved.orderType   || '');
  const [address,     setAddress]     = useState(saved.address     || '');
  const [reference,   setReference]   = useState(saved.reference   || '');
  const [scheduledTime, setScheduledTime] = useState('');
  const [urgent,      setUrgent]      = useState(false);
  const [payment,     setPayment]     = useState(saved.payment     || '');
  const [condimentos, setCondimentos] = useState(saved.condimentos || []);
  const [dietary,     setDietary]     = useState(saved.dietary     || []);
  const [notes,       setNotes]       = useState(saved.notes       || '');
  const [location,    setLocation]    = useState(null);
  const [locStatus,   setLocStatus]   = useState('idle');

  const [step,        setStep]        = useState('name');
  // sessionHistory: steps the user EXPLICITLY answered in the current drawer-open session.
  // We only render chat history bubbles for steps in this set — so returning visitors
  // with persisted data see a clean summary panel instead of a fake chat replay.
  const [sessionHistory, setSessionHistory] = useState([]);
  // editingField: if set, the user landed on this step via "✎ editar" from the summary.
  // After answering, we return to summary instead of advancing to the next step.
  const [editingField, setEditingField] = useState(null);
  const [invalidTimeModal, setInvalidTimeModal] = useState(false);
  const [confirmSend, setConfirmSend] = useState(null);

  const isDelivery = orderType === 'Delivery';
  const now = useMemo(() => new Date(), [open]);
  const status = getStatus(schedule, now);
  const relevantSlot = isDelivery ? status.delivery : nextSlot(schedule?.mostrador, now);
  const activeService = isDelivery ? schedule?.delivery : schedule?.mostrador;
  const chosenDate = scheduledTime ? new Date(scheduledTime) : null;
  const reservationFor = chosenDate
    ? formatRelative(chosenDate, now) + ' ' + formatHM(chosenDate)
    : (!relevantSlot.isOpen && relevantSlot.opensAt ? formatRelative(relevantSlot.opensAt, now) : null);

  const minDateTime = useMemo(() => {
    const d = new Date(now.getTime() + 60000);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, [now]);

  // Persist what we want to remember between visits (NOT scheduledTime/urgent/location)
  useEffect(() => {
    try {
      localStorage.setItem(FORM_KEY, JSON.stringify({
        name, phone, orderType, address, reference, payment, condimentos, dietary, notes
      }));
    } catch { /* ignore */ }
  }, [name, phone, orderType, address, reference, payment, condimentos, dietary, notes]);

  useEffect(() => {
    if (open) {
      document.body.classList.add('no-scroll');
      // Fresh session: no chat history visible, no edit-mode active
      setSessionHistory([]);
      setEditingField(null);
      // Auto-jump to the first unanswered step when drawer opens
      const firstMissing = ['name','phone','orderType','delivery','time','payment'].find((s) => {
        if (s === 'name')      return !name.trim();
        if (s === 'phone')     return !phone.trim();
        if (s === 'orderType') return !orderType;
        if (s === 'delivery')  return isDelivery && !address.trim() && !location;
        if (s === 'time')      return false; // optional
        if (s === 'payment')   return !payment;
        return false;
      }) || 'summary';
      setStep(firstMissing);
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => document.body.classList.remove('no-scroll');
  }, [open]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && open) onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Auto-scroll the chat to the bottom when step changes
  const chatRef = useRef(null);
  useEffect(() => {
    if (chatRef.current) {
      requestAnimationFrame(() => {
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
      });
    }
  }, [step, sessionHistory.length]);

  const toggleInList = (list, setList, value) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const requestLocation = () => {
    if (!('geolocation' in navigator)) { setLocStatus('unsupported'); return; }
    setLocStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocStatus('idle'); },
      () => setLocStatus('error'),
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 60000 }
    );
  };

  // Advance to next step. If we got here via "edit from summary", jump back to summary
  // instead of continuing the normal flow.
  const advance = (from, to) => {
    setSessionHistory((prev) => (prev.includes(from) ? prev : [...prev, from]));
    if (editingField === from) {
      setEditingField(null);
      setStep('summary');
    } else {
      setStep(to);
    }
  };

  const goBack = (target) => {
    const idx = STEP_ORDER.indexOf(target);
    setSessionHistory((prev) => prev.filter((s) => STEP_ORDER.indexOf(s) < idx));
    setStep(target);
  };

  // Called from the summary panel's "✎ editar" buttons
  const editField = (target) => {
    setEditingField(target);
    setSessionHistory([]); // we don't want any chat history on top of the edit screen
    setStep(target);
  };

  // Step-specific advance helpers
  const submitName       = () => name.trim() && advance('name', 'phone');
  const submitPhone      = () => phone.trim() && advance('phone', 'orderType');
  const pickOrderType    = (t) => { setOrderType(t); advance('orderType', t === 'Delivery' ? 'delivery' : 'time'); };
  const submitDelivery   = () => (address.trim() || location) && advance('delivery', 'time');
  const submitTime       = () => {
    if (chosenDate && !isOpenAt(activeService, chosenDate)) { setInvalidTimeModal(true); return; }
    advance('time', 'payment');
  };
  const pickPayment      = (p) => { setPayment(p); advance('payment', 'condimentos'); };
  const submitCondimentos = () => advance('condimentos', 'dietary');
  const submitDietary    = () => advance('dietary', 'notes');
  const submitNotes      = () => advance('notes', 'summary');

  const handleFinalSend = () => {
    if (cart.length === 0) return;
    const dietaryLabels = DIETARY.filter((d) => dietary.includes(d.id)).map((d) => d.label);
    const msg = buildWhatsappMsg({
      name: name.trim(),
      phone: phone.trim(),
      orderType,
      address: isDelivery ? address.trim() : '',
      reference: isDelivery ? reference.trim() : '',
      location: isDelivery ? location : null,
      reservationFor: urgent ? null : reservationFor,
      urgent,
      payment,
      condimentos,
      dietary: dietaryLabels,
      notes,
      items: cart
    });
    setConfirmSend(buildWhatsappUrl(whatsapp, msg));
  };

  const proceedToWhatsapp = () => {
    const url = confirmSend;
    setConfirmSend(null);
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');

    // Order sent — wipe EVERYTHING so the next time anyone opens the cart
    // it starts completely from scratch (contact info included).
    onClear();
    setName('');
    setPhone('');
    setOrderType('');
    setAddress('');
    setReference('');
    setPayment('');
    setScheduledTime('');
    setUrgent(false);
    setCondimentos([]);
    setDietary([]);
    setNotes('');
    setLocation(null);
    setLocStatus('idle');
    setSessionHistory([]);
    setEditingField(null);
    setStep('name');
    try { localStorage.removeItem(FORM_KEY); } catch { /* ignore */ }
  };

  const empty = cart.length === 0;
  // A step's chat bubbles only render if the user answered it in THIS session.
  // Returning visitors with pre-filled data don't see a fake replay — they see the summary.
  const inHistory = (s) => sessionHistory.includes(s);

  // Pretty label for the "Cuándo" summary row
  const whenLabel = (() => {
    if (urgent) return '⚡ Lo antes posible — URGENTE';
    if (scheduledTime && chosenDate) return `🕐 ${formatRelative(chosenDate, now)} ${formatHM(chosenDate)}`;
    if (reservationFor) return `📅 Reserva: ${reservationFor}`;
    return '🕐 Lo antes posible';
  })();
  const dietaryLabelsList = DIETARY.filter((d) => dietary.includes(d.id)).map((d) => d.label);

  // ---------- Bubble renderers ----------
  const Pip = ({ children, className = '' }) => (
    <div className={`bubble bubble--pip ${className}`}>
      <img src="/logo-icon.svg" alt="" className="bubble__avatar" />
      <div className="bubble__body">{children}</div>
    </div>
  );

  const User = ({ stepName, children }) => (
    <div className="bubble bubble--user">
      <div className="bubble__body">
        {children}
        <button className="bubble__edit" onClick={() => goBack(stepName)} aria-label="Editar">✎ editar</button>
      </div>
    </div>
  );

  return (
    <>
      <div className={`drawer-backdrop ${open ? 'open' : ''}`} onClick={onClose} aria-hidden={!open} />
      <aside className={`drawer ${open ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="Tu pedido">
        <div className="drawer__header">
          <h3>Tu pedido</h3>
          <button className="drawer__close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="drawer__body" ref={chatRef}>
          {empty ? (
            <div className="drawer__empty">
              <div className="big">🛒</div>
              <p>Tu carrito está vacío</p>
            </div>
          ) : (
            <>
              {/* Cart items always visible at the top */}
              <div className="cart-list">
                {cart.map((item) => (
                  <div className="cart-item" key={item.key}>
                    <div>
                      <p className="cart-item__name">{item.name}</p>
                      {item.extras && <p className="cart-item__opt">{formatExtras(item.extras)}</p>}
                    </div>
                    <div className="cart-item__subtotal">{formatPrice(item.price * item.qty)}</div>
                    <div className="cart-item__controls">
                      <div className="qty">
                        <button onClick={() => onDec(item.key)} aria-label="Quitar uno">−</button>
                        <span>{item.qty}</span>
                        <button onClick={() => onInc(item.key)} aria-label="Agregar uno">+</button>
                      </div>
                      <button className="remove-btn" onClick={() => onRemove(item.key)} aria-label={`Quitar ${item.name}`}>✕</button>
                    </div>
                  </div>
                ))}
                <button className="clear-btn" type="button" onClick={onClear}>Vaciar carrito</button>
              </div>

              {/* Chat with Pipón */}
              <div className="chat">
                {/* NAME */}
                {inHistory('name') ? (
                  <>
                    <Pip>¡Hola! Soy Pipón. Vamos a confirmar tu pedido 😋</Pip>
                    <User stepName="name">{name}</User>
                  </>
                ) : step === 'name' && (
                  <>
                    <Pip>¡Hola! Soy Pipón. Vamos a confirmar tu pedido 😋</Pip>
                    <Pip>Para empezar, <strong>¿cómo te llamás?</strong></Pip>
                    <div className="chat-input">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submitName()}
                        placeholder="Ej: María"
                      />
                      <button className="btn-primary" onClick={submitName} disabled={!name.trim()}>Continuar</button>
                    </div>
                  </>
                )}

                {/* PHONE */}
                {inHistory('phone') ? (
                  <>
                    <Pip>¡Mucho gusto, {name}! ¿Cuál es tu teléfono?</Pip>
                    <User stepName="phone">📱 {phone}</User>
                  </>
                ) : step === 'phone' && (
                  <>
                    <Pip>¡Mucho gusto, {name}! ¿Cuál es <strong>tu teléfono</strong> de contacto?</Pip>
                    <div className="chat-input">
                      <input
                        type="tel" inputMode="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submitPhone()}
                        placeholder="Ej: 2944 123456"
                      />
                      <button className="btn-primary" onClick={submitPhone} disabled={!phone.trim()}>Continuar</button>
                    </div>
                  </>
                )}

                {/* ORDER TYPE */}
                {inHistory('orderType') ? (
                  <>
                    <Pip>¿Cómo recibís el pedido?</Pip>
                    <User stepName="orderType">{isDelivery ? '🛵 Delivery' : '🏪 Retiro en local'}</User>
                  </>
                ) : step === 'orderType' && (
                  <>
                    <Pip>¿Cómo recibís el pedido?</Pip>
                    <div className="chat-choices">
                      <button className="choice-btn" onClick={() => pickOrderType('Delivery')}>🛵 Delivery</button>
                      <button className="choice-btn" onClick={() => pickOrderType('Retiro en local')}>🏪 Retiro en local</button>
                    </div>
                  </>
                )}

                {/* DELIVERY (only if delivery) */}
                {isDelivery && inHistory('delivery') ? (
                  <>
                    <Pip>¿A qué dirección lo llevamos?</Pip>
                    <User stepName="delivery">
                      {address && <>📍 {address}</>}
                      {reference && <><br />🏷️ {reference}</>}
                      {location && <><br />🗺️ Ubicación adjunta</>}
                    </User>
                  </>
                ) : isDelivery && step === 'delivery' && (
                  <>
                    <Pip>¿A qué <strong>dirección</strong> lo llevamos? También podés compartir tu ubicación.</Pip>
                    <div className="chat-form">
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Calle, número, barrio"
                      />
                      <input
                        type="text"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="Referencia (color de casa, piso, frente a…)"
                      />
                      <div className="loc-row">
                        <button type="button" className="loc-btn" onClick={requestLocation} disabled={locStatus === 'loading'}>
                          {locStatus === 'loading' ? '⏳ Obteniendo…' : (location ? '📍 Actualizar ubicación' : '📍 Compartir mi ubicación')}
                        </button>
                        {location && (
                          <button type="button" className="loc-clear" onClick={() => { setLocation(null); setLocStatus('idle'); }} aria-label="Quitar">✕</button>
                        )}
                      </div>
                      {location && <p className="loc-ok">✓ Ubicación adjunta</p>}
                      {locStatus === 'error' && <p className="loc-error">No pudimos acceder a tu ubicación.</p>}
                      <button className="btn-primary" onClick={submitDelivery} disabled={!address.trim() && !location}>Continuar</button>
                    </div>
                  </>
                )}

                {/* TIME */}
                {inHistory('time') ? (
                  <>
                    <Pip>¿Para cuándo lo querés?</Pip>
                    <User stepName="time">
                      {urgent
                        ? '⚡ Lo antes posible — URGENTE'
                        : (scheduledTime
                            ? `🕐 ${formatRelative(chosenDate, now)} ${formatHM(chosenDate)}`
                            : (reservationFor ? `📅 Reserva: ${reservationFor}` : '🕐 Lo antes posible'))}
                    </User>
                  </>
                ) : step === 'time' && (
                  <>
                    <Pip>¿Para cuándo lo querés? Si no elegís nada, va lo antes posible.</Pip>
                    <Pip className="bubble--quiet">
                      Horario de {isDelivery ? 'delivery' : 'mostrador'}: {hoursLabel?.[isDelivery ? 'delivery' : 'mostrador']}
                    </Pip>
                    <div className="chat-form">
                      <div className="time-row">
                        <input
                          type="datetime-local"
                          value={scheduledTime}
                          min={minDateTime}
                          disabled={urgent}
                          onChange={(e) => setScheduledTime(e.target.value)}
                        />
                        {scheduledTime && !urgent && (
                          <button type="button" className="loc-clear" onClick={() => setScheduledTime('')} aria-label="Quitar">✕</button>
                        )}
                      </div>
                      <label className={`urgent-toggle ${urgent ? 'on' : ''}`}>
                        <input type="checkbox" checked={urgent}
                          onChange={(e) => { setUrgent(e.target.checked); if (e.target.checked) setScheduledTime(''); }} />
                        <span className="urgent-toggle__icon">⚡</span>
                        <span className="urgent-toggle__text">
                          <strong>¡Lo quiero YA!</strong>
                          <small>Voy a morder a alguien 🦖</small>
                        </span>
                      </label>
                      <button className="btn-primary" onClick={submitTime}>Continuar</button>
                    </div>
                  </>
                )}

                {/* PAYMENT */}
                {inHistory('payment') ? (
                  <>
                    <Pip>¿Cómo vas a pagar?</Pip>
                    <User stepName="payment">{payment === 'Transferencia' ? '🏦 Transferencia' : '💵 Efectivo'}</User>
                  </>
                ) : step === 'payment' && (
                  <>
                    <Pip>¿Cómo vas a <strong>pagar</strong>?</Pip>
                    <div className="chat-choices">
                      <button className="choice-btn" onClick={() => pickPayment('Efectivo')}>💵 Efectivo</button>
                      <button className="choice-btn" onClick={() => pickPayment('Transferencia')}>🏦 Transferencia</button>
                    </div>
                  </>
                )}

                {/* CONDIMENTOS */}
                {inHistory('condimentos') ? (
                  <>
                    <Pip>¿Sumamos algún condimento?</Pip>
                    <User stepName="condimentos">{condimentos.length ? condimentos.join(', ') : '— sin condimentos'}</User>
                  </>
                ) : step === 'condimentos' && (
                  <>
                    <Pip>¿Querés que mandemos algún <strong>condimento</strong>? (opcional)</Pip>
                    <div className="chat-form">
                      <div className="chip-group">
                        {CONDIMENTOS.map((c) => (
                          <label key={c} className={`chip-toggle ${condimentos.includes(c) ? 'on' : ''}`}>
                            <input type="checkbox" checked={condimentos.includes(c)}
                              onChange={() => toggleInList(condimentos, setCondimentos, c)} />
                            {c}
                          </label>
                        ))}
                      </div>
                      <button className="btn-primary" onClick={submitCondimentos}>
                        {condimentos.length ? 'Continuar' : 'Sin condimentos, seguir'}
                      </button>
                    </div>
                  </>
                )}

                {/* DIETARY */}
                {inHistory('dietary') ? (
                  <>
                    <Pip>¿Alguna preferencia o restricción?</Pip>
                    <User stepName="dietary">
                      {dietary.length
                        ? DIETARY.filter((d) => dietary.includes(d.id)).map((d) => d.label).join(', ')
                        : '— sin restricciones'}
                    </User>
                  </>
                ) : step === 'dietary' && (
                  <>
                    <Pip>¿Tenés alguna <strong>preferencia o restricción</strong>? (opcional)</Pip>
                    <div className="chat-form">
                      <div className="check-list">
                        {DIETARY.map((d) => (
                          <label key={d.id} className="check-row">
                            <input type="checkbox" checked={dietary.includes(d.id)}
                              onChange={() => toggleInList(dietary, setDietary, d.id)} />
                            <span>{d.label}</span>
                          </label>
                        ))}
                      </div>
                      <button className="btn-primary" onClick={submitDietary}>
                        {dietary.length ? 'Continuar' : 'Sin restricciones, seguir'}
                      </button>
                    </div>
                  </>
                )}

                {/* NOTES */}
                {inHistory('notes') ? (
                  <>
                    <Pip>¿Algo más para aclararnos?</Pip>
                    <User stepName="notes">{notes.trim() || '— sin aclaraciones'}</User>
                  </>
                ) : step === 'notes' && (
                  <>
                    <Pip>¿Algo más para <strong>aclararnos</strong>? (alergias, instrucciones, etc.)</Pip>
                    <div className="chat-form">
                      <textarea rows={3} value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Sin cebolla, tocar timbre 2, etc." />
                      <button className="btn-primary" onClick={submitNotes}>
                        {notes.trim() ? 'Continuar' : 'Sin aclaraciones, seguir'}
                      </button>
                    </div>
                  </>
                )}

                {/* SUMMARY */}
                {step === 'summary' && (
                  <>
                    <Pip>{name ? `¡Listo ${name}!` : '¡Listo!'} Revisá tu pedido 👇</Pip>
                    <div className="bubble bubble--pip bubble--summary-card">
                      <img src="/logo-icon.svg" alt="" className="bubble__avatar" />
                      <div className="bubble__body">
                        <SummaryRow label="Nombre"      value={name || '—'}                            onEdit={() => editField('name')} />
                        <SummaryRow label="Teléfono"    value={phone || '—'}                           onEdit={() => editField('phone')} />
                        <SummaryRow label="Tipo"        value={isDelivery ? '🛵 Delivery' : '🏪 Retiro en local'} onEdit={() => editField('orderType')} />
                        {isDelivery && (
                          <SummaryRow
                            label="Dirección"
                            value={address || (location ? '📍 Ubicación adjunta' : '—')}
                            onEdit={() => editField('delivery')}
                          />
                        )}
                        <SummaryRow label="Cuándo"      value={whenLabel}                              onEdit={() => editField('time')} />
                        <SummaryRow label="Pago"        value={payment === 'Transferencia' ? '🏦 Transferencia' : (payment ? '💵 Efectivo' : '—')} onEdit={() => editField('payment')} />
                        <SummaryRow label="Condimentos" value={condimentos.length ? condimentos.join(', ') : '—'} onEdit={() => editField('condimentos')} />
                        <SummaryRow label="Preferencias" value={dietaryLabelsList.length ? dietaryLabelsList.join(', ') : '—'} onEdit={() => editField('dietary')} />
                        <SummaryRow label="Notas"       value={notes.trim() || '—'}                    onEdit={() => editField('notes')} />

                        <div className="summary-total">
                          <span>Total:</span>
                          <strong>{formatPrice(total)}</strong>
                        </div>
                      </div>
                    </div>
                    {payment === 'Transferencia' && (
                      <Pip className="bubble--alert">
                        💡 Como vas a pagar por <strong>transferencia</strong>, después de enviar el pedido vas a tener que mandarnos el <strong>comprobante</strong> por el mismo WhatsApp para que entre a la cocina.
                      </Pip>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div className="drawer__footer">
          <div className="drawer__total">
            <span>Total</span>
            <strong>{formatPrice(total)}</strong>
          </div>
          {step === 'summary' && !empty ? (
            <button className="wa-btn" onClick={handleFinalSend}>
              {urgent ? 'Enviar pedido URGENTE por WhatsApp' : (reservationFor ? `Reservar para ${reservationFor} por WhatsApp` : 'Enviar pedido por WhatsApp')}
            </button>
          ) : (
            <p className="footer-hint">
              {empty ? 'Agregá platos al carrito para continuar' : 'Respondé las preguntas de Pipón para terminar tu pedido 👆'}
            </p>
          )}
        </div>
      </aside>

      <Modal
        open={invalidTimeModal}
        onClose={() => setInvalidTimeModal(false)}
        title="Horario no disponible"
        footer={<button className="wa-btn" onClick={() => setInvalidTimeModal(false)}>Elegir otro horario</button>}
      >
        <p>El horario que elegiste está fuera de los horarios de {isDelivery ? 'delivery' : 'mostrador'}.</p>
        <p className="modal-hours"><strong>{hoursLabel?.[isDelivery ? 'delivery' : 'mostrador']}</strong></p>
        <p className="muted">Modificá la fecha/hora o dejá el campo vacío para que vaya como reserva a la próxima apertura.</p>
      </Modal>

      <Modal
        open={confirmSend !== null}
        onClose={() => setConfirmSend(null)}
        title="¡Casi listo!"
        footer={
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setConfirmSend(null)}>Cancelar</button>
            <button className="wa-btn" onClick={proceedToWhatsapp}>Abrir WhatsApp</button>
          </div>
        }
      >
        <p>Se va a abrir WhatsApp con tu pedido cargado.</p>
        <p>
          <strong>Importante:</strong> tenés que tocar el botón <strong>Enviar</strong>
          {payment === 'Transferencia' && <> y luego compartir el <strong>comprobante de pago</strong> (porque elegiste transferencia)</>}
          {' '}para que el pedido entre a la cocina. Si no enviás el mensaje, no nos llega nada.
        </p>
        <p className="muted">Cuando lo recibamos, te respondemos por el mismo chat para confirmar.</p>
      </Modal>
    </>
  );
}
