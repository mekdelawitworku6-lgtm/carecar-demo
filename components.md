# Care Car Wash: Component Architecture (`components.md`)

This document maps every React component in the **Care Car Wash** frontend, its role, expected props, and key internal states.

---

## 1. Application Root

### [App.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/App.jsx)
The single root component that orchestrates session restoration, FCM push setup, role-based navigation, and layout switching.

| Concern | Detail |
| :--- | :--- |
| **Layout Modes** | `compact` (< 1024px) → `CompactLayout` with bottom nav; `sidebar` (≥ 1024px) → `Sidebar` + `desktop-header` |
| **Auth Gate** | Renders `<Auth />` when Redux `state.auth.user` is `null` |
| **Role Nav** | `CUSTOMER_NAV`, `BUSINESS_NAV`, `ADMIN_NAV` — mapped from `user.role` |
| **Page Routing** | `renderPage()` switch on `activeTab` dispatches the correct view component |
| **Session Restore** | On mount reads `userId`, `token`, `role`, `fullName`, `phone` from `localStorage` |
| **FCM Setup** | Calls `requestAndRegisterFcmToken()` and subscribes `onForegroundMessage()` |

---

## 2. Layout Components (inside App.jsx)

| Component | Usage | Key Props |
| :--- | :--- | :--- |
| `<CompactLayout>` | Mobile/Tablet wrapper | `user`, `activeTab`, `setActiveTab`, `navItems`, `unreadCount`, `onNotifications`, `toasts` |
| `<Sidebar>` | Desktop fixed sidebar | `user`, `activeTab`, `setActiveTab`, `onLogout` |
| `<BottomNav>` | Mobile sticky bottom bar | `items[]`, `activeTab`, `setActiveTab` |
| `<MobileTopBar>` | Mobile top bar with bell | `title`, `unreadCount`, `onNotifications` |
| `<ToastList>` | Global toast overlays | `toasts[]` |

---

## 3. Page Components

### [Auth.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Auth.jsx)
*   **Actors:** All 3 (Customer, Business Owner, Admin)
*   **Key Props:** `onAuthSuccess(userData)`, `showToast(msg, type)`
*   **Internal States:** `step` (phone → otp → register), `phone`, `otp`, `role` selection, `loading`
*   **API Calls:** `api.auth.sendOtp()`, `api.auth.verifyOtp()`, `api.auth.login()`, `api.auth.register()`

---

### [Dashboard.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Dashboard.jsx)
*   **Actors:** All 3 (renders role-specific sub-component)
*   **Key Props:** `user`, `setActiveTab(tab)`, `setSelectedBusiness(biz)`, `showToast`
*   **Sub-Components:**

| Sub-Component | Role | Description |
| :--- | :--- | :--- |
| `<CustomerDashboard>` | `CUSTOMER` | Stats, provider map/list, search & filter, quick actions |
| `<BusinessOwnerDashboard>` | `BUSINESS_OWNER` | KPI stats, revenue/service/peak charts |
| `<AdminDashboard>` | `ADMIN` | Platform stats, analytics charts, pending approval alert |
| `<BusinessProfileModal>` | Customer | Provider detail modal with reviews + Book button |
| `<StatCard>` | All | Reusable KPI stat tile with optional click nav |
| `<CompanyCard>` | Customer | Business list card with cover image and distance |
| `<MapBoundsUpdater>` | Customer | Leaflet map auto-fit bounds helper |

---

### [Bookings.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Bookings.jsx)
*   **Actors:** `CUSTOMER`
*   **Key Props:** `user`, `showToast`
*   **Description:** Multi-step booking flow: select business → select vehicle → select date & slot → confirm + Telebirr/cash payment.

---

### [OwnerBookings.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/OwnerBookings.jsx)
*   **Actors:** `BUSINESS_OWNER`
*   **Key Props:** `user`, `showToast`
*   **Description:** Filterable booking queue list. Lets owners accept, reject, and assign bookings to workers.

---

### [BusinessOwnerPanel.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/BusinessOwnerPanel.jsx)
*   **Actors:** `BUSINESS_OWNER`
*   **Key Props:** `user`, `showToast`, `setActiveTab`
*   **Description:** Business registration + profile editor. Manages GPS coordinates, photos, phone, and the wash service catalog (name, price, duration).

---

### [WorkerManagement.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/WorkerManagement.jsx)
*   **Actors:** `BUSINESS_OWNER`
*   **Key Props:** `user`, `showToast`
*   **Description:** Add/delete workers, toggle worker active status, view total washes completed per worker.

---

### [Slots.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Slots.jsx)
*   **Actors:** `CUSTOMER` (read-only browse), `BUSINESS_OWNER` (generate/manage)
*   **Key Props:** `user`, `showToast`
*   **Description:** Renders a date-picker and slot calendar. Business owners can generate slots over a date range and block specific hours.

---

### [Payments.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Payments.jsx)
*   **Actors:** `BUSINESS_OWNER`, `ADMIN`
*   **Key Props:** `user`, `showToast`
*   **Description:** Transaction history list with filters. Admin sees all-platform; Business Owner sees own business revenue.

---

### [AdminPanel.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/AdminPanel.jsx)
*   **Actors:** `ADMIN`
*   **Key Props:** `user`, `showToast`
*   **Description:** Tabbed panel — User Management (list users, activate/deactivate), Business Approvals (approve/suspend), and platform stats.

---

### [Notifications.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Notifications.jsx)
*   **Actors:** All 3
*   **Key Props:** `showToast`
*   **Sub-Components:** `<NotifCard>` (list item), `<NotifModal>` (detail popup)
*   **Description:** Notification log grouped by date. Unread items highlighted with a left accent border. "Mark all read" button.

---

### [Vehicles.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Vehicles.jsx)
*   **Actors:** `CUSTOMER`
*   **Key Props:** `showToast`
*   **Description:** Vehicle CRUD. Fields: brand, model, licensePlate, size (SMALL/MEDIUM/LARGE/SUV/TRUCK). Can set one vehicle as default.

---

### [Profile.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Profile.jsx)
*   **Actors:** All 3
*   **Key Props:** `user`, `showToast`, `onLogout`, `setActiveTab`
*   **Description:** Profile viewer/editor. Fields: firstName, lastName, email. Delete account via 6-digit OTP flow.

---

## 4. Shared / Utility Components (inside pages)

| Component | File | Description |
| :--- | :--- | :--- |
| `<StatCard>` | Dashboard.jsx | KPI tile — title, value, icon, loading skeleton, click nav |
| `<CompanyCard>` | Dashboard.jsx | Provider card with photo, distance, and "View Profile" CTA |
| `<BusinessProfileModal>` | Dashboard.jsx | Popup with business info + customer reviews + Book button |
| `<NotifCard>` | Notifications.jsx | Single notification row with unread highlight |
| `<NotifModal>` | Notifications.jsx | Full notification detail overlay |
| `<MapBoundsUpdater>` | Dashboard.jsx | Leaflet `useMap()` hook to auto-fit marker bounds |
