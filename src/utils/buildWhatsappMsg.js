import { formatPrice } from './formatPrice.js';

// BMP-only symbols (3-byte UTF-8). 4-byte emojis get mangled to U+FFFD by
// some WhatsApp pipelines (notably WhatsApp Desktop on Windows).
const SEP = '────────────────────';

function extrasInline(extras) {
  if (!extras) return '';
  const parts = Object.entries(extras).map(([k, v]) => `${k}: ${v}`);
  return parts.length ? ` (${parts.join(' · ')})` : '';
}

export function buildWhatsappMsg({
  name,
  phone,
  orderType,
  address,
  reference,
  location,
  reservationFor,
  urgent,
  payment,
  condimentos,
  dietary,
  notes,
  items
}) {
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const lines = [];

  if (urgent) lines.push('*⚡ URGENTE — LO QUIERO YA*');
  lines.push(
    reservationFor
      ? '*RESERVA DE PEDIDO — Pipón Pipón*'
      : '*NUEVO PEDIDO — Pipón Pipón*'
  );
  lines.push(SEP);

  if (urgent) {
    lines.push('▸ Prioridad: URGENTE (lo antes posible)');
  } else if (reservationFor) {
    lines.push(`▸ Para retirar/enviar: ${reservationFor}`);
  }
  lines.push(`▸ Nombre: ${name}`);
  if (phone) lines.push(`▸ Teléfono: ${phone}`);
  lines.push(`▸ Tipo: ${orderType}`);
  if (address) lines.push(`▸ Dirección: ${address}`);
  if (reference) lines.push(`▸ Referencia: ${reference}`);
  if (location && location.lat != null && location.lng != null) {
    lines.push(`▸ Ubicación: https://maps.google.com/?q=${location.lat},${location.lng}`);
  }

  if (Array.isArray(dietary) && dietary.length > 0) {
    lines.push(`▸ Preferencias: ${dietary.join(', ')}`);
  }
  if (payment) {
    lines.push(`▸ Pago: ${payment}${payment === 'Transferencia' ? ' (envío comprobante a continuación)' : ''}`);
  }

  lines.push(SEP);
  lines.push('*PEDIDO:*');
  for (const i of items) {
    const subtotal = i.price * i.qty;
    lines.push(`  • ${i.qty}x ${i.name}${extrasInline(i.extras)} — ${formatPrice(subtotal)}`);
  }

  if (Array.isArray(condimentos) && condimentos.length > 0) {
    lines.push('');
    lines.push(`▸ Condimentos para llevar: ${condimentos.join(', ')}`);
  }

  lines.push(SEP);
  lines.push(`*TOTAL: ${formatPrice(total)}*`);
  lines.push('');
  lines.push(`▸ Notas: ${notes && notes.trim() ? notes.trim() : 'Sin notas'}`);

  return lines.join('\n');
}

export function buildWhatsappUrl(phone, msg) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}
