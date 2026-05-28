# Pipón Pipón — Guía del proyecto

Sistema web de pedidos por WhatsApp para **Pipón Pipón** (comidas caseras, Vega Maipú, Argentina).
Mobile-first, PWA instalable, **con backend Supabase** (notificaciones realtime + push real).

**URL producción**: `https://piponpipon-web.vercel.app`
**Repo**: `github.com/notelodoyniapalos/piponpipon-web`

---

## Stack

- **React 18 + Vite 5** (SPA, JSX, sin TypeScript)
- **No UI library** — CSS plano con CSS variables (`#F27900` primary, `#111` bg)
- **Pedidos por WhatsApp** — `wa.me/` URL con mensaje pre-armado (sin backend de orders aún)
- **PWA**: `vite-plugin-pwa` en modo **`injectManifest`** con custom SW en `src/sw.js`
- **Backend Supabase**: tabla `notifications` (Realtime broadcast), `push_subscriptions` (Web Push endpoints), Edge Function `send-push` (Deno + npm:web-push para entrega vía VAPID)
- **Auto-deploy**: GitHub → Vercel (push a main → build → live en ~1 min)
- **Íconos**: PNGs generados con `sharp` desde `public/logo-icon.svg` (script `scripts/generate-icons.mjs`)
- **Persistencia cliente**: `sessionStorage` (carrito — se borra al cerrar tab), `localStorage` (visit counter, form data hasta que se envía la orden, override de menú para admin)

## Comandos

```powershell
npm install                       # primera vez
npm run dev                       # dev en http://localhost:5173 (SW deshabilitado en dev)
npm run build                     # produce dist/ (PWA con SW custom)
npm run preview                   # sirve dist/ con SW activo (para probar PWA real localmente)
node scripts/generate-icons.mjs   # regenera íconos PNG si cambia el logo

# Deploy: NO hace falta hacer build local antes de deploy.
# Vercel buildea automáticamente al hacer git push.
git add -A
git commit -m "mensaje"
git push                          # ~1 min después está live en piponpipon-web.vercel.app
```

## Estructura

```
piponpipon-web/
├── menu-data.json                 ← fallback bundled (import directo desde src/utils/menuData.js)
├── public/
│   ├── menu-data.json             ← LIVE — admin exporta JSON y lo reemplaza acá para push live
│   ├── .well-known/
│   │   └── assetlinks.json        ← Digital Asset Links para TWA (queda por si vuelven a APK)
│   ├── logo.svg                   ← original (hoja de marca con todas las variantes)
│   ├── logo-lockup.svg            ← header (recorte cluster #3 banda inferior)
│   ├── logo-icon.svg              ← favicon / avatar Pipón / fuente de íconos PNG
│   ├── logo-mark.svg              ← reserva
│   ├── icon-{192,512}.png         ← PWA Android regular
│   ├── icon-{192,512}-maskable.png ← PWA Android adaptive
│   ├── apple-touch-icon.png       ← iOS A2HS
│   ├── favicon-32.png
│   └── .htaccess                  ← legacy (de Hostinger, ya no se usa)
├── scripts/
│   └── generate-icons.mjs         ← sharp pipeline (density 96, padding 8%/18%)
├── src/
│   ├── App.jsx                    ← root, hash-routing #admin, search, lightbox, modales, push wire
│   ├── App.css                    ← TODOS los estilos
│   ├── main.jsx
│   ├── sw.js                      ← ⭐ Custom Service Worker (Workbox + push handler + click handler)
│   ├── components/
│   │   ├── Header.jsx             ← logo + 🔔 campana + 🛒 carrito
│   │   ├── Hero.jsx               ← buscador
│   │   ├── StatusBanner.jsx       ← estado en vivo según schedule (auto-refresh 30s)
│   │   ├── CategoryNav.jsx        ← tabs horizontales sticky
│   │   ├── MenuSection.jsx
│   │   ├── ItemCard.jsx           ← card con foto clickable (lightbox), CustomSelect, +Receta, +Carrito
│   │   ├── CustomSelect.jsx       ← ⭐ dropdown popover inline (reemplaza el picker nativo del SO)
│   │   ├── CartDrawer.jsx         ← drawer conversacional con Pipón + summary con edit buttons
│   │   ├── InfoSection.jsx
│   │   ├── JoinChannelModal.jsx   ← popup Cliente ORO heartbeat + install PWA
│   │   ├── NotificationPrompt.jsx ← modal para pedir permiso de notif + ensurePushSubscription
│   │   ├── IncomingNotification.jsx ← popup in-app cuando llega push via Realtime
│   │   ├── Modal.jsx              ← componente reutilizable
│   │   └── AdminPanel.jsx         ← CRUD + search + photo upload + send notif + invoke Edge Fn
│   └── utils/
│       ├── menuData.js            ← LIVE (fetch /menu-data.json) > override (LS) > bundled
│       ├── formatPrice.js
│       ├── buildWhatsappMsg.js    ← BMP-safe symbols (no emojis 4-byte)
│       ├── scheduleStatus.js
│       ├── visitCounter.js
│       ├── categoryPhotos.js      ← Unsplash por categoría
│       ├── itemPhotos.js          ← LoremFlickr por item.id
│       ├── imageCompress.js       ← canvas 700×700 JPEG @78%
│       ├── pwa.js                 ← isIOS, isStandalone, notif helpers
│       ├── useInstallPrompt.js    ← hook beforeinstallprompt
│       ├── supabaseClient.js      ← ⭐ cliente Supabase con feature flag
│       ├── useNotificationsRealtime.js ← ⭐ hook subscripción a Realtime + replay
│       └── pushSubscribe.js       ← ⭐ PushManager.subscribe + upsert a Supabase (con trim defensivo de VAPID)
├── .env.local                     ← claves locales (gitignored)
├── .env.example
├── .gitignore
├── vite.config.js                 ← PWA injectManifest + workbox runtimeCaching
├── CLAUDE.md                      ← esta guía
└── PLANNING.md                    ← roadmap viviente
```

