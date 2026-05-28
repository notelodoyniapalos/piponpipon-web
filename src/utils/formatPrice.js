export function formatPrice(value) {
  const n = Math.round(Number(value) || 0);
  return '$' + n.toLocaleString('es-AR', { maximumFractionDigits: 0 });
}
