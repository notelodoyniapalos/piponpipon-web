# Pipón Pipón — Planning

Roadmap viviente. Actualizado **2026-05-28**.

---

## ✅ Hecho

### Base + UX (sesiones anteriores)
- React + Vite + CSS variables, mobile-first, sin lib UI
- Header con logo recortado del SVG original (cluster #3 banda inferior)
- StatusBanner con auto-refresh
- Buscador en el hero (reemplazó tagline/chips/CTA)
- Categorías + items con foto única por plato (LoremFlickr + fallback Unsplash)
- Promos y Menú del Día como primeras 2 categorías
- ItemCard con foto clickable → lightbox 300%
- Botón "Receta + Video" → modal Cliente ORO con `context="recipe"`
- Cliente ORO popup con heartbeat + link real a canal WhatsApp
- PWA instalable (manifest + iconos PNG generados con sharp)
- Botón "Instalar la App PRO" en popup (beforeinstallprompt)
- Notificaciones LOCALES (in-page) + campana en header con estado
- Admin panel completo: CRUD categorías/items/extras, search, photo upload con compresión, export/import JSON, reset
- Carrito conversacional con Pipón (avatar logo-icon.svg, burbujas chat, summary editable)
- Form data persistido en localStorage hasta envío
- WhatsApp message BMP-safe (sin emojis 4-byte que rompen WhatsApp Desktop)
- Schedule estructurado + validación horario manual con modal
- Forma de pago (Efectivo/Transferencia) con recordatorio de comprobante
- Condimentos + preferencias dietéticas
- Modal confirmación pre-WhatsApp

### Sesión de hoy (2026-05-27 → 28)

**Fixes UX**
- ✅ Bug del chat: ahora `sessionHistory` solo trackea pasos respondidos EN la sesión actual; returning visitors van directo a summary limpio con botones ✎ editar por campo
- ✅ Menú del Día → primera categoría (antes Promos)
- ✅ Después de enviar WhatsApp: **wipe TOTAL** (cart + nombre + tel + dirección + pago + condimentos + preferencias + notas + horario + historial chat) y **auto-cierre del drawer**
- ✅ CustomSelect inline component (reemplazó `<select>` nativo) — el dropdown ahora se abre **dentro de la card**, no como picker del SO
- ✅ Removido `autoFocus` de los inputs del CartDrawer (ya no abre el teclado solo al abrir el carrito)
- ✅ Fix botón "Continuar" cortado en pantallas angostas (`min-width: 0` + drop avatar offset en ≤380px)
- ✅ Botón verde "Hacer pedido por WhatsApp" allow wrap + tamaño menor en ≤360px

**Infra: GitHub + Vercel**
- ✅ Repo creado `notelodoyniapalos/piponpipon-web` (público)
- ✅ Push inicial + auto-deploy en Vercel `piponpipon-web` (free, Hobby plan)
- ✅ Env vars en Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`
- ✅ Custom domain pendiente — usuario decidió quedarse con `piponpipon-web.vercel.app` por ahora (el cliente final comprará dominio propio después)

**Supabase backend**
- ✅ Project `PiponPipon` creado (region US West, no hace falta migrar)
- ✅ Tabla `notifications` con Realtime habilitado + 4 RLS policies permisivas
- ✅ Tabla `push_subscriptions` con RLS permisivo
- ✅ Edge Function `send-push` deployada (Deno + npm:web-push@3.6.7)
- ✅ 3 secrets configurados: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:agaripoli@hotmail.com)
- ✅ Edge Function envía con `urgency: 'high'` + `TTL: 60`
- ✅ Cleanup automático de subscriptions 410/404

**Frontend Realtime**
- ✅ `@supabase/supabase-js` instalado
- ✅ `useNotificationsRealtime` hook: suscribe al canal + replay del último notif si llegó offline
- ✅ `IncomingNotification` component (popup top-center con animación + sound)
- ✅ `showLocalNotification()` complementario para notif del SO (cuando app abierta)

**Push real (VAPID + Web Push)**
- ✅ VAPID keys generadas (`npx web-push generate-vapid-keys`)
- ✅ `injectManifest` mode en vite-plugin-pwa → custom SW en `src/sw.js`
- ✅ SW handlers: `install` (skipWaiting), `activate` (clients.claim), `push` (showNotification), `notificationclick` (focus existing client + navigate to /#menu-del-dia)
- ✅ `pushSubscribe.js` utility: PushManager.subscribe + upsert a Supabase
- ✅ Auto-subscribe al activar permiso (campana + NotificationPrompt)
- ✅ Subscribe on mount si permiso ya granted
- ✅ Admin invoca Edge Function después de insert: `supabase.functions.invoke('send-push', { body })`
- ✅ Admin template "Menú del Día -15%" pre-fill (título + body + auto-pick items de la categoría)

**Debugging push (largo, pero resuelto)**
- ✅ Fix: VAPID key con "Value:" prefix copiado de Vercel (93 chars en vez de 87)
- ✅ Fix: VAPID key sin la 's' final
- ✅ Fix: `VAPID_SUBJECT` sin prefijo `mailto:`
- ✅ Defensive: `.replace(/\s/g, '')` en VITE_VAPID_PUBLIC_KEY
- ✅ Console.log explícitos en `[push]` flow para debug
- ⚠️ **Xiaomi/MIUI** no entrega push con app cerrada por battery management — requiere settings manuales del usuario

**TWA / APK (intento, descartado)**
- ✅ PWABuilder generó APK unsigned
- ✅ Instalado Java JDK Temurin 17 vía Chocolatey
- ✅ uber-apk-signer descargado y usado para firmar APK con debug certificate
- ✅ `public/.well-known/assetlinks.json` con SHA256 cert fingerprint
- ❌ **Conclusión**: TWA hereda comportamiento Chrome push, sigue afectado por MIUI battery saver. **Descartado** seguir por este camino.

---

## 🔜 Próximo (sesión siguiente)

### Sprint 1 — Admin redesign con tabs (~1h)
Propuesta confirmada por usuario. Reestructurar AdminPanel:

```
┌─ Admin Pipón Pipón                  [salir] ─┐
├──────────────────────────────────────────────┤
│ 📅 Hoy │ 🍽️ Menú │ 👥 Clientes │ 💬 Chat  │
├──────────────────────────────────────────────┤
│ (contenido de la tab activa)                 │
└──────────────────────────────────────────────┘
```

**Tab 1 — Hoy (Menú del Día)**:
- Header con fecha "Lunes 28 de Mayo" + estado Publicado/Borrador
- Tarjetas de los platos del día seleccionados (reorderables)
- Botón "+ Sumar plato del menú" → modal con buscador de items existentes
- Botón "+ Crear plato nuevo" → form inline rápido
- Botón "Copiar de ayer/semana pasada" (cuando tengamos historial)
- Campo "Mensaje para clientes" autogenerado pero editable
- Vigencia opcional (hora desde/hasta — solo aparece visible en menú durante ese rango)
- CTA "📢 Publicar y avisar" → 3 acciones combinadas: update menu + insert notification + invoke send-push

### Sprint 2 — Menú General con search-as-you-type (después de Sprint 1)
- Buscador grande arriba (como Notion command palette)
- Click resultado → panel lateral (drawer) con form de edición
- Estado: Activo / Borrador / Programado (con date picker)
- Chips horizontales por categoría debajo del search cuando no hay query
- FAB "+ Nuevo plato" flotante

### Sprint 3 — Tab Clientes (requiere SQL nuevo)
- SQL: nueva tabla `orders` (id, name, phone, order_type, address, items jsonb, total, scheduled_for, urgent, payment, notes, created_at)
- Loggear cada "Abrir WhatsApp" del CartDrawer como insert en `orders` (lo más simple y honesto; el "envío real" no se puede confirmar sin backend)
- Admin Tab Clientes: tabla agrupada por phone, columnas (Nombre, Teléfono, Pedidos, Total gastado, Último)
- Click cliente → detalle con historial + stats + botón "💬 Mensaje WA"
- Filtros: 7 días, top compradores, nuevos esta semana

### Sprint 4 — Chat (futuro)
- Placeholder "💬 Próximamente"
- A más adelante: integrar WhatsApp Cloud API (Meta) para bidireccional

### Mejora Xiaomi (opcional, 1h)
- Detectar MIUI en user agent
- Mostrar modal-tutorial la primera vez que activan notif: "Para que las notif funcionen en tu Xiaomi/Poco: Configuración → Apps → Pipón → Batería sin restricciones..."
- Botón "Abrir config de la app" (deep-link al app info de Pipón)

### Futuro lejano

#### v2: Capacitor (cuando crezca el cliente)
Migrar a Capacitor para tener **app nativa real con FCM directo** — bypassea Xiaomi battery management como hacen WhatsApp/Telegram. Mantiene el código React tal cual, solo agrega un shell nativo. ~6-8h.

#### v3: DB real del menú en Supabase
Mover `menu-data.json` a tablas Supabase (`categories`, `items`, `extras`, `extra_options`). Admin escribe directo, frontend lee via Realtime. Sin más export/import manual.

#### v4: Auth real en admin
Supabase Auth (magic link o email/password). Apretar las RLS policies de `notifications` y `push_subscriptions`. Roles: owner, operador, kitchen.

#### v5: Fotos en Supabase Storage
En vez de base64 inline en JSON (que infla el bundle). Cada item.photo pasa a URL.

#### v6: Cliente PRO (post-install)
Una vez la PWA instalada, desbloquear:
- Descarga real de recetas (PDF + video)
- Descuentos automáticos
- Historial de pedidos (sync via auth)
- "Reordenar último" en 1 toque
- App shortcuts en home screen

### Ideas sin prioridad
- Cupones / códigos de descuento
- Programa de fidelidad (contador de pedidos, recompensas)
- Multi-sucursal
- Reservas con calendario
- Métricas en admin (pedidos por día/semana)
- WhatsApp Cloud API para mensajería bidireccional
- Pagos online (MercadoPago)

---

## ⚠️ Pendientes pre-producción

- [ ] **WhatsApp destino real**: `business.whatsapp` de `5492257652436` → `5492944208323`
- [ ] **Visit counter**: restaurar `shouldTrigger` con `[1, 3, 7, 15, 31, 63]`
- [ ] **Quitar console.log de debug** en `pushSubscribe.js`
- [ ] **Apretar RLS policies** de Supabase cuando llegue auth admin
- [ ] **SSL** del dominio custom (cuando el cliente compre uno)
- [ ] **Cross-browser test PWA**: Chrome Android + Safari iOS reales
- [ ] **Foto Menú del Día**: subir real desde admin
- [ ] **Onboarding Xiaomi**: modal con instrucciones MIUI (o dejarlo en el FAQ)

---

## Decisiones tomadas (no re-debatir)

- **Sin auth en admin (por ahora)**: usuario explícito "pasa directo"
- **Supabase elegido sobre Vercel para backend**: Realtime built-in
- **Vercel para hosting** (no Hostinger): auto-deploy desde GitHub
- **Subdominio bairescreativa.net pospuesto**: el cliente final compra dominio propio después
- **TWA descartado**: no resuelve Xiaomi (Chrome wrapper, mismo battery issue)
- **Capacitor pospuesto**: solo migrar cuando el volumen lo justifique
- **Push real con VAPID + Supabase Edge Function**: free, propio, sin Google/Firebase
- **Fotos en base64 inline en JSON**: aceptable para MVP, migrar a Storage en v5
- **Sin TypeScript** ni tests: velocidad sobre robustez en esta fase
- **Edge Function corre con anon JWT** (legacy "Verify JWT" toggle ON): suficiente para invocar desde frontend