---

## Backend Supabase

**Project**: `PiponPipon` · URL `https://bpguuayejhhgzqfjxhbl.supabase.co`

### Tablas

```sql
-- notifications: insertada por admin, Realtime la broadcast a clientes conectados
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  items jsonb,
  sound boolean default true,
  created_at timestamptz default now()
);
alter publication supabase_realtime add table public.notifications;

-- push_subscriptions: endpoints VAPID guardados al activar permiso de notif en cliente
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now()
);
```

RLS: permisivo (anon puede leer/insert/update/delete) — apretar con auth real cuando llegue Cliente PRO.

### Edge Function `send-push`

- TypeScript Deno
- Import: `npm:@supabase/supabase-js@2`, `npm:web-push@3.6.7`
- Invoca con `urgency: 'high'` + `TTL: 60` (mejora entrega en Android lento)
- Secrets (configurados en Supabase Dashboard → Edge Functions → Secrets):
  - `VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `VAPID_SUBJECT` (formato `mailto:...`)
- Borra subscriptions con 410/404 automáticamente

### Flujo notif end-to-end

1. Admin escribe título + body + selecciona platos → click **"Enviar a todos los conectados"**
2. Frontend: `supabase.from('notifications').insert({...})` → Realtime broadcast → todos los clientes con app abierta ven el popup in-app
3. Frontend: `supabase.functions.invoke('send-push', { body })` → Edge Function lee `push_subscriptions` → web-push a cada endpoint → FCM/Apple/Mozilla entrega → SW custom recibe `push` event → `showNotification`

---

## Vercel

**Project**: `piponpipon-web` · auto-deploy desde main de GitHub

### Env vars (Settings → Environment Variables)

| Name | Used by | Value |
|---|---|---|
| `VITE_SUPABASE_URL` | frontend | `https://bpguuayejhhgzqfjxhbl.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | frontend | JWT anon de Supabase |
| `VITE_VAPID_PUBLIC_KEY` | frontend (pushSubscribe.js) | clave pública VAPID (87 chars) |

⚠️ Toda env var nueva requiere **redeploy** para aplicarse al build.

---

## GitHub

`github.com/notelodoyniapalos/piponpipon-web` (público).

`buenaireplataforma@gmail.com` figura como commit author (git config local). Cambiar con `git config --global user.email/name` si molesta.

---

## Convenciones

- **NO emojis 4-byte en mensaje WhatsApp** (🍽️ 👤 📱 etc.) — WhatsApp Desktop Windows los muta a U+FFFD. Usar solo BMP: `▸ • ─ ✓ ★`.
- **NO commits ni amends sin pedírselo al usuario**.
- **Sin TypeScript**, sin tests.
- **Hashes de assets cambian con cada build** (Vite). Vercel maneja todo.
- **`.env.local` está gitignored** — las claves se setean en Vercel para producción.
- **Brevity preference**: respuestas cortas para preguntas simples (memoria `feedback_brevity`).
- **CSS lint warnings benignos**: vendor prefix order, transform/opacity en @keyframes — ignorar.

---

## Configs a revisar antes de producción real

- [ ] **WhatsApp destino**: hoy `business.whatsapp` apunta a `5492257652436` (designer/testing). Cambiar a `5492944208323` (real).
- [ ] **Visit counter**: `src/utils/visitCounter.js → shouldTrigger()` retorna `true` siempre (debug). Restaurar a `TRIGGER_SEQ.includes(count)` con `[1, 3, 7, 15, 31, 63]`.
- [ ] **Foto Menú del Día**: subir una real desde admin (hoy es placeholder).
- [ ] **RLS Supabase**: cerrar policies de `notifications` e `push_subscriptions` cuando llegue auth real del admin.
- [ ] **Logs de debug**: pushSubscribe.js tiene console.log explícitos. Quitarlos o cambiar a `if (DEV)`.

## Push real — status y limitaciones conocidas

✅ **Funciona en**: PC (Chrome/Edge), Android Samsung, iPhone (PWA agregada a home screen)
❌ **NO funciona "out of the box" en Xiaomi/MIUI** con app cerrada. Requiere que el usuario configure manualmente:
  - Apps → Pipón → Ahorro de batería: **Sin restricciones**
  - Apps → Pipón → **Autoinicio: ON**
  - Recientes → fijar la app con candadito 🔒

**Razón técnica**: las PWAs/TWAs reciben push vía Chrome → MIUI mata Chrome agresivamente en background. Apps "nativas" (WhatsApp etc.) usan FCM directo + están whitelisted por MIUI por default.

**Fix definitivo**: migrar a Capacitor (wrapper nativo + FCM real) — pendiente, ver PLANNING.

## TWA — descartado por ahora (mayo 2026)

Probamos generar TWA APK con PWABuilder + signing con uber-apk-signer + Java/Temurin17 + assetlinks.json. **Funcionó técnicamente** pero las notif en Xiaomi siguieron requiriendo los mismos settings de MIUI (porque TWA = wrapper de Chrome, no resuelve el issue de battery management). Material de referencia queda en `APP TEST/` y `public/.well-known/assetlinks.json` si se vuelve a intentar.
