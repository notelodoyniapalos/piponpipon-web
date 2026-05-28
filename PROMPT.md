# Pipón Pipón — Online Ordering System

## Project goal
Build a mobile-first online ordering web app for **Pipón Pipón**, a homemade food business in Vega Maipú, Argentina. The UI must be entirely in **Spanish (Argentina)**. Orders are submitted via WhatsApp — no backend needed.

## Tech stack
- **React + Vite** (single-page app)
- **No UI library** — custom CSS using CSS variables for the brand theme
- **No backend** — orders open WhatsApp with a pre-filled message
- File `menu-data.json` (included in project root) is the single source of truth for all menu items and business info

## Brand & design
- **Primary color (yellow):** `#F5C400`
- **Accent color (orange):** `#F27900`
- **Background:** `#111111` (near black, as in the physical menu)
- **Surface/cards:** `#1C1C1C`
- **Text:** `#FFFFFF` primary, `#AAAAAA` secondary
- **Font:** `Inter` (Google Fonts) — fallback: system-ui
- **Logo:** `logo.svg` in `public/` folder. Use it in the header.
- Design reference: the physical menu uses a dark background with yellow painted-brush category headers and bold all-caps item names in yellow. Recreate this energy in the web app but keep it clean and modern for mobile.

## App structure

### 1. Header (sticky)
- Logo (logo.svg) on the left
- Business name "Pipón Pipón" next to logo
- Cart icon button (top right) showing item count badge. Clicking opens the Cart Drawer.

### 2. Hero / Banner
- Full-width banner with background color `#1C1C1C`
- Tagline: "Comidas caseras todos los días 🍽️"
- Two info chips: "🕐 Delivery: Lun–Sáb 11 a 15hs" and "📍 Vega Maipú"
- A "¿Cómo pedimos?" button that scrolls to an info section at the bottom

### 3. Category navigation (sticky below header)
- Horizontal scrollable tab bar, one tab per category from menu-data.json
- Show category icon + name
- Clicking a tab scrolls to that section
- Active tab highlighted in yellow

### 4. Menu sections
- One section per category, with section header matching the yellow brush-stroke style (use a yellow left border or yellow background on the title)
- Item cards in a single column (mobile) or 2-column grid (desktop ≥ 768px)
- Each card shows:
  - Item name (bold, white)
  - Description (small, gray)
  - Price (yellow, formatted as `$14.000` — Argentine peso dot separator)
  - **Add button** (`+`) — clicking adds 1 to cart and shows a brief animation
  - If item already in cart: show quantity controls (− qty +) inline on the card
  - For items with `options` array (pasta sauces): show a small select dropdown BEFORE adding to cart. Label: "Salsa:"
- The "Promos" category should have a highlighted card style (yellow border, slightly larger)

### 5. Cart Drawer (slide-in from right, or bottom sheet on mobile)
- Opens when cart icon or "Ver pedido" is tapped
- Lists all cart items with name, option if any, quantity controls (−/+), subtotal
- Remove item button (×)
- Order total at the bottom
- **Customer form** (inside the drawer):
  - "Tu nombre:" (text input, required)
  - "Tipo de pedido:" (radio buttons: "🛵 Delivery" / "🏪 Retiro en local")
  - "Notas adicionales:" (textarea, optional, placeholder: "Aclaraciones, alergias, etc.")
- **"Hacer pedido por WhatsApp" button** (green, full width):
  - Validates that name is filled and cart is not empty
  - Opens `https://wa.me/5492944208323` with a pre-filled message in this exact format:

```
🍽️ *Nuevo pedido - Pipón Pipón*

👤 *Nombre:* {name}
📦 *Tipo:* {Delivery / Retiro en local}

*Pedido:*
• {qty}x {item name}{option} — ${subtotal}
(one line per item)

💰 *Total: ${total}*

📝 *Notas:* {notes or "Sin notas"}
```

### 6. Info section (footer area)
- "¿Cómo pedimos?" section with 3 steps:
  1. 📋 Elegí tus platos del menú
  2. 🛒 Agregá al carrito y completá tus datos
  3. 💬 Confirmá tu pedido por WhatsApp
- Business info card:
  - 📍 Gregorio Álvarez y esq. Luis Borges, Vega Maipú
  - 🕐 Delivery: Lunes a Sábados 11:00 a 15:00
  - 🏪 Mostrador: Lunes a Sábados 09:00 a 15:00
  - 📱 WhatsApp: 2944208323
  - Instagram link: @piponpipon.sma → https://www.instagram.com/piponpipon.sma/
- "Servicio de viandas para empresas — Consultanos 📩" CTA

## State management
- Use React `useState` / `useReducer` for cart state — no external state library needed
- Cart state: array of `{ id, name, price, qty, option? }`
- Persist cart to `localStorage` so it survives page refresh

## Key UX rules
- **Mobile-first** — design for 375px width first, then expand
- Smooth scroll to category sections when tab is clicked
- Add-to-cart action shows a brief scale animation on the button
- When cart is empty and user taps cart icon, show an empty state: "Tu carrito está vacío 🛒"
- Format all prices as Argentine pesos: `$14.000` (dot as thousands separator, no decimals)
- The WhatsApp button must be accessible on mobile without zooming

## File structure to create
```
piponpipon-order-system/
├── public/
│   └── logo.svg           ← (already provided, copy here)
├── src/
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── Hero.jsx
│   │   ├── CategoryNav.jsx
│   │   ├── MenuSection.jsx
│   │   ├── ItemCard.jsx
│   │   ├── CartDrawer.jsx
│   │   └── InfoSection.jsx
│   └── utils/
│       ├── formatPrice.js   ← formats number to "$14.000"
│       └── buildWhatsappMsg.js
├── menu-data.json           ← (already provided)
├── index.html
├── vite.config.js
└── package.json
```

## Deliverable
A fully working React + Vite app. Run `npm install && npm run dev` and the ordering system should be fully functional at localhost:5173. `npm run build` should produce a deployable `dist/` folder ready for Netlify, Vercel, or GitHub Pages.
