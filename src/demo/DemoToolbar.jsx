import { useState } from 'react'
import { useSelector } from 'react-redux'
import {
  Car, Store, ShieldCheck, RotateCcw, SlidersHorizontal, X,
  LayoutDashboard, CalendarDays, Building2, CarFront, UserRound, Bell,
  Users, BarChart3, CreditCard, Shield, MapPinned, ChevronRight,
} from 'lucide-react'
import store from '../store'
import { selectActiveTab, setActiveTab } from '../store/uiSlice'
import { switchDemoRole, resetDemoData } from './actions'
import { getDemoRole, ROLE_LABELS } from './session'
import './demo.css'

const ROLES = [
  { id: 'CUSTOMER', icon: Car, hint: 'Book & track washes' },
  { id: 'BUSINESS_OWNER', icon: Store, hint: 'Run a wash station' },
  { id: 'ADMIN', icon: ShieldCheck, hint: 'Operate the platform' },
]

const SCREENS = {
  CUSTOMER: [
    { id: 'dashboard', label: 'Home / Explore', icon: LayoutDashboard },
    { id: 'bookings', label: 'My Bookings', icon: CalendarDays },
    { id: 'slots', label: 'Providers & Slots', icon: MapPinned },
    { id: 'vehicles', label: 'My Garage', icon: CarFront },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'Account', icon: UserRound },
  ],
  BUSINESS_OWNER: [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'bookings', label: 'Bookings Queue', icon: CalendarDays },
    { id: 'business', label: 'Station Profile', icon: Building2 },
    { id: 'slots', label: 'Bay Time Slots', icon: MapPinned },
    { id: 'workers', label: 'Staff Workers', icon: Users },
    { id: 'reports', label: 'Reports & Stats', icon: BarChart3 },
    { id: 'payments', label: 'Revenue & Payouts', icon: CreditCard },
    { id: 'profile', label: 'Settings', icon: UserRound },
  ],
  ADMIN: [
    { id: 'dashboard', label: 'Overview Stats', icon: LayoutDashboard },
    { id: 'admin', label: 'Approvals & Ops', icon: Shield },
    { id: 'payments', label: 'Payments & Fees', icon: CreditCard },
    { id: 'notifications', label: 'Audit Logs', icon: Bell },
    { id: 'profile', label: 'Admin Profile', icon: UserRound },
  ],
}

export default function DemoToolbar() {
  const [open, setOpen] = useState(false)
  const activeTab = useSelector(selectActiveTab)
  const role = getDemoRole()

  const goTo = (tab) => {
    switchDemoRole(role)
    // switchDemoRole resets to dashboard, so navigate afterwards.
    store.dispatch(setActiveTab(tab))
    setOpen(false)
  }

  return (
    <div className="demo-toolbar">
      {open && (
        <div className="demo-panel">
          <div className="demo-panel-head">
            <div>
              <div className="demo-panel-title">Explore the demo</div>
              <div className="demo-panel-sub">Switch roles or jump to any screen</div>
            </div>
            <button className="demo-icon-btn" onClick={() => setOpen(false)} aria-label="Close demo panel">
              <X size={16} />
            </button>
          </div>

          <div className="demo-section-label">VIEW AS</div>
          <div className="demo-role-list">
            {ROLES.map(({ id, icon: Icon, hint }) => (
              <button
                key={id}
                className={`demo-role-btn${role === id ? ' active' : ''}`}
                onClick={() => { switchDemoRole(id); setOpen(false) }}
              >
                <span className="demo-role-icon"><Icon size={17} /></span>
                <span className="demo-role-copy">
                  <strong>{ROLE_LABELS[id]}</strong>
                  <small>{hint}</small>
                </span>
                <ChevronRight size={15} className="demo-role-chevron" />
              </button>
            ))}
          </div>

          <div className="demo-section-label">JUMP TO SCREEN</div>
          <div className="demo-screen-grid">
            {SCREENS[role].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`demo-screen-btn${activeTab === id ? ' active' : ''}`}
                onClick={() => goTo(id)}
              >
                <Icon size={15} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <button className="demo-reset" onClick={() => { resetDemoData(); setOpen(false) }}>
            <RotateCcw size={14} /> Reset sample data
          </button>
          <p className="demo-footnote">
            All data is simulated in your browser. Bookings, approvals and payments
            are safe to try — nothing leaves this page.
          </p>
        </div>
      )}

      <button className={`demo-fab${open ? ' open' : ''}`} onClick={() => setOpen(v => !v)}>
        {open ? <X size={18} /> : <SlidersHorizontal size={18} />}
        <span>{open ? 'Close' : 'Demo menu'}</span>
        <span className="demo-fab-role">{ROLE_LABELS[role]}</span>
      </button>
    </div>
  )
}
