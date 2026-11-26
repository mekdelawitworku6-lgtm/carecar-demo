import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, logout, selectUser } from './store/authSlice';
import { setActiveTab, selectActiveTab, addToast, removeToast, incrementUnread, selectUnreadCount, selectToasts, setSelectedBusiness } from './store/uiSlice';
import { api } from './services/api';
import DemoLogin from './demo/DemoLogin';
import DemoToolbar from './demo/DemoToolbar';
import { demoLogout } from './demo/actions';

// ─── Safe lazy page components ───────────────────────────────────────────────
// Wraps React.lazy to gracefully handle post-deployment chunk hash mismatches.
// If an older browser tab requests a stale chunk hash, it reloads the page to get the new manifest.
function safeLazy(importFn) {
  return lazy(async () => {
    try {
      const component = await importFn();
      sessionStorage.removeItem('chunk_reload_retry');
      return component;
    } catch (error) {
      const isChunkError = /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i.test(error?.message || '');
      const lastRetry = sessionStorage.getItem('chunk_reload_retry');
      const now = Date.now();
      if (isChunkError && (!lastRetry || now - Number(lastRetry) > 10000)) {
        sessionStorage.setItem('chunk_reload_retry', String(now));
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });
}

const Auth              = safeLazy(() => import('./components/Auth'));
const Dashboard         = safeLazy(() => import('./components/Dashboard'));
const Vehicles          = safeLazy(() => import('./components/Vehicles'));
const Slots             = safeLazy(() => import('./components/Slots'));
const Bookings          = safeLazy(() => import('./components/Bookings'));
const OwnerBookings     = safeLazy(() => import('./components/OwnerBookings'));
const Notifications     = safeLazy(() => import('./components/Notifications'));
const AdminPanel        = safeLazy(() => import('./components/AdminPanel'));
const BusinessOwnerPanel = safeLazy(() => import('./components/BusinessOwnerPanel'));
const WorkerManagement  = safeLazy(() => import('./components/WorkerManagement'));
const Payments          = safeLazy(() => import('./components/Payments'));
const Profile           = safeLazy(() => import('./components/Profile'));
const ReportsPage       = safeLazy(() => import('./components/ReportsPage'));

import {
  Home, ClipboardList, Building2, User, LayoutDashboard,
  Calendar, Car, Clock, Bell, LogOut, Shield, Users, CreditCard,
  Settings, ChevronRight, Menu, X, Sparkles, Navigation, Check, BarChart3
} from 'lucide-react';
import { registerServiceWorker, requestAndRegisterFcmToken, onForegroundMessage, clearFcmUserRegistration } from './firebase';

/* ─── Bottom Nav items per role ──────────────────────────── */
const CUSTOMER_NAV = [
  { id: 'dashboard', label: 'Home',        icon: Home },
  { id: 'bookings',  label: 'Track Order', icon: ClipboardList },
  { id: 'slots',     label: 'Providers',   icon: Building2 },
  { id: 'vehicles',  label: 'Vehicles',    icon: Car },
  { id: 'profile',   label: 'Account',     icon: User },
];

const BUSINESS_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'bookings',  label: 'Bookings',  icon: Calendar },
  { id: 'business',  label: 'Business',  icon: Building2 },
  { id: 'reports',   label: 'Reports',   icon: BarChart3 },
  { id: 'workers',   label: 'Workers',   icon: Users },
  { id: 'profile',   label: 'Account',   icon: User },
];

const ADMIN_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'admin',     label: 'Admin',     icon: Shield },
  { id: 'payments',  label: 'Payments',  icon: CreditCard },
  { id: 'profile',   label: 'Account',   icon: User },
];

