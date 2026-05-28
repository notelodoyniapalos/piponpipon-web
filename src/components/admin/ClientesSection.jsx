import { useMemo, useState } from 'react';
import { FAKE_CLIENTS } from '../../utils/fakeData.js';
import { formatPrice } from '../../utils/formatPrice.js';

const TEST_WHATSAPP = '5492257652436';

function ClienteDetail({ client, onClose }) {
  const wa = `https://wa.me/${TEST_WHATSAPP}?text=${encodeURIComponent(`Hola ${client.name}, te escribo de Pipón Pipón.`)}`;
  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal__header">
          <h3>{client.name}</h3>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="modal__body">
          <div className="cli-detail__grid">
            <div><strong>📱 Teléfono:</strong> {client.phone}</div>
            <div><strong>📍 Dirección:</strong> {client.addr}</div>
            <div><strong>🛒 Pedidos:</strong> {client.totalOrders}</div>
            <div><strong>💰 Total gastado:</strong> {formatPrice(client.totalSpent)}</div>
            <div><strong>⭐ Plato favorito:</strong> {client.favoriteItem}</div>
            <div><strong>🕐 Último pedido:</strong> {new Date(client.lastOrder).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</div>
          </div>

          <h4 className="admin__h4" style={{ marginTop: 16 }}>Historial de pedidos</h4>
          <div className="cli-orders">
            {client.orders.map((o) => (
              <div className="cli-order" key={o.id}>
                <div className="cli-order__head">
                  <span className="cli-order__date">
                    {new Date(o.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    {' · '}
                    {new Date(o.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="cli-order__type">{o.type === 'Delivery' ? '🛵' : '🏪'}</span>
                  <span className="cli-order__total">{formatPrice(o.total)}</span>
                </div>
                <ul className="cli-order__items">
                  {o.items.map((it, i) => (
                    <li key={i}>{it.qty}× {it.name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="modal__footer">
          <div className="modal-actions">
            <button className="btn-secondary" onClick={onClose}>Cerrar</button>
            <a className="wa-btn" href={wa} target="_blank" rel="noopener noreferrer">
              💬 Escribir por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientesSection() {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAKE_CLIENTS;
    return FAKE_CLIENTS.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.addr.toLowerCase().includes(q)
    );
  }, [query]);

  const totals = useMemo(() => {
    return {
      clients: FAKE_CLIENTS.length,
      orders: FAKE_CLIENTS.reduce((s, c) => s + c.totalOrders, 0),
      revenue: FAKE_CLIENTS.reduce((s, c) => s + c.totalSpent, 0)
    };
  }, []);

  return (
    <div className="cli">
      <div className="cli-summary">
        <div className="cli-summary__cell">
          <div className="cli-summary__num">{totals.clients}</div>
          <div className="cli-summary__lbl">clientes</div>
        </div>
        <div className="cli-summary__cell">
          <div className="cli-summary__num">{totals.orders}</div>
          <div className="cli-summary__lbl">pedidos</div>
        </div>
        <div className="cli-summary__cell">
          <div className="cli-summary__num" style={{ color: 'var(--color-primary)' }}>{formatPrice(totals.revenue)}</div>
          <div className="cli-summary__lbl">facturación</div>
        </div>
      </div>

      <div className="admin__search">
        <input
          type="search"
          placeholder="Buscar por nombre, teléfono o dirección…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && <button className="admin__search-clear" onClick={() => setQuery('')}>✕</button>}
      </div>

      <div className="cli-list">
        {filtered.map((c) => {
          const wa = `https://wa.me/${TEST_WHATSAPP}?text=${encodeURIComponent(`Hola ${c.name}, te escribo de Pipón Pipón.`)}`;
          return (
            <div className="cli-row" key={c.id}>
              <button className="cli-row__main" onClick={() => setPicked(c)}>
                <div className="cli-row__name">{c.name}</div>
                <div className="cli-row__meta">
                  📱 {c.phone} · 🛒 {c.totalOrders} ped · {formatPrice(c.totalSpent)}
                </div>
                <div className="cli-row__addr">📍 {c.addr}</div>
              </button>
              <a className="cli-row__wa" href={wa} target="_blank" rel="noopener noreferrer" title="WhatsApp">
                💬
              </a>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="admin__empty">Ningún cliente coincide con "{query}".</p>
        )}
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 16, textAlign: 'center' }}>
        ℹ️ Datos demo. Cuando agreguemos la tabla <code>orders</code> en Supabase, esta sección mostrará los clientes reales que pidieron por WhatsApp.
      </p>

      {picked && <ClienteDetail client={picked} onClose={() => setPicked(null)} />}
    </div>
  );
}
