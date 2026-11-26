# CareCar — Interactive Portfolio Demo

A **clickable, backend-free demo** of the CareCar on-demand car wash platform. It runs entirely in the browser with realistic sample data, so a recruiter can explore every role and every screen without spinning up microservices, a database, Redis, or Firebase.

> This folder is a standalone repo: copy/push **the contents of this folder** to your own GitHub repository (e.g. `github.com/mekdelawitworku6-lgtm/carecar-demo`) and deploy it on Render as a Static Site.

---

## What's included

| Role | What you can explore |
|------|----------------------|
| **Customer** | Home & station discovery, nearby providers, service selection, time-slot booking, live booking tracker, my garage/vehicles, notifications, account |
| **Business Owner** | Dashboard & analytics, bookings queue, station profile, services & pricing, bay/slot management, worker management, reports, revenue & payouts |
| **Admin** | Platform overview, pending business approvals, user management, payments & fees, audit logs, admin profile |

Every button, modal, tab, filter, form and mock transaction works — writes update in-browser state and are reflected across screens. Use the floating **Demo menu** (bottom-right) to switch roles, jump to any screen, or reset the sample data.

---

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:4173>. No `.env` file, backend, or extra services are required.

```bash
npm run build     # outputs ./dist
npm run preview   # serve the production build locally
```

---

## Deploy on Render (Static Site)

### Option A — Blueprint (fastest)

1. Create a new GitHub repo under your account and push this folder's contents to its `main` branch:
   ```bash
   cd portfolio-demo
   git init -b main
   git add .
   git commit -m "CareCar interactive portfolio demo"
   git remote add origin https://github.com/mekdelawitworku6-lgtm/carecar-demo.git
   git push -u origin main
   ```
2. In Render, click **New + → Blueprint** and select that repo.
3. Render reads `render.yaml` and creates the site automatically.

### Option B — Manual Static Site

1. **New + → Static Site** → connect your repo.
2. Settings:
   - **Build command:** `npm ci && npm run build`
   - **Publish directory:** `dist`
   - **Branch:** `main`
   - **Node version:** `22` (set automatically by `render.yaml` in the Blueprint flow)
3. No environment variables are needed. Click **Create Static Site**.

Your demo will be live at the Render-provided `onrender.com` URL, which you can add to your portfolio and CV.

> Because this is a purely client-side app with no routing, no SPA rewrite rules or rewrite config are needed.

---

## How it works

- `src/demo/mockDb.js` holds all fixture data (users, businesses, services, slots, bookings, vehicles, workers, payments, notifications, analytics).
- `src/demo/mockApi.js` implements the same `api.*` interface as the production app, backed by localStorage so mutations persist across reloads.
- `src/demo/session.js` writes a fake JWT session into the same localStorage keys the real app uses.
- `src/demo/DemoToolbar.jsx` and `src/demo/DemoLogin.jsx` provide role switching and screen shortcuts.
- `src/firebase.js` is a no-op stub — no permission prompts and no network calls.

The components under `src/components/` are the **real UI** from the main project. Only the two raw Telebirr/cash handlers in `Bookings.jsx` were redirected to the demo payment mock; everything else is unchanged, which keeps this an honest demo of the actual frontend.

---

## Tech stack

React 19 · Vite 8 · Redux Toolkit · Recharts · Lucide React · Plain CSS variables

---

## Portfolio talking points

- Architected a multi-role marketplace (customer, business owner, admin) with role-aware navigation and authorization boundaries.
- Built a backend-free demo harness that mirrors the production API contract, enabling instant portfolio sharing without infrastructure cost.
- Modelled a complex domain: time-slot inventory, worker assignment, booking lifecycles, payments/revenue, and platform moderation.
- Designed responsive dashboards with reusable components, animated states, charts, and real-time-style status updates.
