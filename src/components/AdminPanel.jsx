import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { loadMenuData, saveMenuToSupabase, resetMenuData, getBundledMenuData } from '../utils/menuData.js';
import { compressImage, formatBytes } from '../utils/imageCompress.js';
import { supabase, supabaseEnabled } from '../utils/supabaseClient.js';
import { itemPhotoUrl } from '../utils/itemPhotos.js';
import { shareMenuDelDia } from '../utils/share.js';

// Lazy load — these pull in recharts + leaflet which would bloat the client bundle
const ClientesSection = lazy(() => import('./admin/ClientesSection.jsx'));
const StatsSection    = lazy(() => import('./admin/StatsSection.jsx'));

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function slugify(str) {
  return String(str || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    .slice(0, 40) || 'item-' + Date.now().toString(36);
}

function uniqueId(base, taken) {
  let id = base || ('item-' + Date.now().toString(36));
  if (!taken.has(id)) return id;
  let i = 2;
  while (taken.has(`${id}-${i}`)) i++;
  return `${id}-${i}`;
}

const SECTIONS = {
  dashboard: { title: 'Administración' },
  notif:     { title: '📢 Enviar notificación' },
  menu:      { title: '🍽️ Editar menú' },
  business:  { title: '🏢 Mi negocio' },
  clientes:  { title: '👥 Clientes' },
  stats:     { title: '📊 Estadísticas' }
};

export default function AdminPanel({ onExit, onSaved }) {
  const [section, setSection] = useState('dashboard');
  const [menuView, setMenuView] = useState('chat'); // 'chat' | 'full'
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  // Chat flow internal state
  const [chatStep, setChatStep] = useState('home'); // home | modify-pick | modify-field | modify-edit
  const [chatItem, setChatItem] = useState(null); // { catIdx, itemIdx }
  const [chatField, setChatField] = useState(null); // 'name' | 'price' | 'description' | 'photo'
  const [chatSearch, setChatSearch] = useState('');
  const resetChat = () => { setChatStep('home'); setChatItem(null); setChatField(null); setChatSearch(''); };
  const [data, setData] = useState(() => structuredClone(loadMenuData()));
  const [savedFlash, setSavedFlash] = useState(false);
  const [query, setQuery] = useState('');
  const [photoBusy, setPhotoBusy] = useState(null); // item key while compressing
  const fileInputRef = useRef(null);

  // ---------- Send-notification state ----------
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody]   = useState('');
  const [notifPicked, setNotifPicked] = useState([]); // array of item ids
  const [notifSending, setNotifSending] = useState(false);
  const [notifResult, setNotifResult]   = useState(null);
  const [notifHistory, setNotifHistory] = useState([]);

  // Flatten items for picker
  const allItems = useMemo(() => {
    const out = [];
    data.categories.forEach((cat) => {
      cat.items.forEach((it) => out.push({ ...it, categoryId: cat.id, categoryName: cat.name }));
    });
    return out;
  }, [data]);

  const filteredItemsForNotif = useMemo(() => {
    const q = notifBody.trim().toLowerCase();
    // No query needed; pick UI uses its own filter
    return allItems;
  }, [allItems]);

  // Load history when Supabase is configured
  useEffect(() => {
    if (!supabaseEnabled) return;
    (async () => {
      const { data: rows, error } = await supabase
        .from('notifications')
        .select('id, title, body, items, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      if (!error && Array.isArray(rows)) setNotifHistory(rows);
    })();
  }, [notifSending]);

  const toggleNotifItem = (id) => {
    setNotifPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const sendNotification = async () => {
    setNotifResult(null);
    if (!supabaseEnabled) {
      setNotifResult({ ok: false, msg: 'Supabase no está configurado. Falta VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.' });
      return;
    }
    if (!notifTitle.trim()) {
      setNotifResult({ ok: false, msg: 'El título es obligatorio.' });
      return;
    }
    setNotifSending(true);
    const itemsPayload = notifPicked
      .map((id) => allItems.find((x) => x.id === id))
      .filter(Boolean)
      .map((it) => ({
        id: it.id,
        name: it.name,
        price: it.price,
        photo: it.photo || itemPhotoUrl(it.id, 120, 120),
        categoryId: it.categoryId
      }));

    // 1) Insert into notifications table (triggers Realtime for OPEN apps)
    const { error } = await supabase.from('notifications').insert({
      title: notifTitle.trim(),
      body: notifBody.trim() || null,
      items: itemsPayload.length > 0 ? itemsPayload : null,
      sound: true
    });
    if (error) {
      setNotifSending(false);
      setNotifResult({ ok: false, msg: 'Error al enviar: ' + error.message });
      return;
    }

    // 2) Invoke Edge Function send-push to push to CLOSED apps via VAPID
    const heroImage = itemsPayload.find((i) => i.photo && !i.photo.startsWith('https://loremflickr'))?.photo
      || itemsPayload[0]?.photo
      || null;
    let pushReport = '';
    try {
      const { data: pushData, error: pushError } = await supabase.functions.invoke('send-push', {
        body: {
          title: notifTitle.trim(),
          body: notifBody.trim() || null,
          items: itemsPayload.length > 0 ? itemsPayload : null,
          image: heroImage,
          url: '/#menu-del-dia'
        }
      });
      if (pushError) {
        pushReport = ` (push: error — ${pushError.message || 'edge function falló'})`;
      } else if (pushData) {
        pushReport = ` (push: ${pushData.sent || 0}/${pushData.total || 0})`;
      }
    } catch (e) {
      pushReport = ' (push: edge function no disponible)';
    }

    setNotifSending(false);
    setNotifResult({ ok: true, msg: `✓ Enviada a clientes conectados${pushReport}` });
    setNotifTitle('');
    setNotifBody('');
    setNotifPicked([]);
    setTimeout(() => setNotifResult(null), 6000);
  };

  const useTemplateMenuDelDia = () => {
    const menuCat = data.categories.find((c) => c.id === 'menu-del-dia');
    const items = menuCat?.items || [];
    const itemNames = items.map((i) => i.name).join(', ');
    setNotifTitle('🍽️ Menú del Día — 15% OFF');
    setNotifBody(
      itemNames
        ? `Hoy: ${itemNames}. ¡Pedilo YA con 15% de descuento!`
        : 'Ahora tenés un 15% de descuento en el Menú del Día. ¡Pedilo YA!'
    );
    if (items.length > 0) setNotifPicked(items.map((i) => i.id));
  };

  const clearNotifForm = () => {
    setNotifTitle('');
    setNotifBody('');
    setNotifPicked([]);
    setNotifResult(null);
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filteredCategories = useMemo(() => {
    return data.categories.map((cat, catIdx) => {
      if (!normalizedQuery) {
        return { cat, catIdx, show: true, itemIds: null };
      }
      const catMatches = cat.name.toLowerCase().includes(normalizedQuery);
      const matchingIds = new Set();
      cat.items.forEach((it) => {
        if (
          it.name.toLowerCase().includes(normalizedQuery) ||
          (it.description || '').toLowerCase().includes(normalizedQuery)
        ) matchingIds.add(it.id);
      });
      return {
        cat,
        catIdx,
        show: catMatches || matchingIds.size > 0,
        itemIds: catMatches ? null : matchingIds
      };
    });
  }, [data, normalizedQuery]);

  const updateData = (mutator) => {
    setData((cur) => {
      const next = structuredClone(cur);
      mutator(next);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    const { ok, error } = await saveMenuToSupabase(data);
    setSaving(false);
    if (!ok) {
      setSaveError(error || 'Error al guardar');
      setTimeout(() => setSaveError(null), 5000);
      return;
    }
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2500);
    if (onSaved) onSaved();
  };

  const reset = () => {
    if (!confirm('¿Descartar todos los cambios locales y volver al menú original?')) return;
    resetMenuData();
    setData(structuredClone(getBundledMenuData()));
    if (onSaved) onSaved();
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu-data.json';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const importJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed.business || !Array.isArray(parsed.categories)) {
          alert('El archivo no parece un menu-data.json válido (falta business o categories).');
          return;
        }
        setData(parsed);
      } catch (err) {
        alert('No pude leer el archivo: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ---------- Categories ----------
  const addCategory = () => {
    updateData((d) => {
      const id = uniqueId('cat-' + Date.now().toString(36), new Set(d.categories.map((c) => c.id)));
      d.categories.push({ id, name: 'Nueva categoría', icon: '🍴', items: [] });
    });
  };

  const removeCategory = (idx) => {
    if (!confirm('¿Eliminar esta categoría y todos sus platos?')) return;
    updateData((d) => { d.categories.splice(idx, 1); });
  };

  const moveCategory = (idx, dir) => {
    updateData((d) => {
      const swap = idx + dir;
      if (swap < 0 || swap >= d.categories.length) return;
      const [c] = d.categories.splice(idx, 1);
      d.categories.splice(swap, 0, c);
    });
  };

  // ---------- Items ----------
  const addItem = (catIdx) => {
    updateData((d) => {
      const taken = new Set(d.categories.flatMap((c) => c.items.map((i) => i.id)));
      const id = uniqueId('item-' + Date.now().toString(36), taken);
      d.categories[catIdx].items.push({ id, name: 'Nuevo plato', price: 0, description: '' });
    });
  };

  const removeItem = (catIdx, itemIdx) => {
    if (!confirm('¿Eliminar este plato?')) return;
    updateData((d) => { d.categories[catIdx].items.splice(itemIdx, 1); });
  };

  const moveItem = (catIdx, itemIdx, dir) => {
    updateData((d) => {
      const items = d.categories[catIdx].items;
      const swap = itemIdx + dir;
      if (swap < 0 || swap >= items.length) return;
      const [it] = items.splice(itemIdx, 1);
      items.splice(swap, 0, it);
    });
  };

  // ---------- Photo per item ----------
  const handlePhotoPick = async (catIdx, itemIdx, file) => {
    if (!file) return;
    const key = `${catIdx}-${itemIdx}`;
    setPhotoBusy(key);
    try {
      const { dataUrl, width, height, bytes } = await compressImage(file, {
        maxWidth: 700, maxHeight: 700, quality: 0.78
      });
      updateData((d) => {
        d.categories[catIdx].items[itemIdx].photo = dataUrl;
        d.categories[catIdx].items[itemIdx].photoMeta = { width, height, bytes };
      });
    } catch (err) {
      alert('No pude procesar la imagen: ' + err.message);
    } finally {
      setPhotoBusy(null);
    }
  };

  const removePhoto = (catIdx, itemIdx) => {
    updateData((d) => {
      delete d.categories[catIdx].items[itemIdx].photo;
      delete d.categories[catIdx].items[itemIdx].photoMeta;
    });
  };

  // ---------- Extras within item ----------
  const ensureExtras = (item) => { if (!Array.isArray(item.extras)) item.extras = []; };

  const addExtra = (catIdx, itemIdx) => {
    updateData((d) => {
      const it = d.categories[catIdx].items[itemIdx];
      ensureExtras(it);
      it.extras.push({ label: 'Nueva opción', options: ['Opción 1'], required: false });
    });
  };
  const removeExtra = (catIdx, itemIdx, exIdx) => {
    updateData((d) => { d.categories[catIdx].items[itemIdx].extras.splice(exIdx, 1); });
  };

  // ---------- Render ----------
  // ===== Dashboard view =====
  if (section === 'dashboard') {
    return (
      <div className="admin">
        <header className="admin__header">
          <h1>Administración</h1>
          <div className="admin__actions">
            <button className="btn-secondary" onClick={onExit}>← Volver a la app</button>
          </div>
        </header>

        <div className="dash-grid">
          <button className="dash-card dash-card--notif" onClick={() => setSection('notif')}>
            <div className="dash-card__icon">📢</div>
            <div className="dash-card__title">Enviar notificación</div>
            <div className="dash-card__hint">A todos los clientes conectados</div>
          </button>

          <button className="dash-card dash-card--menu" onClick={() => setSection('menu')}>
            <div className="dash-card__icon">🍽️</div>
            <div className="dash-card__title">Editar menú online</div>
            <div className="dash-card__hint">Platos, precios, fotos, horarios</div>
          </button>

          <button className="dash-card dash-card--clients" onClick={() => setSection('clientes')}>
            <div className="dash-card__icon">👥</div>
            <div className="dash-card__title">Clientes</div>
            <div className="dash-card__hint">Nombres, teléfonos, historial</div>
          </button>

          <button className="dash-card dash-card--stats" onClick={() => setSection('stats')}>
            <div className="dash-card__icon">📊</div>
            <div className="dash-card__title">Estadísticas</div>
            <div className="dash-card__hint">Platos más pedidos y métricas</div>
          </button>

          <button className="dash-card dash-card--business" onClick={() => setSection('business')}>
            <div className="dash-card__icon">🏢</div>
            <div className="dash-card__title">Mi negocio</div>
            <div className="dash-card__hint">Datos, dirección, horarios, contactos</div>
          </button>
        </div>
      </div>
    );
  }

  // ===== Mi Negocio (datos del local + horarios) =====
  if (section === 'business') {
    return (
      <div className="admin">
        <header className="admin__header">
          <h1>{SECTIONS.business.title}</h1>
          <div className="admin__actions">
            <button className="btn-secondary" onClick={() => setSection('dashboard')}>← Volver</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : savedFlash ? '✓ Publicado en vivo' : 'Guardar'}</button>
          </div>
        </header>

        <section className="admin__section">
          <h2>Datos del local</h2>
          <div className="admin__grid admin__grid--2">
            <label>Nombre
              <input value={data.business.name} onChange={(e) => updateData((d) => { d.business.name = e.target.value; })} />
            </label>
            <label>Slogan
              <input value={data.business.slogan} onChange={(e) => updateData((d) => { d.business.slogan = e.target.value; })} />
            </label>
            <label>Dirección
              <input value={data.business.address} onChange={(e) => updateData((d) => { d.business.address = e.target.value; })} />
            </label>
            <label>Teléfono (display)
              <input value={data.business.phone} onChange={(e) => updateData((d) => { d.business.phone = e.target.value; })} />
            </label>
            <label>WhatsApp (intl, ej. 5492944208323)
              <input value={data.business.whatsapp} onChange={(e) => updateData((d) => { d.business.whatsapp = e.target.value; })} />
            </label>
            <label>Instagram (sin @)
              <input value={data.business.instagram} onChange={(e) => updateData((d) => { d.business.instagram = e.target.value; })} />
            </label>
            <label>Horario delivery (texto)
              <input value={data.business.hours.delivery} onChange={(e) => updateData((d) => { d.business.hours.delivery = e.target.value; })} />
            </label>
            <label>Horario mostrador (texto)
              <input value={data.business.hours.mostrador} onChange={(e) => updateData((d) => { d.business.hours.mostrador = e.target.value; })} />
            </label>
          </div>
        </section>

        <section className="admin__section">
          <h2>Horarios estructurados</h2>
          {['delivery', 'mostrador'].map((service) => (
            <div key={service} className="admin__schedule">
              <h3>{service === 'delivery' ? '🛵 Delivery' : '🏪 Mostrador'}</h3>
              <div className="admin__days">
                {DAYS.map((d, i) => {
                  const enabled = data.business.schedule[service].days.includes(i);
                  return (
                    <label key={d} className={`day-chip ${enabled ? 'on' : ''}`}>
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => updateData((nd) => {
                          const arr = nd.business.schedule[service].days;
                          if (e.target.checked) { if (!arr.includes(i)) arr.push(i); }
                          else { nd.business.schedule[service].days = arr.filter((x) => x !== i); }
                          nd.business.schedule[service].days.sort();
                        })}
                      />
                      {d}
                    </label>
                  );
                })}
              </div>
              <div className="admin__grid admin__grid--2">
                <label>Apertura
                  <input type="time" value={data.business.schedule[service].open}
                    onChange={(e) => updateData((d) => { d.business.schedule[service].open = e.target.value; })} />
                </label>
                <label>Cierre
                  <input type="time" value={data.business.schedule[service].close}
                    onChange={(e) => updateData((d) => { d.business.schedule[service].close = e.target.value; })} />
                </label>
              </div>
            </div>
          ))}
        </section>

        <div className="admin__sticky-save">
          <button className="btn-primary" onClick={save}>{saving ? 'Guardando…' : savedFlash ? '✓ Publicado en vivo' : '💾 Guardar Mi Negocio'}</button>
        </div>
      </div>
    );
  }

  // ===== Clientes / Stats (lazy-loaded) =====
  if (section === 'clientes') {
    return (
      <div className="admin">
        <header className="admin__header">
          <h1>{SECTIONS.clientes.title}</h1>
          <div className="admin__actions">
            <button className="btn-secondary" onClick={() => setSection('dashboard')}>← Volver</button>
          </div>
        </header>
        <Suspense fallback={<div className="admin__placeholder"><p>Cargando…</p></div>}>
          <ClientesSection />
        </Suspense>
      </div>
    );
  }

  if (section === 'stats') {
    return (
      <div className="admin">
        <header className="admin__header">
          <h1>{SECTIONS.stats.title}</h1>
          <div className="admin__actions">
            <button className="btn-secondary" onClick={() => setSection('dashboard')}>← Volver</button>
          </div>
        </header>
        <Suspense fallback={<div className="admin__placeholder"><p>Cargando gráficos y mapa…</p></div>}>
          <StatsSection />
        </Suspense>
      </div>
    );
  }

  // ===== Notif + Menu sections (mantienen el código actual) =====
  return (
    <div className="admin">
      <header className="admin__header">
        <h1>{SECTIONS[section].title}</h1>
        <div className="admin__actions">
          <button className="btn-secondary" onClick={() => setSection('dashboard')}>← Volver</button>
          {section === 'menu' && (
            <button className="btn-primary" onClick={save}>
              {saving ? 'Guardando…' : savedFlash ? '✓ Publicado en vivo' : 'Guardar cambios'}
            </button>
          )}
        </div>
      </header>

      {saveError && (
        <div className="admin__warning" style={{ background: 'rgba(255, 107, 107, 0.12)', borderColor: '#ff6b6b', color: '#ff8a6b' }}>
          ❌ Error al publicar: {saveError}
        </div>
      )}

      {section === 'menu' && menuView === 'chat' && (() => {
        const menuCat = data.categories.find((c) => c.id === 'menu-del-dia');
        const menuCatIdx = data.categories.findIndex((c) => c.id === 'menu-del-dia');
        return (
          <div className="menu-chat">
            <div className="bubble bubble--pip">
              <img src="/logo-icon.svg" alt="" className="bubble__avatar" />
              <div className="bubble__body">
                ¡Hola! ¿Qué querés hacer hoy con el menú?
              </div>
            </div>

            <div className="menu-chat__primary">
              <div className="menu-chat__primary-label">📅 EDITAR MENÚ DEL DÍA</div>
              {menuCat && menuCat.items.length > 0 ? (
                <div className="mdd-items">
                  {menuCat.items.map((it, ii) => (
                    <div className="mdd-item" key={it.id}>
                      <div className="mdd-item__row">
                        <label className="mdd-field">
                          <span>Nombre</span>
                          <input
                            value={it.name}
                            onChange={(e) => updateData((d) => { d.categories[menuCatIdx].items[ii].name = e.target.value; })}
                          />
                        </label>
                        <label className="mdd-field mdd-field--price">
                          <span>Precio</span>
                          <input
                            type="number" min="0" step="100"
                            value={it.price}
                            onChange={(e) => updateData((d) => { d.categories[menuCatIdx].items[ii].price = Number(e.target.value) || 0; })}
                          />
                        </label>
                      </div>
                      <label className="mdd-field">
                        <span>Descripción</span>
                        <textarea
                          rows={2}
                          value={it.description || ''}
                          onChange={(e) => updateData((d) => { d.categories[menuCatIdx].items[ii].description = e.target.value; })}
                        />
                      </label>
                      <div className="mdd-photo">
                        {it.photo
                          ? <img src={it.photo} alt="" />
                          : <span className="mdd-photo__empty">Sin foto</span>}
                        <label className="btn-secondary mdd-photo-btn">
                          {photoBusy === `${menuCatIdx}-${ii}` ? 'Procesando…' : (it.photo ? 'Cambiar foto' : '📷 Subir foto')}
                          <input
                            type="file" accept="image/*" hidden
                            disabled={photoBusy === `${menuCatIdx}-${ii}`}
                            onChange={(e) => { const f = e.target.files?.[0]; handlePhotoPick(menuCatIdx, ii, f); e.target.value = ''; }}
                          />
                        </label>
                        <button className="btn-danger admin__small" onClick={() => removeItem(menuCatIdx, ii)}>Quitar</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No hay platos en el Menú del Día todavía.</p>
              )}
              <button className="btn-primary mdd-add" onClick={() => addItem(menuCatIdx)}>
                + Agregar plato al Menú del Día
              </button>
              <button className="btn-primary" onClick={save} style={{ marginTop: 8, width: '100%' }}>
                {saving ? 'Guardando…' : savedFlash ? '✓ Publicado en vivo' : '💾 Guardar Menú del Día'}
              </button>
              <button
                className="btn-secondary"
                style={{ marginTop: 8, width: '100%' }}
                onClick={async () => {
                  const res = await shareMenuDelDia(menuCat?.items || []);
                  if (res.via === 'clipboard') alert('✓ Link copiado al portapapeles');
                }}
              >
                📤 Compartir Plato del Día
              </button>
              <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 8 }}>
                🟢 Modo en vivo: los cambios se publican al instante a todos los clientes.
              </p>
            </div>

            {chatStep === 'home' && (
              <>
                <div className="bubble bubble--pip">
                  <img src="/logo-icon.svg" alt="" className="bubble__avatar" />
                  <div className="bubble__body">¿Querés tocar algo más?</div>
                </div>

                <div className="menu-chat__choices">
                  <button className="choice-btn" onClick={() => setChatStep('modify-pick')}>
                    ✏️ Modificar plato existente
                  </button>
                  <button className="choice-btn" onClick={() => setMenuView('full')}>
                    ➕ Agregar plato / categoría
                  </button>
                  <button className="choice-btn" onClick={() => setMenuView('full')}>
                    📁 Exportar / Importar JSON
                  </button>
                </div>
              </>
            )}

            {chatStep === 'modify-pick' && (() => {
              const q = chatSearch.trim().toLowerCase();
              const flat = data.categories.flatMap((c, ci) =>
                c.items.map((it, ii) => ({ ...it, ci, ii, catName: c.name }))
              );
              const filtered = q
                ? flat.filter((it) => it.name.toLowerCase().includes(q) || it.catName.toLowerCase().includes(q))
                : flat;
              return (
                <>
                  <div className="bubble bubble--pip">
                    <img src="/logo-icon.svg" alt="" className="bubble__avatar" />
                    <div className="bubble__body">¿Qué plato querés modificar? Buscalo o tocalo de la lista.</div>
                  </div>
                  <div className="chat-form">
                    <input
                      type="search"
                      value={chatSearch}
                      onChange={(e) => setChatSearch(e.target.value)}
                      placeholder="Buscar plato..."
                    />
                    <div className="chat-pick-list">
                      {filtered.slice(0, 30).map((it) => (
                        <button
                          key={`${it.ci}-${it.ii}`}
                          className="chat-pick-item"
                          onClick={() => { setChatItem({ catIdx: it.ci, itemIdx: it.ii }); setChatStep('modify-field'); }}
                        >
                          <span className="chat-pick-item__cat">{it.catName}</span>
                          <span className="chat-pick-item__name">{it.name}</span>
                          <span className="chat-pick-item__price">${(it.price || 0).toLocaleString('es-AR')}</span>
                        </button>
                      ))}
                      {filtered.length === 0 && <p className="muted" style={{ padding: '12px', textAlign: 'center' }}>Ningún plato coincide.</p>}
                    </div>
                    <button className="btn-secondary" onClick={resetChat}>← Volver</button>
                  </div>
                </>
              );
            })()}

            {chatStep === 'modify-field' && chatItem && (() => {
              const it = data.categories[chatItem.catIdx]?.items[chatItem.itemIdx];
              if (!it) { resetChat(); return null; }
              return (
                <>
                  <div className="bubble bubble--user">
                    <div className="bubble__body">{it.name}</div>
                  </div>
                  <div className="bubble bubble--pip">
                    <img src="/logo-icon.svg" alt="" className="bubble__avatar" />
                    <div className="bubble__body">¿Qué querés cambiar de <strong>{it.name}</strong>?</div>
                  </div>
                  <div className="menu-chat__choices">
                    <button className="choice-btn" onClick={() => setChatField('name')}>✏️ Nombre</button>
                    <button className="choice-btn" onClick={() => setChatField('price')}>💰 Precio (${(it.price || 0).toLocaleString('es-AR')})</button>
                    <button className="choice-btn" onClick={() => setChatField('description')}>📝 Descripción</button>
                    <button className="choice-btn" onClick={() => setChatField('photo')}>📷 Foto</button>
                  </div>
                  {chatField && (
                    <div className="chat-form" style={{ marginTop: 8 }}>
                      {chatField === 'name' && (
                        <>
                          <input
                            type="text" value={it.name}
                            onChange={(e) => updateData((d) => { d.categories[chatItem.catIdx].items[chatItem.itemIdx].name = e.target.value; })}
                          />
                          <button className="btn-primary" onClick={() => { save(); setChatField(null); }}>💾 Guardar nombre</button>
                        </>
                      )}
                      {chatField === 'price' && (
                        <>
                          <input
                            type="number" min="0" step="100" value={it.price}
                            onChange={(e) => updateData((d) => { d.categories[chatItem.catIdx].items[chatItem.itemIdx].price = Number(e.target.value) || 0; })}
                          />
                          <button className="btn-primary" onClick={() => { save(); setChatField(null); }}>💾 Guardar precio</button>
                        </>
                      )}
                      {chatField === 'description' && (
                        <>
                          <textarea
                            rows={3} value={it.description || ''}
                            onChange={(e) => updateData((d) => { d.categories[chatItem.catIdx].items[chatItem.itemIdx].description = e.target.value; })}
                          />
                          <button className="btn-primary" onClick={() => { save(); setChatField(null); }}>💾 Guardar descripción</button>
                        </>
                      )}
                      {chatField === 'photo' && (
                        <div className="mdd-photo">
                          {it.photo
                            ? <img src={it.photo} alt="" />
                            : <span className="mdd-photo__empty">Sin foto</span>}
                          <label className="btn-secondary mdd-photo-btn">
                            {photoBusy === `${chatItem.catIdx}-${chatItem.itemIdx}` ? 'Procesando…' : (it.photo ? 'Cambiar foto' : '📷 Subir foto')}
                            <input
                              type="file" accept="image/*" hidden
                              disabled={photoBusy === `${chatItem.catIdx}-${chatItem.itemIdx}`}
                              onChange={(e) => { const f = e.target.files?.[0]; handlePhotoPick(chatItem.catIdx, chatItem.itemIdx, f); e.target.value = ''; }}
                            />
                          </label>
                          {it.photo && (
                            <button className="btn-danger admin__small" onClick={() => removePhoto(chatItem.catIdx, chatItem.itemIdx)}>Quitar</button>
                          )}
                          <button className="btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={() => { save(); setChatField(null); }}>💾 Guardar foto</button>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="chat-form" style={{ marginTop: 12 }}>
                    <button
                      className="btn-danger"
                      onClick={() => {
                        if (confirm(`¿Eliminar "${it.name}" del menú?`)) {
                          removeItem(chatItem.catIdx, chatItem.itemIdx);
                          save();
                          resetChat();
                        }
                      }}
                    >
                      🗑️ Eliminar este plato del menú
                    </button>
                    <button className="btn-secondary" onClick={() => { setChatField(null); setChatStep('modify-pick'); setChatItem(null); }}>← Elegir otro plato</button>
                    <button className="btn-secondary" onClick={resetChat}>← Volver al inicio</button>
                  </div>
                </>
              );
            })()}
          </div>
        );
      })()}

      {section === 'menu' && menuView === 'full' && <>
      <div className="admin__btn-row" style={{ marginBottom: 12 }}>
        <button className="btn-secondary" onClick={() => setMenuView('chat')}>← Volver al menú simple</button>
      </div>
      <div className="admin__warning" style={{ background: 'rgba(74, 222, 128, 0.08)', borderColor: 'rgba(74, 222, 128, 0.4)' }}>
        🟢 <strong>Modo en vivo activo.</strong> Cualquier cambio que guardes se publica al
        instante a todos los clientes conectados (sin que tengan que refrescar).
        Exportar/Importar JSON queda como backup opcional.
      </div>

      <section className="admin__section">
        <h2>Archivo</h2>
        <div className="admin__btn-row">
          <button className="btn-secondary" onClick={exportJson}>⬇ Exportar JSON</button>
          <button className="btn-secondary" onClick={() => fileInputRef.current.click()}>⬆ Importar JSON</button>
          <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={importJson} hidden />
          <button className="btn-danger" onClick={reset}>↺ Restaurar original</button>
        </div>
      </section>

      <p className="muted" style={{ fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
        Los datos del negocio y horarios se editan en <strong>🏢 Mi negocio</strong> (dashboard).
      </p>

      </>}

      {section === 'notif' && (
      <section className="admin__section admin__section--notif">
        <div className="admin__section-header">
          <h2>📢 Enviar notificación en vivo</h2>
        </div>
        {!supabaseEnabled && (
          <div className="admin__warning" style={{ background: 'rgba(255,107,107,0.1)', borderColor: 'rgba(255,107,107,0.4)', color: '#ff8a6b' }}>
            ⚠️ Supabase no configurado. Definí <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> en <code>.env.local</code> (dev) o en Vercel Environment Variables (prod).
          </div>
        )}

        <div className="notif-templates">
          <div className="notif-templates__label">⚡ Atajo</div>
          <button type="button" className="btn-primary notif-template-btn" onClick={useTemplateMenuDelDia}>
            📅 Menú del Día -15% (con los platos de hoy)
          </button>
          <button type="button" className="btn-secondary notif-template-btn" onClick={clearNotifForm}>
            ✨ Personalizada (empezar de cero)
          </button>
        </div>

        <label className="notif-field">
          <span className="notif-field__label">Título <span className="admin__req">*</span></span>
          <input
            type="text"
            value={notifTitle}
            onChange={(e) => setNotifTitle(e.target.value)}
            placeholder="Ej: ¡Promo flash! 20% off en milanesas"
          />
        </label>

        <label className="notif-field">
          <span className="notif-field__label">Mensaje</span>
          <textarea
            rows={3}
            value={notifBody}
            onChange={(e) => setNotifBody(e.target.value)}
            placeholder="Solo hasta las 14hs. Para los Cliente ORO."
          />
        </label>

        <div className="notif-picker">
          <div className="notif-picker__head">
            <strong>Platos a destacar</strong> <span className="admin__pill">{notifPicked.length} seleccionados</span>
          </div>
          <div className="notif-picker__list">
            {allItems.map((it) => (
              <label key={it.id} className={`notif-chip ${notifPicked.includes(it.id) ? 'on' : ''}`}>
                <input type="checkbox" checked={notifPicked.includes(it.id)} onChange={() => toggleNotifItem(it.id)} />
                <span className="notif-chip__cat">{it.categoryName}:</span>
                <span className="notif-chip__name">{it.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="admin__btn-row" style={{ marginTop: 12 }}>
          <button className="btn-primary" onClick={sendNotification} disabled={notifSending || !supabaseEnabled}>
            {notifSending ? 'Enviando…' : '📢 Enviar a todos los conectados'}
          </button>
          {notifResult && (
            <span className={`notif-result ${notifResult.ok ? 'ok' : 'err'}`}>
              {notifResult.msg}
            </span>
          )}
        </div>

        {notifHistory.length > 0 && (
          <details className="admin__history">
            <summary>Historial — últimas {notifHistory.length}</summary>
            <ul className="notif-history">
              {notifHistory.map((n) => (
                <li key={n.id}>
                  <span className="notif-history__time">{new Date(n.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  <span className="notif-history__title">{n.title}</span>
                  {n.body && <span className="notif-history__body">— {n.body}</span>}
                  {Array.isArray(n.items) && n.items.length > 0 && (
                    <span className="notif-history__items">({n.items.length} plato{n.items.length === 1 ? '' : 's'})</span>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
      )}

      {section === 'menu' && menuView === 'full' && <>
      <section className="admin__section">
        <div className="admin__section-header">
          <h2>Categorías y platos</h2>
          <button className="btn-primary" onClick={addCategory}>+ Nueva categoría</button>
        </div>

        <div className="admin__search">
          <input
            type="search"
            placeholder="Buscar plato o categoría…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="admin__search-clear"
              onClick={() => setQuery('')}
              aria-label="Limpiar búsqueda"
            >✕</button>
          )}
        </div>

        {normalizedQuery && filteredCategories.every((f) => !f.show) && (
          <p className="admin__empty">Ningún plato coincide con "{query}".</p>
        )}

        {filteredCategories.map(({ cat, catIdx: ci, show, itemIds }) => {
          if (!show) return null;
          return (
          <details key={cat.id} className="admin__cat" open>
            <summary>
              <span className="admin__cat-icon">{cat.icon}</span>
              <span className="admin__cat-title">{cat.name}</span>
              <span className="admin__cat-count">{cat.items.length} platos</span>
            </summary>

            <div className="admin__grid admin__grid--3">
              <label>Nombre
                <input value={cat.name} onChange={(e) => updateData((d) => { d.categories[ci].name = e.target.value; })} />
              </label>
              <label>Icono (emoji)
                <input value={cat.icon} onChange={(e) => updateData((d) => { d.categories[ci].icon = e.target.value; })} />
              </label>
              <label>ID
                <input value={cat.id} onChange={(e) => updateData((d) => { d.categories[ci].id = slugify(e.target.value); })} />
              </label>
            </div>

            <div className="admin__btn-row">
              <button className="btn-secondary" onClick={() => moveCategory(ci, -1)}>↑ Subir</button>
              <button className="btn-secondary" onClick={() => moveCategory(ci, 1)}>↓ Bajar</button>
              <button className="btn-danger" onClick={() => removeCategory(ci)}>Eliminar categoría</button>
            </div>

            <h4 className="admin__h4">Platos</h4>
            {cat.items.map((it, ii) => {
              if (itemIds && !itemIds.has(it.id)) return null;
              return (
              <div key={it.id} className="admin__item">
                <div className="admin__grid admin__grid--3">
                  <label>Nombre
                    <input value={it.name} onChange={(e) => updateData((d) => { d.categories[ci].items[ii].name = e.target.value; })} />
                  </label>
                  <label>Precio
                    <input type="number" min="0" step="100" value={it.price}
                      onChange={(e) => updateData((d) => { d.categories[ci].items[ii].price = Number(e.target.value) || 0; })} />
                  </label>
                  <label>ID
                    <input value={it.id} onChange={(e) => updateData((d) => { d.categories[ci].items[ii].id = slugify(e.target.value); })} />
                  </label>
                </div>
                <label className="admin__full">Descripción
                  <textarea rows={2} value={it.description || ''}
                    onChange={(e) => updateData((d) => { d.categories[ci].items[ii].description = e.target.value; })} />
                </label>

                <div className="admin__photo">
                  <div className="admin__photo-preview">
                    {it.photo
                      ? <img src={it.photo} alt="" />
                      : <span className="admin__photo-empty">Sin foto</span>}
                  </div>
                  <div className="admin__photo-actions">
                    <label className="btn-secondary admin__photo-upload">
                      {photoBusy === `${ci}-${ii}` ? 'Procesando…' : (it.photo ? 'Cambiar foto' : '📷 Subir foto')}
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        disabled={photoBusy === `${ci}-${ii}`}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          handlePhotoPick(ci, ii, f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {it.photo && (
                      <button type="button" className="btn-danger admin__small" onClick={() => removePhoto(ci, ii)}>
                        Quitar
                      </button>
                    )}
                    {it.photoMeta && (
                      <span className="admin__photo-meta">
                        {it.photoMeta.width}×{it.photoMeta.height} · {formatBytes(it.photoMeta.bytes)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="admin__extras">
                  <div className="admin__extras-head">
                    <strong>Opciones del plato (guarniciones, salsas, aderezos…)</strong>
                    <button className="btn-secondary" onClick={() => addExtra(ci, ii)}>+ Agregar</button>
                  </div>
                  {(it.extras || []).map((ex, ei) => (
                    <div key={ei} className="admin__extra">
                      <div className="admin__grid admin__grid--3">
                        <label>Etiqueta
                          <input value={ex.label}
                            onChange={(e) => updateData((d) => { d.categories[ci].items[ii].extras[ei].label = e.target.value; })} />
                        </label>
                        <label>Opciones (separadas por coma)
                          <input
                            value={(ex.options || []).join(', ')}
                            onChange={(e) => updateData((d) => {
                              d.categories[ci].items[ii].extras[ei].options = e.target.value
                                .split(',').map((s) => s.trim()).filter(Boolean);
                            })}
                          />
                        </label>
                        <label className="admin__inline">
                          <input type="checkbox" checked={!!ex.required}
                            onChange={(e) => updateData((d) => { d.categories[ci].items[ii].extras[ei].required = e.target.checked; })} />
                          Obligatorio
                        </label>
                      </div>
                      <button className="btn-danger admin__small" onClick={() => removeExtra(ci, ii, ei)}>Quitar opción</button>
                    </div>
                  ))}
                </div>

                <div className="admin__btn-row">
                  <button className="btn-secondary" onClick={() => moveItem(ci, ii, -1)}>↑</button>
                  <button className="btn-secondary" onClick={() => moveItem(ci, ii, 1)}>↓</button>
                  <button className="btn-danger" onClick={() => removeItem(ci, ii)}>Eliminar plato</button>
                </div>
              </div>
              );
            })}

            <button className="btn-primary admin__add-item" onClick={() => addItem(ci)}>+ Agregar plato</button>
          </details>
          );
        })}
      </section>

      <div className="admin__sticky-save">
        <button className="btn-primary" onClick={save}>
          {saving ? 'Guardando…' : savedFlash ? '✓ Publicado en vivo' : 'Guardar cambios'}
        </button>
      </div>
      </>}
    </div>
  );
}