/* ─── Sidebar section categories ───────────── */
function getSidebarSections(role) {
  if (role === 'CUSTOMER') return [
    {
      title: 'Main Menu',
      items: [
        { id: 'dashboard', label: 'Home & Explore', icon: Home },
        { id: 'bookings',  label: 'Track Orders',   icon: ClipboardList },
      ],
    },
    {
      title: 'My Garage',
      items: [
        { id: 'vehicles',  label: 'My Vehicles',    icon: Car },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { id: 'notifications', label: 'Notifications', icon: Bell, isNotif: true },
        { id: 'profile',       label: 'Account & Settings', icon: User },
      ],
    },
  ];
  if (role === 'ADMIN') return [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard',     label: 'Overview Stats',  icon: LayoutDashboard },
      ],
    },
    {
      title: 'Platform Control',
      items: [
        { id: 'admin',         label: 'Approvals & Ops', icon: Shield },
        { id: 'payments',      label: 'Payments & Fees', icon: CreditCard },
      ],
    },
    {
      title: 'System',
      items: [
        { id: 'notifications', label: 'Audit Logs',      icon: Bell, isNotif: true },
        { id: 'profile',       label: 'Admin Profile',   icon: Settings },
      ],
    },
  ];
  if (role === 'BUSINESS_OWNER') return [
    {
      title: 'Business Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard',     icon: LayoutDashboard },
        { id: 'business',  label: 'Station Profile', icon: Building2 },
      ],
    },
    {
      title: 'Operations',
      items: [
        { id: 'bookings',  label: 'Bookings Queue', icon: Calendar },
        { id: 'workers',   label: 'Staff Workers',  icon: Users },
        { id: 'slots',     label: 'Bay Time Slots', icon: Clock },
        { id: 'reports',   label: 'Reports & Stats', icon: BarChart3 },
        { id: 'payments',  label: 'Revenue & Payouts', icon: CreditCard },
      ],
    },
    {
      title: 'Account',
      items: [
        { id: 'notifications', label: 'Alerts',     icon: Bell, isNotif: true },
        { id: 'profile',       label: 'Settings',   icon: Settings },
      ],
    },
  ];
  return [];
}

/* ─── Toast ──────────────────────────────────────────────── */
function ToastList({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'success' && <span style={{ color: 'var(--success)', fontSize: 18 }}>✓</span>}
          {t.type === 'error'   && <span style={{ color: 'var(--danger)',  fontSize: 18 }}>✕</span>}
          {t.type === 'info'    && <span style={{ color: 'var(--primary)', fontSize: 18 }}>ℹ</span>}
          {t.type === 'warning' && <span style={{ color: 'var(--warning)', fontSize: 18 }}>!</span>}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Bottom Nav (mobile floating bar) ────────────────────── */
function BottomNav({ items, activeTab, setActiveTab }) {
  return (
    <nav className="bottom-nav">
      {items.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <button key={id} className={`nav-item${active ? ' active' : ''}`} onClick={() => setActiveTab(id)}>
            <Icon size={21} strokeWidth={active ? 2.5 : 2} />
            <span className="nav-item-label">{label}</span>
            {active && <span className="nav-dot" />}
          </button>
        );
      })}
    </nav>
  );
}

