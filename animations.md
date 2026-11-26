# Care Car Wash: Animations & Motion Design (`animations.md`)

This document catalogs every animation, transition, and micro-interaction defined in [index.css](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/index.css) and used across the application.

---

## 1. Global Transition Token

All interactive elements use a single shared easing curve applied via the `--transition` CSS variable:

```css
--transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
```

*   **Duration:** 200ms
*   **Easing:** Material Design standard curve — fast acceleration, smooth deceleration
*   **Applied to:** All `.btn`, `.card`, `.sidebar-item`, `.nav-item`, `.form-input`, `.company-card`, `.slot-btn`, `.notif-card`, `.service-card`, `.date-slot-item`

> **Rule:** Do NOT define custom `transition` values inline. Always inherit from `--transition` unless there is a specific override needed.

---

## 2. Keyframe Animations

### `slide-in`
Used on every page view mount for a smooth entry effect.

```css
@keyframes slide-in {
  from { transform: translateY(12px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
.slide-in { animation: slide-in 0.3s ease-out; }
```

*   **Trigger:** Applied to the `.slide-in` class on the root `<div>` of each page component
*   **Used in:** All page components wrapped in `<div className="slide-in">`

---

### `shimmer`
Skeleton loading animation for content placeholders.

```css
@keyframes shimmer {
  0%   { background-position:  200% 0; }
  100% { background-position: -200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, var(--bg-surface) 25%, var(--border) 50%, var(--bg-surface) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}
```

*   **Trigger:** Applied to `.skeleton` divs during data loading states
*   **Used in:** Dashboard stat cards, company card grids, notification lists, booking forms

---

### `fadeIn`
Backdrop fade for modal overlays.

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.modal-overlay { animation: fadeIn 0.2s ease; }
```

*   **Trigger:** Applied automatically when `.modal-overlay` is rendered
*   **Used in:** `BusinessProfileModal`, `NotifModal`, and all confirmation dialogs

---

### `scaleIn`
Content box entrance scale animation inside modals.

```css
@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}
.modal-box { animation: scaleIn 0.2s ease; }
```

*   **Trigger:** Applied automatically on `.modal-box` mount
*   **Used in:** All modal dialog content boxes

---

### `slideInRight`
Toast notification slide-in from the right side of the screen.

```css
@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
.toast { animation: slideInRight 0.3s ease; }
```

*   **Trigger:** Applied automatically on `.toast` element creation
*   **Used in:** `<ToastList>` — success, error, info, warning toast messages

---

### `spin`
Rotation animation used for loading spinners.

```css
@keyframes spin {
  from { transform: rotate(0deg);   }
  to   { transform: rotate(360deg); }
}
```

*   **Trigger:** Applied inline via `style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}`
*   **Used in:** Refresh button icon in `Notifications.jsx`

---

## 3. Hover Micro-Interactions

### Button Lift (`.btn-primary`, `.glass-btn`)
```css
.btn-primary:hover:not(:disabled) {
  background: var(--primary-dark);
  box-shadow: 0 6px 20px var(--primary-glow);
  transform: translateY(-1px);   /* lifts 1px upward */
}
.btn-primary:active {
  transform: translateY(0);      /* snaps back on click */
}
```

---

### Company Card Lift (`.company-card`)
```css
.company-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);   /* lifts 2px — more pronounced than buttons */
}
```

---

### Card Hover (`.card`, `.glass-card`)
```css
.card:hover { box-shadow: var(--shadow-md); }
```
*   Shadow deepens on hover — no transform, subtle depth change only.

---

### Sidebar & Nav Items
```css
.sidebar-item:hover {
  background: var(--bg-surface);
  color: var(--text-primary);
}
.sidebar-item.active {
  background: var(--primary-bg);
  color: var(--primary);
  font-weight: 600;
  box-shadow: inset 3px 0 0 var(--primary);  /* left accent border */
}
.nav-item.active { color: var(--primary); }
```

---

### Form Input Focus Ring
```css
.form-input:focus {
  border-color: var(--border-active);
  background: var(--bg-card);
  box-shadow: 0 0 0 3px var(--primary-bg);  /* soft primary glow ring */
}
```

---

### Notification Card Hover
```css
.notif-card:hover {
  box-shadow: var(--shadow-sm);
  border-color: var(--primary-light);
}
```

---

### Slot Button Selected State
```css
.slot-btn.selected {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
  box-shadow: 0 2px 8px var(--primary-glow);
}
```

---

## 4. Collapsed Sidebar Tooltip (Tablet Only)

On tablet widths (769px – 1024px) the sidebar collapses to 72px (icons only). Hovering any sidebar item reveals a tooltip via CSS `::after` pseudo-element:

```css
@media (min-width: 769px) and (max-width: 1024px) {
  .sidebar-item[data-label]:hover::after {
    content: attr(data-label);     /* reads from data-label attribute */
    position: absolute;
    left: 80px; top: 50%;
    transform: translateY(-50%);
    background: var(--text-primary); color: var(--bg-card);
    padding: 4px 10px; border-radius: 6px;
    font-size: 12px; font-weight: 600;
    white-space: nowrap; z-index: 999;
    box-shadow: var(--shadow-md);
  }
}
```

---

## 5. Animation Usage Summary

| Animation | Class / Trigger | Duration | Effect |
| :--- | :--- | :--- | :--- |
| `slide-in` | `.slide-in` on page root | 300ms | Page slides up + fades in on tab switch |
| `shimmer` | `.skeleton` | 1500ms ∞ | Pulsing left-to-right shine for loaders |
| `fadeIn` | `.modal-overlay` | 200ms | Backdrop opacity fade |
| `scaleIn` | `.modal-box` | 200ms | Modal content scales from 0.95 to 1 |
| `slideInRight` | `.toast` | 300ms | Toast slides from right edge |
| `spin` | Inline `style` on icon | 1000ms ∞ | Refresh icon rotates |
| Button lift | `.btn-primary:hover` | 200ms | Button moves up 1px + deeper shadow |
| Card lift | `.company-card:hover` | 200ms | Card moves up 2px + deeper shadow |
| Focus ring | `.form-input:focus` | 200ms | Primary-colored ring expands around input |
