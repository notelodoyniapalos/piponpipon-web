# Pipón Pipón — Guía del proyecto

Sistema web de pedidos por WhatsApp para **Pipón Pipón** (comidas caseras, Vega Maipú, Argentina).
Mobile-first, PWA instalable, sin backend (por ahora — ver [PLANNING.md](PLANNING.md)).

---

## Stack

- **React 18 + Vite 5** (SPA, JSX)
- **No UI library** — CSS plano con CSS variables para el theme
- **No backend** — pedidos se envían armando un `wa.me/` URL con mensaje pre-cargado
- **PWA**: `vite-plugin-pwa` + Workbox (manifest + service worker auto-generados)
- **Íconos**: generados con `sharp` desde `public/logo-icon.svg` (script en `scripts/generate-icons.mjs`)
- **Persistencia**: `localStorage` (form del cliente, override de menú para admin, visit counter) y `sessionStorage` (carrito — se borra al cerrar la tab)

## Comandos

```powershell
npm install                  # primera vez
npm run dev                  # dev en http://localhost:5173 (SW deshabilitado en dev)
npm run build                # produce dist/
npm run preview              # sirve dist/ con SW activo (para probar PWA real)
node scripts/generate-icons.mjs   # regenera íconos PNG si cambia el logo
```

## Estructura

```
piponpipon-web/
├── menu-data.json            ← fallback bundled (importado por src/utils/menuData.js)
├── public/
│   ├── menu-data.json        ← copia LIVE, se reemplaza para push cambios sin rebuild
│   ├── logo.svg              ← original (hoja de marca con todas las variantes)
│   ├── logo-lockup.svg       ← header (recorte cluster #3 banda inferior, aspect 4.12)
│   ├── logo-icon.svg         ← favicon / avatar Pipón / fuente de íconos PNG
│   ├── logo-mark.svg         ← reserva (variante intermedia)
│   ├── icon-{192,512}.png    ← PWA Android regular
│   ├── icon-{192,512}-maskable.png  ← PWA Android adaptive
│   ├── apple-touch-icon.png  ← iOS A2HS
│   ├── favicon-32.png
│   └── .htaccess             ← gzip + cache + HTTPS redirect (Hostinger)
├── scripts/
│   └── generate-icons.mjs    ← sharp pipeline (density 96, padding 8%/18%)
├── src/
│   ├── App.jsx               ← root, hash-routing #admin, search state, lightbox, modales
│   ├── App.css               ← TODOS los estilos (sin módulos, con CSS variables)
│   ├── main.jsx
│   ├── components/
│   │   ├── Header.jsx        ← logo + 🔔 campana + 🛒 carrito
│   │   ├── Hero.jsx          ← buscador (reemplazó tagline/chips/CTA)
│   │   ├── StatusBanner.jsx  ← estado en vivo según schedule (abierto/cerrado/etc)
│   │   ├── CategoryNav.jsx   ← tabs horizontales sticky con auto-scroll
│   │   ├── MenuSection.jsx   ← una sección por categoría
│   │   ├── ItemCard.jsx      ← card con foto clickable (lightbox), extras, +Receta, +Carrito
│   │   ├── CartDrawer.jsx    ← drawer con flujo CONVERSACIONAL (Pipón chat)
│   │   ├── InfoSection.jsx   ← steps + datos + footer con créditos + link #admin
│   │   ├── JoinChannelModal.jsx  ← popup Cliente ORO con heartbeat + install PWA
│   │   ├── NotificationPrompt.jsx  ← modal para pedir permiso de notificaciones
│   │   ├── Modal.jsx         ← componente reutilizable (con className opcional)
│   │   └── AdminPanel.jsx    ← CRUD completo con search + photo upload + export/import
│   └── utils/
│       ├── menuData.js       ← LIVE (fetch /menu-data.json) > override (LS) > bundled
│       ├── formatPrice.js    ← $14.000 (es-AR)
│       ├── buildWhatsappMsg.js  ← arma el mensaje (BMP-safe, ver IMPORTANTE abajo)
│       ├── scheduleStatus.js ← schedule parsing, isOpenAt, generateSlots
│       ├── visitCounter.js   ← trigger del popup (actualmente siempre true)
│       ├── categoryPhotos.js ← Unsplash por categoría (hero + thumb fallback)
│       ├── itemPhotos.js     ← LoremFlickr por item.id (hash → seed)
│       ├── imageCompress.js  ← canvas pipeline, max 700x700 JPEG @78%
│       ├── pwa.js            ← isIOS, isStandalone, notif helpers, dismissed flag
│       └── useInstallPrompt.js  ← hook para beforeinstallprompt + appinstalled
└── vite.config.js            ← PWA config con manifest + workbox + runtimeCaching
```