/* ─── Modern Sidebar ──────────────────────────────────────── */
function Sidebar({ user, activeTab, setActiveTab, onLogout, isOpen, onClose, unreadCount }) {
  const sections = getSidebarSections(user.role);
  const roleLabel = user.role?.replace(/_/g, ' ') || 'CUSTOMER';
  const roleClass = user.role === 'ADMIN' ? 'role-chip-admin'
                  : user.role === 'BUSINESS_OWNER' ? 'role-chip-owner'
                  : 'role-chip-customer';

  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}`}>
      <div>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Car size={22} color="#fff" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="sidebar-logo-text">
              CareCar <span className="sidebar-brand-badge">PRO</span>
            </span>
          </div>
          {isOpen && (
            <button
              onClick={onClose}
              className="header-menu-btn"
              style={{ marginLeft: 'auto', display: 'flex' }}
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="sidebar-network-status">
          <span className="sidebar-pulse-dot" />
          <span>Live Network Online</span>
        </div>

        <nav className="sidebar-nav">
          {sections.map((section, sIdx) => (
            <div key={sIdx} style={{ marginBottom: 8 }}>
              <div className="sidebar-section-title">{section.title}</div>
              {section.items.map(({ id, label, icon: Icon, badge, isNotif }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    data-label={label}
                    className={`sidebar-item${active ? ' active' : ''}`}
                    onClick={() => { setActiveTab(id); onClose(); }}
                    title={label}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                    {isNotif && unreadCount > 0 && (
                      <span className="sidebar-item-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                    )}
                    {!isNotif && badge && (
                      <span className="sidebar-item-badge">{badge}</span>
                    )}
                    {active && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.7 }} />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {user.role === 'CUSTOMER' && (
          <div className="sidebar-promo-widget">
            <div className="sidebar-promo-title">
              <Sparkles size={14} /> Quick Wash Near You
            </div>
            <div className="sidebar-promo-sub">
              Within 1.5 km radius with live queue tracker
            </div>
            <button
              type="button"
              className="sidebar-promo-btn"
              onClick={() => { setActiveTab('dashboard'); onClose(); }}
            >
              Find Stations →
            </button>
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar"><User size={18} /></div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="sidebar-user-name" title={user.fullName || 'User'}>
              {user.fullName || 'User'}
            </div>
            <span className={`role-chip ${roleClass}`}>
              {roleLabel}
            </span>
          </div>
        </div>
        <button className="btn btn-ghost btn-full btn-sm" onClick={onLogout} style={{ gap: 8 }}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </aside>
  );
}

/* ─── Modern App Header Bar ───────────────────────────────── */
function DesktopHeader({ user, activeTab, pageTitle, unreadCount, openNotifications, onOpenMenu, setActiveTab }) {
  return (
    <header className="desktop-header">
      <div className="header-left-cluster">
        <button
          type="button"
          className="header-menu-btn"
          onClick={onOpenMenu}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="header-breadcrumb">
          <span className="header-breadcrumb-tag">CareCar Platform</span>
          <h2 className="desktop-header-title">{pageTitle}</h2>
        </div>
      </div>

      <div className="desktop-header-actions">
        <div className="header-status-chip">
          <span className="sidebar-pulse-dot" />
          <span>Operational</span>
        </div>

        {user.role === 'CUSTOMER' && activeTab !== 'bookings' && (
          <button
            type="button"
            className="header-action-cta"
            onClick={() => setActiveTab('bookings')}
          >
            <Calendar size={14} /> Book Wash
          </button>
        )}

        <button
          id="header-notifications-btn"
          className="desktop-header-icon-btn"
          onClick={openNotifications}
          aria-label="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="desktop-header-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>

        <div
          className="desktop-header-user"
          onClick={() => setActiveTab('profile')}
          title="View Account"
        >
          <div className="desktop-header-avatar">
            <User size={15} />
          </div>
          <span className="desktop-header-user-name">
            {user.fullName?.split(' ')[0] || 'User'}
          </span>
        </div>
      </div>
    </header>
  );
}

// ─── Page skeleton (Suspense fallback) ────────────────────────────────────────
function PageSkeleton() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flex: 1, height: '100%', minHeight: 200,
    }}>
      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{
          width: 32, height: 32, border: '3px solid var(--primary)',
          borderTopColor: 'transparent', borderRadius: '50%',
          animation: 'spin 0.7s linear infinite', margin: '0 auto 12px',
        }} />
        <span style={{ fontSize: 13 }}>Loading…</span>
      </div>
    </div>
  );
}

// ─── Error Boundary ─────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Page Crash]', error, errorInfo);
    const isChunkError = /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i.test(error?.message || '');
    const lastRetry = sessionStorage.getItem('chunk_reload_retry');
    const now = Date.now();
    if (isChunkError && (!lastRetry || now - Number(lastRetry) > 10000)) {
      sessionStorage.setItem('chunk_reload_retry', String(now));
      window.location.reload();
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.activeTab !== this.props.activeTab && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      const isChunkError = /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i.test(this.state.error?.message || '');
      return (
        <div className="card" style={{ padding: '40px 24px', textAlign: 'center', margin: '20px auto', maxWidth: 480 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--danger-bg)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 20, fontWeight: 800 }}>
            ✕
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Unable to display this page
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            {this.state.error?.message || 'An unexpected error occurred while loading this view.'}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              if (isChunkError) {
                sessionStorage.removeItem('chunk_reload_retry');
                window.location.reload();
              } else {
                this.setState({ hasError: false, error: null });
              }
            }}>
              {isChunkError ? 'Refresh Page' : 'Try Again'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => this.props.onReset?.()}>
              Return Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─── Main App ────────────────────────────────────────────── */
export default function App() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const activeTab = useSelector(selectActiveTab);
  const toasts = useSelector(selectToasts);
  const unreadCount = useSelector(selectUnreadCount);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    let timer;
    const update = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setIsMobile(window.innerWidth < 768), 150);
    };
    window.addEventListener('resize', update);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', update);
    };
  }, []);

  const openNotifications = () => {
    dispatch(setActiveTab('notifications'));
    setSidebarOpen(false);
  };

  const handleTabChange = (tab) => {
    dispatch(setActiveTab(tab));
    setSidebarOpen(false);
  };

  /* ── Restore session ── */
  useEffect(() => {
    const userId   = localStorage.getItem('userId');
    const token    = localStorage.getItem('token');
    const role     = localStorage.getItem('role');
    const fullName = localStorage.getItem('fullName');
    const phone    = localStorage.getItem('phone');
    if (userId && token && role) {
      dispatch(setUser({ id: userId, token, role, fullName, phone }));
      api.auth.getMe().then(res => {
        const u = res?.data || res?.user || res || {};
        const resolvedName = u.fullName || [u.firstName, u.lastName].filter(Boolean).join(' ');
        if (resolvedName) {
          localStorage.setItem('fullName', resolvedName);
        }
        dispatch(setUser({
          id: userId,
          token,
          role: u.role || role,
          fullName: resolvedName || fullName,
          phone: u.phone || phone,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          ...u,
        }));
      }).catch(() => {});
    }
  }, [dispatch]);

  /* ── Toast helper ── */
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    dispatch(addToast({ id, message, type }));
    setTimeout(() => dispatch(removeToast(id)), 4000);
  }, [dispatch]);

  /* ── FCM ── */
  useEffect(() => {
    if (!user?.id || !user?.token) return;
    let cancelled = false;
    (async () => {
      if (!('Notification' in window) || Notification.permission === 'denied') return;
      const token = await requestAndRegisterFcmToken(user.id, user.token);
      if (!cancelled && token) console.log('[FCM] Push active for', user.role);
    })();
    const unsub = onForegroundMessage(payload => {
      const n = payload?.notification || {};
      const d = payload?.data || {};
      const title = n.title || d.title || 'Care Car Wash';
      const body  = n.body  || d.body  || '';
      showToast(`${title}: ${body}`, 'info');
      dispatch(incrementUnread());
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.svg' });
      }
    });
    return () => { cancelled = true; unsub.then(fn => fn && fn()); };
  }, [user?.id, user?.token, user?.role, showToast, dispatch]);

  /* ── Logout ── */
  const handleLogout = () => {
    clearFcmUserRegistration();
    demoLogout();
    setSidebarOpen(false);
    showToast('Left the demo — choose a role to continue', 'info');
  };

  /* ── Auth screen ── */
  if (!user) {
    return (
      <>
        <DemoLogin />
        <ToastList toasts={toasts} />
      </>
    );
  }

  const navItems = user.role === 'CUSTOMER' ? CUSTOMER_NAV
                 : user.role === 'BUSINESS_OWNER' ? BUSINESS_NAV
                 : ADMIN_NAV;

  /* ── Render page ── */
  const renderPage = () => (
    <Suspense fallback={<PageSkeleton />}>
      {(() => {
        switch (activeTab) {
          case 'dashboard':     return <Dashboard setActiveTab={handleTabChange} setSelectedBusiness={(biz) => dispatch(setSelectedBusiness(biz))} user={user} showToast={showToast} />;
          case 'bookings':      return user?.role === 'BUSINESS_OWNER' ? <OwnerBookings user={user} showToast={showToast} /> : <Bookings  user={user} showToast={showToast} />;
          case 'vehicles':      return <Vehicles  showToast={showToast} />;
          case 'slots':         return <Slots     user={user} showToast={showToast} />;
          case 'business':      return <BusinessOwnerPanel user={user} showToast={showToast} setActiveTab={handleTabChange} />;
          case 'workers':       return <WorkerManagement user={user} showToast={showToast} />;
          case 'reports':       return <ReportsPage user={user} showToast={showToast} setActiveTab={handleTabChange} />;
          case 'payments':      return <Payments user={user} showToast={showToast} />;
          case 'admin':         return <AdminPanel user={user} showToast={showToast} />;
          case 'profile':       return <Profile user={user} showToast={showToast} onLogout={handleLogout} setActiveTab={handleTabChange} />;
          case 'notifications': return <Notifications showToast={showToast} />;
          default:              return <Dashboard setActiveTab={handleTabChange} user={user} showToast={showToast} />;
        }
      })()}
    </Suspense>
  );

  const pageTitle = activeTab === 'dashboard'
    ? 'Home'
    : activeTab.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        unreadCount={unreadCount}
      />
      <div className="main-with-sidebar">
        <DesktopHeader
          user={user}
          activeTab={activeTab}
          pageTitle={pageTitle}
          unreadCount={unreadCount}
          openNotifications={openNotifications}
          onOpenMenu={() => setSidebarOpen(true)}
          setActiveTab={handleTabChange}
        />
        {/* key on activeTab so slide-in fires only on navigation, not every render */}
        <div key={activeTab} className="main-content-area slide-in">
          <ErrorBoundary activeTab={activeTab} onReset={() => handleTabChange('dashboard')}>
            {renderPage()}
          </ErrorBoundary>
        </div>
        {isMobile && (
          <BottomNav items={navItems} activeTab={activeTab} setActiveTab={handleTabChange} />
        )}
      </div>
      <ToastList toasts={toasts} />
      <DemoToolbar />
    </div>
  );
}
