const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function parseHM(s) {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}

function setTime(date, minutes) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutes);
  return d;
}

function minutesOfDay(d) {
  return d.getHours() * 60 + d.getMinutes();
}

// Returns the next slot for one service: { isOpen, opensAt, closesAt }
export function nextSlot(service, now = new Date()) {
  if (!service || !Array.isArray(service.days)) return { isOpen: false, opensAt: null, closesAt: null };
  const openMin = parseHM(service.open);
  const closeMin = parseHM(service.close);
  const nowMin = minutesOfDay(now);
  const todayDow = now.getDay();

  if (service.days.includes(todayDow) && nowMin >= openMin && nowMin < closeMin) {
    return { isOpen: true, opensAt: setTime(now, openMin), closesAt: setTime(now, closeMin) };
  }

  for (let i = 0; i <= 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dow = d.getDay();
    if (!service.days.includes(dow)) continue;
    if (i === 0 && nowMin >= closeMin) continue; // already closed today
    return { isOpen: false, opensAt: setTime(d, openMin), closesAt: setTime(d, closeMin) };
  }
  return { isOpen: false, opensAt: null, closesAt: null };
}

export function getStatus(schedule, now = new Date()) {
  return {
    delivery: nextSlot(schedule?.delivery, now),
    mostrador: nextSlot(schedule?.mostrador, now),
    now
  };
}

export function formatHM(date) {
  if (!date) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatRelative(date, now = new Date()) {
  if (!date) return '';
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const target = new Date(date); target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / 86400000);
  const hm = formatHM(date);
  if (diffDays === 0) return `hoy ${hm}`;
  if (diffDays === 1) return `mañana ${hm}`;
  return `${DAY_SHORT[date.getDay()]} ${hm}`;
}

// Minutes until a date (positive = future)
export function minutesUntil(date, now = new Date()) {
  if (!date) return Infinity;
  return Math.round((date - now) / 60000);
}

// Check if a given Date falls inside the service's open hours
export function isOpenAt(service, date) {
  if (!service || !Array.isArray(service.days) || !date) return false;
  const dow = date.getDay();
  if (!service.days.includes(dow)) return false;
  const mins = date.getHours() * 60 + date.getMinutes();
  return mins >= parseHM(service.open) && mins < parseHM(service.close);
}

// Generate 15-min slots for a single service across the next N days
export function generateSlots(service, now = new Date(), maxSlots = 32, intervalMin = 15, leadMin = 20) {
  if (!service || !Array.isArray(service.days)) return [];
  const openMin = parseHM(service.open);
  const closeMin = parseHM(service.close);
  const out = [];
  for (let off = 0; off < 8 && out.length < maxSlots; off++) {
    const d = new Date(now);
    d.setDate(now.getDate() + off);
    const dow = d.getDay();
    if (!service.days.includes(dow)) continue;
    let start = openMin;
    if (off === 0) {
      const nowMin = minutesOfDay(now) + leadMin;
      start = Math.max(openMin, Math.ceil(nowMin / intervalMin) * intervalMin);
    }
    for (let m = start; m + intervalMin <= closeMin && out.length < maxSlots; m += intervalMin) {
      out.push(setTime(d, m));
    }
  }
  return out;
}
