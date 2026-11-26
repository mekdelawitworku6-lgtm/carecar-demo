# Care Car Wash: Utility Classes & Layout System (`styles.md`)

This document maps every global CSS class available in [index.css](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/index.css). Always use these classes instead of writing ad-hoc inline styles.

---

## 1. App Shell & Layout Containers

| Class | Description |
| :--- | :--- |
| `.app-shell` | Root flex container for desktop sidebar layout (≥ 1024px) |
| `.layout-compact` | Root flex column container for mobile/tablet (< 1024px) |
| `.mobile-container` | Full-height scrollable body area inside compact layout |
| `.main-with-sidebar` | Main content area offset by `--sidebar-width` on desktop |
| `.main-content-area` | Padded content wrapper inside the desktop sidebar layout |
| `.page-content` | Padded page body inside compact layout (above bottom nav) |
| `.page-content-no-nav` | Padded page body with no bottom nav offset |

---

## 2. Navigation

### Mobile Top Bar
| Class | Description |
| :--- | :--- |
| `.mobile-topbar` | Sticky top bar with title + bell icon (compact mode) |
| `.mobile-topbar-title` | Page title text inside the top bar |
| `.mobile-topbar-btn` | Icon button in the top bar (e.g., notification bell) |
| `.mobile-topbar-badge` | Red unread count dot on the bell icon |

### Bottom Navigation
| Class | Description |
| :--- | :--- |
| `.bottom-nav` | Sticky bottom tab bar (compact mode) |
| `.nav-item` | Individual nav tab button |
| `.nav-item.active` | Active tab — color changes to `--primary` |
| `.nav-item-label` | 10px label text below each icon |
| `.nav-dot` | 4px primary-colored dot under active icon |

### Desktop Sidebar
| Class | Description |
| :--- | :--- |
| `.sidebar` | Fixed left sidebar — 280px wide on desktop, 72px collapsed on tablet |
| `.sidebar-logo` | Logo row at the top of the sidebar |
| `.sidebar-logo-icon` | Gradient icon box (primary → primary-light) |
| `.sidebar-logo-text` | "Care Car Wash" text beside the logo icon |
| `.sidebar-nav` | Flex column of navigation buttons |
| `.sidebar-item` | Nav button — hover state: `bg-surface`; active: `primary-bg` + left inset border |
| `.sidebar-item.active` | Highlighted active tab in sidebar |
| `.sidebar-footer` | Bottom of sidebar with avatar + sign-out button |
| `.sidebar-user` | User info row (avatar + name + role) |
| `.sidebar-avatar` | Circular avatar container |
| `.sidebar-user-name` | 14px bold user full name |
| `.sidebar-user-role` | 10px uppercase muted role label |

---

## 3. Cards

| Class | Description |
| :--- | :--- |
| `.card` | Base card — white bg, 16px radius, subtle border + shadow |
| `.card-sm` | Compact card — 12px padding, 12px radius |
| `.card-lg` | Large card — 20px padding, 24px radius |
| `.glass-card` | Alias of `.card` (legacy compatibility) |
| `.company-card` | Provider listing card — hover lifts 2px |
| `.company-card-img` | 140px cover image inside company card |
| `.company-card-body` | 12px padded card body section |
| `.company-card-name` | 15px bold business name |
| `.company-card-meta` | 12px muted row with icon + text (location, phone) |
| `.company-card-link` | 12px primary-colored "View Profile" link |
| `.service-card` | Service type selector tile — selected state fills with primary |
| `.service-card.selected` | Filled with `--primary` color |
| `.date-slot-item` | Date/slot row item — selected state: `primary-bg` border |
| `.date-slot-item.selected` | Highlighted selected slot |
| `.location-card` | Location/queue info panel |

---

## 4. Buttons

| Class | Description |
| :--- | :--- |
| `.btn` | Base pill button — 14px 24px padding, `--radius-full` |
| `.btn-primary` | Solid blue/orange fill with glow shadow |
| `.btn-secondary` | Transparent with primary border |
| `.btn-ghost` | Transparent with `--border` border |
| `.btn-danger` | Red fill (for delete/cancel actions) |
| `.btn-success` | Green fill (for confirm actions) |
| `.btn-full` | `width: 100%` full-width button |
| `.btn-sm` | Smaller button — 8px 16px padding, 13px font |
| `.btn-icon` | Square icon button 40×40px |
| `.glass-btn` | Alias of `.btn-primary` (legacy compatibility) |
| `.glass-btn-secondary` | Alias of `.btn-secondary` |
| `.glass-btn-danger` | Alias of `.btn-danger` |
| `.glass-btn-success` | Alias of `.btn-success` |

---

## 5. Form Inputs