---

## Flujos clave

### Carga del menú
1. `loadMenuData()` retorna sync: override de `localStorage` ó bundled `menu-data.json`
2. En mount, `fetchLiveMenuData()` pide `/menu-data.json` con `cache: no-store`
3. Si llega y NO hay override del admin → actualiza el estado (datos live ganan)
4. **El admin que tiene override SIEMPRE ve su versión** (previewing). Para pushear cambios a clientes:
   - Admin → Exportar JSON → descargar
   - Subir `menu-data.json` reemplazando el del server
   - Próximos visitantes lo levantan

### Cart
- Vive en `sessionStorage` (no localStorage): se borra al cerrar la tab, sobrevive refresh
- Form del cliente (nombre, tel, dirección, pago, condimentos, preferencias) sí persiste en `localStorage` (`piponpipon_form_v4`)
- CartDrawer es **flujo conversacional** tipo chat con Pipón: pasos secuenciales con burbujas, cada respuesta del usuario tiene chip `✎ editar` para volver atrás

### Mensaje de WhatsApp (IMPORTANTE)
- ⚠️ **NO usar emojis 4-byte** (🍽️ 👤 📱 📦 💰 📝 etc.). WhatsApp Desktop Windows los muta a U+FFFD (`�`).
- Usar solo símbolos BMP (3-byte UTF-8): `▸ • ─ ✓ ★` etc.
- Lista de campos del mensaje:
  - URGENTE/Reserva header (condicional)
  - Para retirar/enviar (si hay horario o reserva)
  - Nombre, Teléfono, Tipo (Delivery/Retiro), Dirección, Referencia, Ubicación (Google Maps)
  - Preferencias (celíaco, sin sal, etc.)
  - Pago (Efectivo / Transferencia, con aviso de comprobante)
  - Pedido (items con extras)
  - Condimentos para llevar
  - Total, Notas

### Schedule / Estado en vivo
- `menu-data.json → business.schedule`: `{ delivery: { days: [1..6], open: "11:00", close: "15:00" }, mostrador: {...} }`
- `getStatus(schedule)` → `{ delivery: { isOpen, opensAt, closesAt }, mostrador: {...} }`
- StatusBanner se re-renderiza cada 30s para reflejar cambios de horario
- CartDrawer usa `isOpenAt(service, date)` para validar horario manual y mostrar modal "no disponible"

### PWA
- Manifest: `Pipón Pipón`, theme `#F27900`, bg `#111111`, display standalone, portrait, lang es-AR
- Workbox precachea `**/*.{js,css,html,svg,png,ico,woff2}` (1.9 MB precache total)
- `menu-data.json`: estrategia `NetworkFirst` con timeout 3s (siempre intenta live, fallback cache)
- Fotos de unsplash/loremflickr: `CacheFirst` 30 días, max 80 entries
- Botón "Instalar la App PRO" en el popup Cliente ORO usa `beforeinstallprompt` (Android/Chrome) o muestra instrucciones para iOS

