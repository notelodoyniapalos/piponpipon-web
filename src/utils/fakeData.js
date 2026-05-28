// Fake admin data for Clientes + Estadísticas. Reemplazar por queries Supabase
// reales cuando exista la tabla `orders` (Chunk 3).

const NAMES = [
  'María González', 'Juan Pérez', 'Sofía Ramírez', 'Carlos Rodríguez',
  'Lucía Fernández', 'Diego Martínez', 'Valentina López', 'Federico Acosta',
  'Camila Suárez', 'Mateo Castro', 'Julieta Romero', 'Tomás Aguirre'
];

// Aproximadas a barrios de San Martín de los Andes
const ADDRESSES = [
  { addr: 'Av. San Martín 850, Centro',                    lat: -40.1573, lng: -71.3530 },
  { addr: 'Calle Las Lengas 412, Vega Maipú',              lat: -40.1462, lng: -71.3452 },
  { addr: 'Pueyrredón 1240, Centro',                       lat: -40.1598, lng: -71.3504 },
  { addr: 'Los Pioneros 30, Las Pendientes',               lat: -40.1657, lng: -71.3782 },
  { addr: 'Capitán Drury 875, Barrio Norte',               lat: -40.1518, lng: -71.3490 },
  { addr: 'Ruta 40 km 2228, Vega Plana',                   lat: -40.1510, lng: -71.3289 },
  { addr: 'Coronel Pérez 950, Centro',                     lat: -40.1602, lng: -71.3548 },
  { addr: 'Mariano Moreno 760, Barrio La Vega',            lat: -40.1455, lng: -71.3440 },
  { addr: 'Roca 540, Costanera',                           lat: -40.1620, lng: -71.3580 },
  { addr: 'Belgrano 1100, Pueblo Sur',                     lat: -40.1685, lng: -71.3470 },
  { addr: 'Almirante Brown 280, Plumas Verdes',            lat: -40.1430, lng: -71.3360 },
  { addr: 'Lago Lolog s/n, Cabañas Lolog',                 lat: -40.0925, lng: -71.3490 }
];

const ITEM_POOL = [
  { name: 'Milanesa Napolitana',          price: 21500 },
  { name: 'Milanesa',                     price: 18000 },
  { name: 'Bife de Chorizo (300grs)',     price: 25000 },
  { name: 'Bife de Chorizo a lo Pobre',   price: 29000 },
  { name: 'Pechuga Grillada',             price: 21000 },
  { name: 'Suprema Napolitana',           price: 21500 },
  { name: 'Tallarines al Huevo',          price: 16000 },
  { name: 'Ñoquis',                       price: 16000 },
  { name: 'Tarta de Jamón y Queso',       price:  9500 },
  { name: 'Tarta de Espinaca',            price:  9500 },
  { name: 'Ensalada César',               price: 14000 },
  { name: 'Ensalada Completa',            price: 13500 },
  { name: 'Promo: Tarta + Ensalada',      price: 13000 },
  { name: 'Plato del Día',                price: 15000 },
  { name: 'Flan',                         price:  4000 },
  { name: 'Coca-Cola 500cc',              price:  4000 }
];

// Deterministic pseudo-random so the data is stable between renders
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(7438);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

function generateOrders(clientIndex, count) {
  const orders = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    // Spread over last 60 days
    const daysAgo = Math.floor(rng() * 60);
    const date = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
    date.setHours(11 + Math.floor(rng() * 4), Math.floor(rng() * 60));

    const numItems = 1 + Math.floor(rng() * 3);
    const items = [];
    let total = 0;
    for (let j = 0; j < numItems; j++) {
      const it = pick(ITEM_POOL);
      const qty = 1 + Math.floor(rng() * 2);
      items.push({ name: it.name, qty, price: it.price });
      total += it.price * qty;
    }
    orders.push({
      id: `o-${clientIndex}-${i}`,
      date: date.toISOString(),
      items,
      total,
      type: rng() > 0.4 ? 'Delivery' : 'Retiro en local',
      payment: rng() > 0.55 ? 'Efectivo' : 'Transferencia'
    });
  }
  return orders.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export const FAKE_CLIENTS = NAMES.map((name, i) => {
  const orderCount = 1 + Math.floor(rng() * 15);
  const orders = generateOrders(i, orderCount);
  const totalSpent = orders.reduce((s, o) => s + o.total, 0);
  return {
    id: `c-${i}`,
    name,
    phone: '2944' + (200000 + Math.floor(rng() * 800000)),
    addr: ADDRESSES[i].addr,
    lat: ADDRESSES[i].lat,
    lng: ADDRESSES[i].lng,
    orders,
    totalOrders: orders.length,
    totalSpent,
    lastOrder: orders[0]?.date || null,
    favoriteItem: (() => {
      const count = {};
      orders.forEach((o) => o.items.forEach((it) => { count[it.name] = (count[it.name] || 0) + it.qty; }));
      const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
      return sorted[0]?.[0] || '—';
    })()
  };
});

// Aggregations for stats
export function buildStats(clients) {
  const allOrders = clients.flatMap((c) => c.orders.map((o) => ({ ...o, clientId: c.id, lat: c.lat, lng: c.lng })));

  // Top items
  const itemCount = {};
  const itemRevenue = {};
  allOrders.forEach((o) => o.items.forEach((it) => {
    itemCount[it.name] = (itemCount[it.name] || 0) + it.qty;
    itemRevenue[it.name] = (itemRevenue[it.name] || 0) + it.qty * it.price;
  }));
  const topItems = Object.entries(itemCount)
    .map(([name, qty]) => ({ name, qty, revenue: itemRevenue[name] }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);

  // Delivery vs Retiro
  const byType = allOrders.reduce((acc, o) => { acc[o.type] = (acc[o.type] || 0) + 1; return acc; }, {});
  const typeData = Object.entries(byType).map(([name, value]) => ({ name, value }));

  // Pago
  const byPay = allOrders.reduce((acc, o) => { acc[o.payment] = (acc[o.payment] || 0) + 1; return acc; }, {});
  const payData = Object.entries(byPay).map(([name, value]) => ({ name, value }));

  // Sales over last 14 days
  const days = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push({ date: d, label: `${d.getDate()}/${d.getMonth() + 1}`, sales: 0, orders: 0 });
  }
  allOrders.forEach((o) => {
    const od = new Date(o.date); od.setHours(0, 0, 0, 0);
    const found = days.find((d) => d.date.getTime() === od.getTime());
    if (found) { found.sales += o.total; found.orders += 1; }
  });

  // Hour distribution
  const hourBuckets = Array.from({ length: 24 }, (_, h) => ({ hour: `${String(h).padStart(2, '0')}h`, orders: 0 }));
  allOrders.forEach((o) => {
    const h = new Date(o.date).getHours();
    hourBuckets[h].orders += 1;
  });
  const hourData = hourBuckets.filter((_, h) => h >= 10 && h <= 16); // solo horario operativo

  // Heat points (lat,lng,intensity)
  const heatPoints = clients.map((c) => ({ lat: c.lat, lng: c.lng, count: c.totalOrders, name: c.name }));

  // Resumen
  const totalRevenue = allOrders.reduce((s, o) => s + o.total, 0);
  const totalOrders = allOrders.length;
  const avgTicket = totalOrders ? Math.round(totalRevenue / totalOrders) : 0;

  return { topItems, typeData, payData, salesByDay: days, hourData, heatPoints, totalRevenue, totalOrders, avgTicket };
}
