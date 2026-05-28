import { useEffect, useMemo, useReducer, useState, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { loadMenuData, fetchLiveMenuData, subscribeToMenu } from './utils/menuData.js';
import { incrementVisit, shouldTrigger } from './utils/visitCounter.js';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import StatusBanner from './components/StatusBanner.jsx';
import CategoryNav from './components/CategoryNav.jsx';
import MenuSection from './components/MenuSection.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import InfoSection from './components/InfoSection.jsx';
import JoinChannelModal from './components/JoinChannelModal.jsx';
import NotificationPrompt from './components/NotificationPrompt.jsx';
import IncomingNotification from './components/IncomingNotification.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import {
  notifSupported, notifPermission,
  shouldOfferNotifications, requestNotifPermission,
  showLocalNotification
} from './utils/pwa.js';
import { useNotificationsRealtime } from './utils/useNotificationsRealtime.js';
import { ensurePushSubscription } from './utils/pushSubscribe.js';

const CART_KEY = 'piponpipon_cart_session_v1';

export function makeKey(id, extras) {
  if (!extras || Object.keys(extras).length === 0) return id;
  const parts = Object.keys(extras).sort().map((k) => `${k}:${extras[k]}`);
  return `${id}__${parts.join('|')}`;
}

function loadInitialCart() {
  try {
    const raw = sessionStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const { id, name, price, extras } = action.payload;
      const key = makeKey(id, extras);
      const existing = state.find((i) => i.key === key);
      if (existing) return state.map((i) => (i.key === key ? { ...i, qty: i.qty + 1 } : i));
      return [...state, { key, id, name, price, qty: 1, extras: extras || null }];
    }
    case 'increment': return state.map((i) => (i.key === action.key ? { ...i, qty: i.qty + 1 } : i));
    case 'decrement': return state.map((i) => (i.key === action.key ? { ...i, qty: i.qty - 1 } : i)).filter((i) => i.qty > 0);
    case 'remove':    return state.filter((i) => i.key !== action.key);
    case 'clear':     return [];
    default:          return state;
  }
}

function isAdminHash() {
  return typeof window !== 'undefined' && window.location.hash.replace(/^#\/?/, '').toLowerCase() === 'admin';
}

// Service worker auto-update — checks every 60s while app is open
function useAppUpdate() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, r) {
      if (!r) return;
      setInterval(() => {
        if (r.installing || (navigator && !navigator.onLine)) return;
        r.update();
      }, 60_000);
    }
  });
  return { needRefresh, update: () => updateServiceWorker(true) };
}