| Class | Description |
| :--- | :--- |
| `.form-group` | Flex column wrapper for label + input |
| `.form-label` | 14px medium-weight label |
| `.form-input` | Padded input — light bg, border, focus ring in primary |
| `.form-input:focus` | Blue/orange border + primary-tinted box shadow |
| `.form-input-error` | Red border on invalid state |
| `.form-input-icon-wrap` | Relative-positioned wrapper for icon inside input |
| `.form-input-icon` | Absolute icon on the left inside an input |
| `.form-input-icon-right` | Absolute icon on the right (e.g., password toggle) |
| `.form-error` | 12px red error message text |
| `.glass-input` | Alias of `.form-input` (legacy compatibility) |
| `.checkbox-label` | Flex row for checkbox + label text |

---

## 6. Badges & Status Pills

| Class | Description |
| :--- | :--- |
| `.badge` | Base pill badge — uppercase, small, letter-spaced |
| `.badge-pending` | Yellow — for PENDING status |
| `.badge-confirmed` | Primary — for CONFIRMED status |
| `.badge-completed` | Green — for COMPLETED status |
| `.badge-cancelled` | Red — for CANCELLED status |
| `.badge-info` | Blue — for info-type tags |

---

## 7. Alerts & Banners

| Class | Description |
| :--- | :--- |
| `.alert` | Base alert block — 12px 14px padding |
| `.alert-info` | Blue tinted info alert |
| `.alert-success` | Green tinted success alert |
| `.alert-warning` | Yellow tinted warning alert |
| `.alert-danger` | Red tinted danger/error alert |

---

## 8. Grid & Layout Utilities

| Class | Columns | Gap | Use Case |
| :--- | :--- | :--- | :--- |
| `.grid-2` | 2 equal cols | 16px | Admin/owner stat pairs |
| `.grid-auto` | Auto-fit ≥ 200px | 16px | Analytics chart cards |
| `.grid-auto-sm` | Auto-fit ≥ 140px | 10px | Edit form field groups |
| `.grid-auto-md` | Auto-fit ≥ 160px | 12px | Medium field groups |
| `.grid-cards` | Auto-fill ≥ 280px | 16px | General card grids |
| `.grid-services` | Auto-fill ≥ 130px | 12px | Service selector tiles |
| `.grid-slots` | Auto-fill ≥ 72px | 10px | Time slot picker grid |
| `.grid-stats-sm` | 3 cols (responsive 2→1) | 10px | Customer 3-stat row |
| `.grid-form` | Auto-fit ≥ 220px | 16px | Multi-column form fields |
| `.company-grid` | Auto-fill ≥ 260px | 16px | Provider listing cards |

---

## 9. Page Hero & Section Headers

| Class | Description |
| :--- | :--- |
| `.page-hero` | Top margin hero section wrapper |
| `.page-hero-eyebrow` | 13px muted label above the title |
| `.page-hero-title` | 24px bold page title (responsive up to `clamp(1.75rem)` on desktop) |
| `.section-header` | Flex row — title left, "See all" link right |
| `.section-header-title` | 16px (18px on desktop) section heading |
| `.section-header-link` | 12px primary link button (hover: primary-bg tint) |

---

## 10. Notification & Slot Components

| Class | Description |
| :--- | :--- |
| `.notif-card` | Notification row card — hover lifts shadow |
| `.notif-card.unread` | Unread card — 3px primary left accent border |
| `.notif-title` | 14px bold notification type in primary color |
| `.notif-title.read` | Muted color for read notifications |
| `.notif-body` | 13px muted description text |
| `.notif-time` | 11px muted timestamp |
| `.notif-section-header` | 15px date group label (Today, Yesterday, etc.) |
| `.slot-btn` | Time slot picker button |
| `.slot-btn.selected` | Selected slot — primary fill + glow |

---

## 11. Modal, Overlay & Auth

| Class | Description |
| :--- | :--- |
| `.modal-overlay` | Fixed full-screen backdrop with blur |
| `.modal-box` | Centered card content box — max 360px |
| `.auth-wrapper` | Centered login page layout |
| `.auth-card` | Login/register form card — max 400px |
| `.auth-title` | 28px bold centered title |
| `.auth-subtitle` | 14px muted centered subtitle |

---

## 12. Miscellaneous Utilities

| Class | Description |
| :--- | :--- |
| `.skeleton` | Shimmer loading placeholder |
| `.divider` | 1px horizontal rule |
| `.empty-state` | Centered muted placeholder (icon + text) |
| `.img-placeholder` | Gradient placeholder when image fails to load |
| `.slide-in` | Applies `slide-in` keyframe animation on mount |
| `.action-list` | Flex column of ghost action buttons |
| `.notif-list-desktop` | Flex column of notification cards |
| `.quick-actions` | Flex column of primary CTA buttons |
| `.tabs` | Pill tab group container |
| `.tab-item` | Individual tab button |
| `.tab-item.active` | Active tab — white bg + primary text + shadow |
