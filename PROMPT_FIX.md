# Fix prompt — Pipón Pipón ordering system

Please apply the following fixes to the existing React app:

---

## 1. Fix the logo

The current `logo.svg` is a full design sheet with multiple logo variants — do NOT use it as an `<img>` tag or inline SVG because it renders the entire artboard.

**Replace** the logo in the Header with a styled text-based logo component:
```jsx
<div className="logo-mark">
  <span className="logo-icon">🍽️</span>
  <span className="logo-text">Pipón<span className="logo-accent">Pipón</span></span>
</div>
```
Style it:
- `logo-text`: font-weight 800, font-size 1.2rem, color white, letter-spacing -0.5px
- `logo-accent`: color `#F27900`
- `logo-icon`: font-size 1.4rem, margin-right 8px

This will be replaced later when the client exports a clean single-logo SVG. For now the text mark looks sharp.

---

## 2. Fix all colors — replace yellow with orange

**Find and replace every instance of `#F5C400` and `#f5c400` with `#F27900`.**

This includes: active tab indicator, add-to-cart buttons, price text, category section headers, promo card borders, "Ver pedido" floating button, "Hacer pedido por WhatsApp" button, any other yellow accent.

The brand primary color is **`#F27900`** (orange), not yellow.

Secondary/hover shade: `#D96800` (darker orange for hover states).

---

## 3. Add food photography to category cards

Add a **category hero image** at the top of each menu section (below the section title, above the item cards). Use a 100% wide, 180px tall image with `object-fit: cover` and a slight dark overlay gradient at the bottom so the section title remains readable.

Use these specific Unsplash URLs (free, no API key needed):

| Category | URL |
|---|---|
| Nuestra Cocina | `https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&h=360&fit=crop&q=80` |
| Ensaladas | `https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=360&fit=crop&q=80` |
| Pastas Caseras | `https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&h=360&fit=crop&q=80` |
| Tartas | `https://images.unsplash.com/photo-1565299543923-37dd37887442?w=800&h=360&fit=crop&q=80` |
| Promos | `https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=360&fit=crop&q=80` |
| Postres | `https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&h=360&fit=crop&q=80` |
| Bebidas | `https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&h=360&fit=crop&q=80` |

Style the category image:
```css
.category-hero {
  width: 100%;
  height: 160px;
  object-fit: cover;
  border-radius: 12px;
  margin-bottom: 16px;
  display: block;
}
```

---

## 4. Add a small thumbnail to each item card

In each item card, show a small food photo (60x60px, rounded, right-aligned) pulled from Unsplash using the item category as keyword. Add a `photo` field in the item card component:

- Use `https://images.unsplash.com/photo-{id}?w=120&h=120&fit=crop&q=80` inline
- Map category id to a thumbnail photo:

```js
const categoryPhotos = {
  cocina: "1546833999-b9f581a1996d",
  ensaladas: "1512621776951-a57141f2eefd",
  pastas: "1621996346565-e3dbc646d9a9",
  tartas: "1565299543923-37dd37887442",
  promos: "1504674900247-0877df9cc836",
  postres: "1551024601-bec78aea704b",
  bebidas: "1544145945-f90425340c7e",
};
```

Use the category thumbnail for all items within that category. The thumbnail sits in the top-right of the card, 64x64px, border-radius 8px, object-fit cover.

Card layout becomes:
```
[ Name (bold)           [photo] ]
[ Description (gray)           ]
[ $Price     [− qty +]         ]
```

---

## 5. Mobile refinements

- On screens < 768px: item cards should be **single column** (full width), not 2-column grid
- The floating "Ver pedido" button: make it wider (min-width: 200px) and ensure it doesn't overlap the last card — add `padding-bottom: 80px` to the menu sections container
- Category nav tabs: ensure they scroll horizontally on mobile with `-webkit-overflow-scrolling: touch` and no visible scrollbar (`scrollbar-width: none`)
- Hero section: reduce font size to 1.4rem on mobile

---

## 6. Minor copy fix

In the Hero section, change the delivery chip icon from `|0|` to `🕐` (it was rendering an emoji incorrectly).
