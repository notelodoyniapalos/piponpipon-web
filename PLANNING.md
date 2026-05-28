# Pipón Pipón — Planning

Roadmap viviente del proyecto. Lo cierra mente.

---

## ✅ Hecho

### Base
- Vite + React + CSS plano con variables del brand (#F27900 orange, #111 bg, #1C1C1C surface)
- Mobile-first (375px → 768px+ en grid 2 cols)
- Inter de Google Fonts
- Header sticky con logo SVG (cluster #3 del logo.svg original, lockup wide)
- CategoryNav sticky horizontal scroll con auto-active según `IntersectionObserver`
- MenuSection con hero image curado de Unsplash por categoría
- ItemCard con thumb único por plato (LoremFlickr con seed = hash de item.id, fallback a Unsplash de la categoría si falla)
- Footer con créditos "Diseñado por www.patagoniacreativa.net" → link a wa.me/5492257652436 + link admin (#admin)

### Carrito (flujo conversacional)
- `CartDrawer` reescrito como chat con avatar de Pipón (logo-icon.svg)
- Burbujas de pregunta (izquierda con avatar) + respuesta (derecha en gradient naranja con chip "✎ editar")
- Pasos: nombre → teléfono → tipo (Delivery/Retiro) → dirección/referencia/ubicación (si delivery) → cuándo (datetime-local + checkbox urgente) → pago (Efectivo/Transferencia) → condimentos → preferencias dietéticas → notas → summary
- Skip-smart: si vuelve a abrir el drawer y tiene datos persistidos, salta directo al primer paso sin contestar
- Validación de horario con modal "no disponible"
- Modal de confirmación pre-WhatsApp con aviso de comprobante si pago = transferencia
- Botón "¡Lo quiero YA!" (urgent) ⚡ con animación pulse

### WhatsApp message
- BMP-only symbols (▸ • ─) para evitar el bug de WhatsApp Desktop Windows con 4-byte UTF-8
- Incluye: urgente/reserva header, datos del cliente, dirección + ubicación Google Maps, preferencias, pago, items con extras, condimentos, total, notas

### Schedule + status
- Schedule estructurado en `menu-data.json → business.schedule`
- `StatusBanner` arriba del hero que se re-renderiza cada 30s (open / closing-soon / partial mostrador / closed)
- Pre-orden automática si el cliente intenta pedir fuera de horario
- Selector de hora manual `<input type="datetime-local">` con validación

### Buscador
- Reemplazó el hero antiguo (tagline, chips, "Cómo pedimos")
- Filtra por nombre y descripción de plato
- Categorías sin matches se ocultan (nav + secciones)
- Empty state cuando no hay resultados

### Categorías
- Promos PRIMERA en el orden
- Menú del Día (📅) como segunda categoría, con item placeholder editable

### Cliente ORO popup
- Bubble style con avatar Pipón + heartbeat animation
- Link real al canal: `https://whatsapp.com/channel/0029Vb8DG4b5PO0xEeGkzI1Q`
- 4 perks: descuentos exclusivos, promos limitadas, menú del día anticipado, recetas + video
- Bloque PRO con badge naranja: invita a instalar la App PRO

### PWA
- Manifest completo (es-AR, standalone, portrait, theme/bg colors)
- Service worker con Workbox: precache + runtimeCaching (menu-data NetworkFirst, fotos CacheFirst 30d)
- Íconos generados desde SVG: 192/512 regular + 192/512 maskable + 180 apple-touch + 32 favicon
- Botón "Instalar la App PRO" en el popup ORO (beforeinstallprompt para Chromium, instrucciones para iOS)
- Detección de standalone (ya instalada)

### Notificaciones (LOCALES por ahora)
- `NotificationPrompt` modal con campana sacudiéndose, aparece tras cerrar el popup ORO en primera visita
- Permission flow vía Notification API
- Campana en header con 4 estados (granted/denied/default/unsupported)
- Click en campana: pide permiso si default, dispara notif de prueba si granted, instrucciones si denied
- Dismissed flag en localStorage para no insistir si dice "ahora no"

### Foto del plato
- Click en el thumb → lightbox a pantalla completa (max 88vh)
- Botón "📖 Receta + Video" abre el popup ORO con `context="recipe"` (gateado tras unirse al canal)

### Admin panel (`#admin`)
- Sin auth (pasa directo). Acceso desde footer o URL hash
- Edita business info, schedule estructurado (días + horas)
- CRUD de categorías (reorder con ↑↓, rename, icon)
- CRUD de items con buscador (filtra por nombre/desc)
- Extras por item (label, options csv, required)
- Upload de foto con compresión cliente (canvas 700×700 JPEG @78%)
- Export/Import JSON, Reset al bundled
- Override en `localStorage` para preview local, exportar+subir para push live

### Persistencia
- `sessionStorage` para cart (reset por tab)
- `localStorage` para form del cliente, override del menú, visit count, notif state, form data
- `/menu-data.json` (live) gana sobre bundled cuando no hay override

### Deploy
- `.htaccess` con gzip, cache, HTTPS redirect, UTF-8
- Documentado paso a paso para Hostinger

---

## 🔜 Próximo (no hecho aún)

### v2 — Supabase + push real
**Propuesto, no implementado.** El usuario tiene cuenta en Supabase y Vercel. Plan:

1. **Supabase project** (free tier alcanza)
   - Tabla `notifications`: `{ id, title, body, items jsonb, created_at, sound, dismissable }`
   - Tabla `push_subscriptions`: `{ id, endpoint, p256dh, auth, user_agent, created_at }` (para v2.5 con web-push real)
   - Habilitar Realtime en `notifications`
   - RLS: `notifications` read público, write con service_role o auth admin

2. **Frontend** (`@supabase/supabase-js`)
   - Cliente con SUPABASE_URL + ANON_KEY (env vars o constantes en `src/utils/supabaseClient.js`)
   - Al cargar la app: subscribe al channel `notifications:INSERT`
   - On insert: muestra in-app popup (similar al de ORO) + dispara `showLocalNotification()` si permiso
   - SW debería poder mostrar notificación incluso si la tab está backgrounded (Service Worker + postMessage)

3. **Admin** (nuevo bloque en `AdminPanel.jsx`)
   - Sección "📢 Enviar notificación"
   - Form: título, body, multi-select de items del menú (chips), opción "incluir total" / "incluir foto destacada"
   - Insert directo en Supabase (con `service_role` no-recomendado en frontend, usar `auth` real o un edge function con secret)
   - Historial de últimas N notificaciones enviadas con timestamp

4. **v2.5 — Push REAL (app cerrada)**
   - Generar par VAPID (público + privado)
   - Suscribir al usuario al pushManager con la VAPID public key
   - Guardar subscription en `push_subscriptions`
   - Supabase Edge Function `send-push` trigger en insert de `notifications`:
     - Itera todas las subscriptions
     - Usa `web-push` (Deno-compatible) para POST a cada endpoint
   - SW maneja evento `push` → `self.registration.showNotification(...)`
   - Maneja `notificationclick` → focus tab existente o abre nueva

**Tiempo estimado**: v1 (Realtime sola) ~45min · v2 con push real ~+1.5h

**Requisitos del usuario**:
- Project URL + anon public key de Supabase

### v3 — DB real para el menú
- Mover `menu-data.json` de archivo estático a tablas Supabase (`categories`, `items`, `extras`, `extra_options`)
- Backend para que el admin guarde directo (no más export/import manual)
- Auth con email/password (o magic link) para el admin
- Multi-rol: owner, operador, kitchen (futuro)
- Subir fotos a Supabase Storage en vez de base64 inline (mucho más liviano para clientes)

### v4 — Cliente PRO (post-install features)
- Una vez que la PWA está instalada → desbloquear:
  - Descarga de recetas (PDF + video URL) por plato
  - Descuentos automáticos visibles (con cupón implícito)
  - Historial de pedidos (sincronizado vía Supabase auth)
  - "Reordenar último" en un toque
  - Atajos en home screen (app shortcuts API)
  - Tema personalizable

### Otras ideas (sin prioridad asignada)
- **Cupones / códigos de descuento** ingresables en el carrito
- **Programa de fidelidad**: contador de pedidos por user, recompensas
- **Multi-sucursal**: si abren otra ubicación, switcher en header
- **Reservas reales** con calendario (no solo "para más tarde")
- **Métricas** simples: total de pedidos por día/semana en admin
- **WhatsApp Cloud API** (Meta) para mensajería bidireccional automatizada — gran salto
- **Pagos online** (MercadoPago checkout) para evitar el comprobante manual

---

## ⚠️ Pendientes a revisar antes de producción real

- [ ] **Revertir WhatsApp testing**: `menu-data.json → business.whatsapp` de `5492257652436` (designer) a `5492944208323` (real)
- [ ] **Visit counter**: restaurar `TRIGGER_SEQ.includes(count)` con `[1, 3, 7, 15, 31, 63, …]` (hoy retorna `true` siempre)
- [ ] **Foto del placeholder Menú del Día**: subir una real desde admin
- [ ] **SSL del subdominio**: confirmar Let's Encrypt activo en Hostinger
- [ ] **Test cross-browser**: probar PWA install en Chrome Android + Safari iOS reales
- [ ] **Test recipiente WhatsApp**: confirmar que el mensaje llega bien (sin `�`) al WhatsApp Business real del local
- [ ] **Performance**: los 4 SVGs de logo cada uno pesa 400KB. Optimizable removiendo paths fuera del viewBox de cada variante (~80KB final c/u).

---

## Decisiones tomadas (para no re-debatir)

- **Sin auth en admin (por ahora)**: el usuario lo pidió explícitamente "pasa directo, después creamos usuario y password"
- **Polling vs Realtime**: cuando llegue el momento, ir directo a Supabase Realtime (mejor que polling, ya que el usuario tiene cuenta)
- **Hostinger vs Vercel**: Hostinger queda como hosting estático. Vercel puede ser fallback si Hostinger da problemas, pero migrar no es prioridad.
- **Firebase descartado**: por el lado del usuario hay Supabase ya — evitamos sumar Google si no hace falta
- **Fotos en base64 en JSON**: aceptable para MVP (~25-50KB por foto con compresión). Migrar a Supabase Storage cuando llegue v3.
- **Sin TypeScript**: proyecto chico, vamos en JSX puro por velocidad
- **Sin tests automatizados**: por ahora confiamos en QA manual + build pasando. Cuando crezca, agregar Vitest + Playwright.