### Notificaciones (estado actual)
- Permission ask: aparece después del popup ORO en primera visita (si `default`)
- Campana en header: 🔔 muestra estado (granted = naranja + dot verde, denied = atenuada + 🔕, default = gris)
- **Solo notificaciones locales** (`new Notification(...)`): funcionan mientras app abierta
- **NO hay push real cross-device aún** → ver [PLANNING.md](PLANNING.md#v2-supabase--push-real)

### Admin (`#admin`)
- Auth: ninguna por ahora (pasa directo). Acceso vía link discreto en footer o URL `#admin`
- Edita: business info, schedule estructurado, categorías (CRUD + reorder), items (CRUD + extras + fotos)
- Buscador en categorías filtra por nombre/descripción
- Fotos: upload → comprime con canvas (700×700 JPEG @78%) → base64 en `item.photo`
- Export/Import JSON, Reset al bundled
- Cambios guardan en `localStorage` (preview local), exportar+subir para que vean los clientes

---

## Convenciones

- **Sin comentarios obvios**: el código se explica solo, comentar solo el "por qué" no-obvio (ej.: el comentario sobre 4-byte UTF-8 en `buildWhatsappMsg.js`)
- **No prefijar con `cd <dir>` los comandos de git**: ya estamos en el cwd correcto
- **Hashes de assets cambian con cada build** (Vite): siempre subir `index.html` + `assets/*` juntos
- **Emojis en código fuente**: OK en UI (modales, labels). NUNCA en el mensaje de WhatsApp (usar BMP)
- **Iconos PNG**: regenerar con `node scripts/generate-icons.mjs` si cambia `public/logo-icon.svg`
- **CSS lint warnings**: hay hints persistentes sobre vendor-prefix order y `transform/opacity` en @keyframes — son benignos, ignorar

---

## Deploy a Hostinger

Subdominio: `www.piponpipon.bairescreativa.net`
Document Root: lo que indique hPanel → Subdominios para `piponpipon`.

**Archivos a subir tras `npm run build`** (contenido completo de `dist/`):

```
.htaccess
index.html
manifest.webmanifest
sw.js
workbox-*.js
registerSW.js
menu-data.json
icon-192.png · icon-512.png · icon-192-maskable.png · icon-512-maskable.png
apple-touch-icon.png · favicon-32.png
logo.svg · logo-lockup.svg · logo-icon.svg · logo-mark.svg
assets/index-*.css
assets/index-*.js
```

**Updates de menú** (precios, fotos, horarios): admin → exportar JSON → subir solo `menu-data.json` (no rebuild).

**Updates de código**: `npm run build` → re-subir `index.html` + `assets/*` (hashes cambian).

---

## Configs a revisar antes de producción

- [ ] `menu-data.json` → `business.whatsapp`: **actualmente `5492257652436` (testing del designer)**. Revertir a `5492944208323` antes de prod.
- [ ] `src/utils/visitCounter.js`: actualmente `shouldTrigger()` siempre retorna `true`. Restaurar a `TRIGGER_SEQ.includes(count)` con `[1, 3, 7, 15, 31, 63, …]` cuando termine el debug.
- [ ] Verificar SSL activo para el subdominio (hPanel → SSL → Let's Encrypt).
- [ ] Probar instalación PWA en Android (Chrome) y iOS (Safari → Compartir → Agregar a inicio).

## Decisiones de diseño importantes

- **WhatsApp UTF-8 4-byte bug**: descubierto cuando los emojis llegaban como `�` en WhatsApp Desktop Windows. Fix: usar solo símbolos BMP. Detalle técnico en comentario del `buildWhatsappMsg.js`.
- **Logo extraction**: el SVG original es una hoja de marca con 3 bandas × varias variantes. El cluster #3 de la banda inferior (X=16278-22190, aspect 4.12) es el lockup wide con chef + wordmark + tagline. Crop con `viewBox` (script en chat history o regenerable con node + regex).
- **Cliente ORO vs PRO**: ORO = sumarse al canal de WhatsApp (gratis). PRO = instalar la PWA (acceso futuro a features premium). Mismo modal `JoinChannelModal` con `context="recipe"` lo cambia el copy cuando viene del botón Receta + Video.
- **Carrito conversacional**: probado en CartDrawer como pattern, queda como demo. Si funciona bien, se puede extender a otras secciones (por ej., elección de extras dentro de cada plato).
- **Menú del Día**: categoría con un placeholder. Se edita desde el admin con el plato del día.