export default function App() {
  const { needRefresh, update } = useAppUpdate();
  const [route, setRoute] = useState(() => (isAdminHash() ? 'admin' : 'menu'));
  const [menuData, setMenuData] = useState(() => loadMenuData());
  const [cart, dispatch] = useReducer(cartReducer, undefined, loadInitialCart);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(() => menuData.categories[0]?.id || '');
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinContext, setJoinContext] = useState('welcome');
  const [searchQuery, setSearchQuery] = useState('');
  const [lightbox, setLightbox] = useState(null); // { src, alt } | null
  const [notifPromptOpen, setNotifPromptOpen] = useState(false);
  const [notifState, setNotifState] = useState(() => notifSupported() ? notifPermission() : 'unsupported');
  const [incoming, setIncoming] = useState(null); // notification row from Supabase

  // Realtime: receive admin-sent notifications
  useNotificationsRealtime((notif) => {
    if (route !== 'menu') return; // don't pop on admin panel
    setIncoming(notif);
    showLocalNotification(notif.title || 'Pipón Pipón', {
      body: notif.body || '',
      tag: notif.id,
      requireInteraction: false
    });
  });

  // Hash routing
  useEffect(() => {
    const onHash = () => setRoute(isAdminHash() ? 'admin' : 'menu');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Visit popup — fires every visit (debug). Trigger sequence in visitCounter.js
  useEffect(() => {
    if (route !== 'menu') return;
    const count = incrementVisit();
    if (!shouldTrigger(count)) return;
    const t = setTimeout(() => { setJoinContext('welcome'); setJoinOpen(true); }, 2000);
    return () => clearTimeout(t);
  }, [route]);

  // Persist cart within tab session
  useEffect(() => {
    try { sessionStorage.setItem(CART_KEY, JSON.stringify(cart)); }
    catch { /* ignore */ }
  }, [cart]);

  // Pull live menu from Supabase + subscribe to Realtime updates.
  // When admin saves, all open clients receive the new data instantly.
  useEffect(() => {
    let cancelled = false;
    fetchLiveMenuData().then((live) => {
      if (!cancelled && live) setMenuData(live);
    });
    const unsubscribe = subscribeToMenu((newData) => setMenuData(newData));
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  const itemCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);
  const total     = useMemo(() => cart.reduce((s, i) => s + i.qty * i.price, 0), [cart]);

  const addToCart   = useCallback((payload) => dispatch({ type: 'add', payload }), []);
  const openDrawer  = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const openLightbox  = useCallback((src, alt) => setLightbox({ src, alt }), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  const handleRecipeClick = useCallback(() => {
    setJoinContext('recipe');
    setJoinOpen(true);
  }, []);

  // When the welcome popup closes, offer notifications (only on first time)
  const handleJoinClose = useCallback(() => {
    setJoinOpen(false);
    if (joinContext === 'welcome' && shouldOfferNotifications()) {
      setTimeout(() => setNotifPromptOpen(true), 600);
    }
  }, [joinContext]);

  // Bell click in header: ask permission if 'default', else show status modal
  const handleBellClick = useCallback(async () => {
    const cur = notifPermission();
    if (cur === 'default') {
      const result = await requestNotifPermission();
      setNotifState(result);
      if (result === 'granted') {
        showLocalNotification('🔔 ¡Notificaciones activadas!', {
          body: 'Te avisamos cuando haya nuevas promos exclusivas.'
        });
        // Subscribe to push so the OS notifies even with the app closed
        await ensurePushSubscription();
      }
    } else if (cur === 'granted') {
      // Refresh push subscription in case the server lost it / endpoint rotated
      await ensurePushSubscription();
      showLocalNotification('🔔 Recordatorio', {
        body: 'Tenés notificaciones activadas. Te vamos a avisar cuando haya promos nuevas.'
      });
    } else if (cur === 'denied') {
      alert('Las notificaciones están bloqueadas en tu navegador. Para activarlas, andá a la configuración del sitio y habilitá las notificaciones.');
    }
  }, []);

  // On mount, if permission is already granted, make sure we have a push subscription
  useEffect(() => {
    if (notifState === 'granted') {
      ensurePushSubscription();
    }
  }, [notifState]);

  const scrollToCategory = useCallback((id) => {
    document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Filter categories by search query
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) return menuData.categories;
    return menuData.categories
      .map((cat) => {
        if (cat.name.toLowerCase().includes(normalizedQuery)) return cat;
        const items = cat.items.filter((it) =>
          it.name.toLowerCase().includes(normalizedQuery) ||
          (it.description || '').toLowerCase().includes(normalizedQuery)
        );
        return { ...cat, items };
      })
      .filter((cat) => cat.items.length > 0);
  }, [menuData, normalizedQuery]);

  useEffect(() => {
    if (route !== 'menu') return;
    const sections = filteredCategories
      .map((c) => document.getElementById(`cat-${c.id}`))
      .filter(Boolean);
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveCategory(visible[0].target.id.replace('cat-', ''));
      },
      { rootMargin: '-140px 0px -55% 0px', threshold: [0.05, 0.25, 0.5] }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [route, filteredCategories]);

  if (route === 'admin') {
    return (
      <AdminPanel
        onExit={() => { window.location.hash = ''; }}
        onSaved={() => setMenuData(loadMenuData())}
      />
    );
  }

  return (
    <div className="app">
      <Header
        itemCount={itemCount}
        onCartClick={openDrawer}
        notifState={notifState}
        onBellClick={handleBellClick}
      />
      <StatusBanner schedule={menuData.business.schedule} />
      <Hero query={searchQuery} onQueryChange={setSearchQuery} />
      <CategoryNav
        categories={filteredCategories}
        active={activeCategory}
        onSelect={(id) => { setActiveCategory(id); scrollToCategory(id); }}
      />
      <main className="menu">
        {filteredCategories.length === 0 ? (
          <div className="menu-empty">
            <p>No encontramos platos que coincidan con <strong>"{searchQuery}"</strong></p>
            <button className="btn-secondary" onClick={() => setSearchQuery('')}>Ver todo el menú</button>
          </div>
        ) : filteredCategories.map((cat) => (
          <MenuSection
            key={cat.id}
            category={cat}
            cart={cart}
            onAdd={addToCart}
            onInc={(key) => dispatch({ type: 'increment', key })}
            onDec={(key) => dispatch({ type: 'decrement', key })}
            onPhotoClick={openLightbox}
            onRecipeClick={handleRecipeClick}
          />
        ))}
      </main>
      <InfoSection business={menuData.business} />
      <CartDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        cart={cart}
        total={total}
        whatsapp={menuData.business.whatsapp}
        schedule={menuData.business.schedule}
        hoursLabel={menuData.business.hours}
        onInc={(key) => dispatch({ type: 'increment', key })}
        onDec={(key) => dispatch({ type: 'decrement', key })}
        onRemove={(key) => dispatch({ type: 'remove', key })}
        onClear={() => dispatch({ type: 'clear' })}
      />
      <button
        className={`floating-cart ${itemCount > 0 ? 'visible' : ''}`}
        onClick={openDrawer}
        aria-label="Ver pedido"
      >
        🛒 Ver pedido ({itemCount})
      </button>

      <JoinChannelModal
        open={joinOpen}
        onClose={handleJoinClose}
        context={joinContext}
      />

      <NotificationPrompt
        open={notifPromptOpen}
        onClose={() => setNotifPromptOpen(false)}
        onChange={(result) => setNotifState(result)}
      />

      <IncomingNotification
        notification={incoming}
        onClose={() => setIncoming(null)}
        onOpenCart={openDrawer}
      />

      {needRefresh && (
        <div className="update-banner" role="alert">
          <span>✨ Hay una versión nueva de la app</span>
          <button className="btn-primary" onClick={update}>Actualizar</button>
        </div>
      )}

      {lightbox && (
        <div className="lightbox" onClick={closeLightbox} role="dialog" aria-modal="true">
          <img
            src={lightbox.src}
            alt={lightbox.alt || ''}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="lightbox__close"
            onClick={closeLightbox}
            aria-label="Cerrar"
          >✕</button>
        </div>
      )}
    </div>
  );
}
