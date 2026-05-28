import { useMemo, useEffect } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafTooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { FAKE_CLIENTS, buildStats } from '../../utils/fakeData.js';
import { formatPrice } from '../../utils/formatPrice.js';

const COLOR_PRIMARY = '#F27900';
const COLOR_SECONDARY = '#FBBF24';
const COLOR_GRAY = '#6B7280';
const PIE_COLORS = [COLOR_PRIMARY, COLOR_SECONDARY, '#60a5fa', '#c084fc'];

// San Martín de los Andes
const MAP_CENTER = [-40.158, -71.353];

function ChartCard({ title, children, hint }) {
  return (
    <div className="stat-card">
      <div className="stat-card__title">{title}</div>
      {hint && <div className="stat-card__hint">{hint}</div>}
      <div className="stat-card__body">{children}</div>
    </div>
  );
}

function KpiCard({ label, value, color }) {
  return (
    <div className="kpi-card">
      <div className="kpi-card__value" style={color ? { color } : undefined}>{value}</div>
      <div className="kpi-card__label">{label}</div>
    </div>
  );
}

export default function StatsSection() {
  const stats = useMemo(() => buildStats(FAKE_CLIENTS), []);

  // Recharts has trouble with SSR-like initial 0 size — give layout a beat
  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
  }, []);

  return (
    <div className="stats">
      <div className="kpi-grid">
        <KpiCard label="Facturación 60d" value={formatPrice(stats.totalRevenue)} color={COLOR_PRIMARY} />
        <KpiCard label="Pedidos totales" value={stats.totalOrders} />
        <KpiCard label="Ticket promedio" value={formatPrice(stats.avgTicket)} />
        <KpiCard label="Clientes únicos" value={FAKE_CLIENTS.length} />
      </div>

      <ChartCard title="🏆 Platos más vendidos" hint="Top 8 por cantidad vendida en los últimos 60 días">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.topItems} layout="vertical" margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
            <XAxis type="number" stroke="#aaa" fontSize={11} />
            <YAxis type="category" dataKey="name" stroke="#aaa" width={140} fontSize={11} />
            <Tooltip
              contentStyle={{ background: '#1C1C1C', border: '1px solid #F27900', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#fff' }}
              formatter={(v, k) => k === 'qty' ? `${v} unidades` : formatPrice(v)}
            />
            <Bar dataKey="qty" fill={COLOR_PRIMARY} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="📈 Ventas — últimos 14 días" hint="Facturación diaria">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={stats.salesByDay} margin={{ top: 4, right: 16, left: -10, bottom: 4 }}>
            <defs>
              <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLOR_PRIMARY} stopOpacity={0.7} />
                <stop offset="100%" stopColor={COLOR_PRIMARY} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke="#aaa" fontSize={11} />
            <YAxis stroke="#aaa" fontSize={11} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <Tooltip
              contentStyle={{ background: '#1C1C1C', border: '1px solid #F27900', borderRadius: 8, fontSize: 12 }}
              formatter={(v, k) => k === 'sales' ? formatPrice(v) : `${v} pedidos`}
            />
            <Area type="monotone" dataKey="sales" stroke={COLOR_PRIMARY} strokeWidth={2} fill="url(#salesFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="stats-grid-2">
        <ChartCard title="🛵 Delivery vs Retiro">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={stats.typeData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={4}>
                {stats.typeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1C1C1C', border: '1px solid #F27900', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="💸 Pago: Efectivo vs Transferencia">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={stats.payData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={4}>
                {stats.payData.map((_, i) => <Cell key={i} fill={PIE_COLORS[(i+2) % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1C1C1C', border: '1px solid #F27900', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="🕐 Horarios pico" hint="Pedidos por hora del día (horario operativo)">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats.hourData} margin={{ top: 4, right: 16, left: -10, bottom: 4 }}>
            <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
            <XAxis dataKey="hour" stroke="#aaa" fontSize={11} />
            <YAxis stroke="#aaa" fontSize={11} />
            <Tooltip contentStyle={{ background: '#1C1C1C', border: '1px solid #F27900', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="orders" fill={COLOR_PRIMARY} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="🗺️ Zonas calientes — San Martín de los Andes" hint="El tamaño del círculo refleja la cantidad de pedidos en esa ubicación">
        <div className="stat-map">
          <MapContainer center={MAP_CENTER} zoom={13} scrollWheelZoom={false} style={{ height: 360, width: '100%', borderRadius: 8 }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {stats.heatPoints.map((p, i) => (
              <CircleMarker
                key={i}
                center={[p.lat, p.lng]}
                radius={Math.min(8 + p.count * 2, 38)}
                pathOptions={{
                  color: COLOR_PRIMARY,
                  fillColor: COLOR_PRIMARY,
                  fillOpacity: 0.45,
                  weight: 2
                }}
              >
                <LeafTooltip>
                  <strong>{p.name}</strong><br />
                  {p.count} pedido{p.count === 1 ? '' : 's'}
                </LeafTooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </ChartCard>

      <p className="muted" style={{ fontSize: 12, marginTop: 12, textAlign: 'center' }}>
        ℹ️ Datos demo. Cuando tengamos la tabla <code>orders</code> en Supabase, todos estos gráficos pasan a usar datos reales.
      </p>
    </div>
  );
}
