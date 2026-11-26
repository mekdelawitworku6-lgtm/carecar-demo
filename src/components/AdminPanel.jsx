import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { isValidEmail, isValidEthPhone } from '../utils/validation';
import {
  ShieldCheck, UserCheck, Building2, RefreshCw, FileText,
  Phone, Mail, IdCard, CheckCircle, XCircle, AlertTriangle,
  Users, DollarSign, TrendingUp, Search, BarChart3, Calendar,
  Activity, CreditCard, ShoppingCart, Star, Clock, UserPlus, Award
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { api } from '../services/api';
import { selectAdminSubTab, setAdminSubTab } from '../store/uiSlice';

const STATUS_COLORS = {
  PENDING: '#f59e0b',
  CONFIRMED: '#10b981',
  IN_PROGRESS: '#3b82f6',
  COMPLETED: '#8b5cf6',
  CANCELLED: '#ef4444'
};

const METHOD_COLORS = {
  TELEBIRR: '#3b82f6',
  CASH: '#10b981'
};

export default function AdminPanel({ user, showToast }) {
  const dispatch = useDispatch();
  const reduxSubTab = useSelector(selectAdminSubTab);
  const [activeSubTab, setActiveSubTab] = useState(reduxSubTab || 'analytics');
  const [owners, setOwners] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);

  const [allUsers, setAllUsers] = useState([]);
  const [allUsersMeta, setAllUsersMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [userSearchInput, setUserSearchInput] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [allUsersPage, setAllUsersPage] = useState(1);
  const [allUsersLoading, setAllUsersLoading] = useState(false);

  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [recentTransactions, setRecentTransactions] = useState([]);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [businessStats, setBusinessStats] = useState(null);

  const [suspendModal, setSuspendModal] = useState({ show: false, businessId: null, businessName: '', reason: '' });

  const fetchPendingOwners = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getPendingOwners();
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setOwners(list.filter(o => o.role === 'BUSINESS_OWNER'));
    } catch (err) {
      showToast(err?.message || 'Failed to fetch pending owners', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllBusinesses = async () => {
    setLoading(true);
    try {
      const res = await api.user.admin.listBusinesses({ limit: 100 });
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setBusinesses(list);
    } catch (err) {
      showToast(err?.message || 'Failed to fetch businesses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async (page, search, role) => {
    setAllUsersLoading(true);
    try {
      const params = { page, limit: 20 };
      if (role !== 'ALL') params.role = role;
      if (search) params.search = search;
      const res = await api.auth.admin.listUsers(params);
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setAllUsers(list);
      if (res?.meta) setAllUsersMeta(res.meta);
    } catch (err) {
      showToast(err?.message || 'Failed to fetch users', 'error');
    } finally {
      setAllUsersLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    setRevenueLoading(true);
    try {
      const [revRes, bookRes, userRes, txnRes, bizRes] = await Promise.allSettled([
        api.payments.admin.revenue(),
        api.bookings.admin.getStats(),
        api.auth.admin.getStats(),
        api.payments.admin.listTransactions({ limit: 20 }),
        api.user.admin.listBusinesses({ limit: 100 }),
      ]);

      const revenue = revRes.status === 'fulfilled' ? revRes.value?.data : null;
      const bookingStats = bookRes.status === 'fulfilled' ? bookRes.value?.data : null;
      const userStats = userRes.status === 'fulfilled' ? userRes.value?.data : null;
      const txnList = txnRes.status === 'fulfilled'
        ? (Array.isArray(txnRes.value?.data) ? txnRes.value.data : Array.isArray(txnRes.value) ? txnRes.value : [])
        : [];

      const bizList = bizRes.status === 'fulfilled'
        ? (Array.isArray(bizRes.value?.data) ? bizRes.value.data : Array.isArray(bizRes.value) ? bizRes.value : [])
        : [];
      setBusinessStats({ total: bizList.length, approved: bizList.filter(b => b.isApproved).length, pending: bizList.filter(b => !b.isApproved).length });

      setAnalyticsData({ revenue, bookingStats, userStats });
      setRecentTransactions(txnList);
    } catch (err) {
      showToast(err?.message || 'Failed to fetch analytics data', 'error');
    } finally {
      setAnalyticsLoading(false);
      setRevenueLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'analytics') fetchAnalytics();
    else if (activeSubTab === 'owners') fetchPendingOwners();
    else if (activeSubTab === 'businesses') fetchAllBusinesses();
    else if (activeSubTab === 'users') fetchAllUsers(allUsersPage, userSearch, roleFilter);
  }, [activeSubTab, allUsersPage, userSearch, roleFilter]);

  const handleRefresh = () => {
    if (activeSubTab === 'analytics') fetchAnalytics();
    else if (activeSubTab === 'owners') fetchPendingOwners();
    else if (activeSubTab === 'businesses') fetchAllBusinesses();
    else if (activeSubTab === 'users') fetchAllUsers(allUsersPage, userSearch, roleFilter);
  };

  const handleApproveOwner = async (ownerId) => {
    try {
      await api.admin.approveOwner(ownerId);
      showToast('Business Owner approved! They will receive a notification.', 'success');
      fetchPendingOwners();
    } catch (err) {
      showToast(err?.message || 'Failed to approve owner', 'error');
    }
  };

  const handleSuspendOwner = async (ownerId) => {
    try {
      await api.admin.suspendOwner(ownerId);
      showToast('Owner account suspended.', 'info');
      fetchPendingOwners();
    } catch (err) {
      showToast(err?.message || 'Failed to suspend owner', 'error');
    }
  };

  const handleApproveBusiness = async (businessId) => {
    try {
      await api.admin.approveBusiness(businessId);
      showToast('Business approved! Owner will receive a notification.', 'success');
      fetchAllBusinesses();
    } catch (err) {
      showToast(err?.message || 'Failed to approve business', 'error');
    }
  };

  const handleSuspendBusiness = async () => {
    if (!suspendModal.businessId) return;
    if (!suspendModal.reason?.trim()) {
      showToast('A suspension reason is required', 'error');
      return;
    }
    try {
      await api.user.admin.suspendBusiness(suspendModal.businessId, suspendModal.reason);
      showToast('Business suspended.', 'info');
      setSuspendModal({ show: false, businessId: null, businessName: '', reason: '' });
      fetchAllBusinesses();
    } catch (err) {
      showToast(err?.message || 'Failed to suspend business', 'error');
    }
  };

  const handleUserStatus = async (userId, isActive) => {
    try {
      await api.auth.admin.setUserStatus(userId, isActive);
      showToast(isActive ? 'User activated.' : 'User suspended.', 'success');
      fetchAllUsers(allUsersPage, userSearch, roleFilter);
    } catch (err) {
      showToast(err?.message || 'Failed to update user status', 'error');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setUserSearch(userSearchInput);
    setAllUsersPage(1);
  };

  const handleRoleFilter = (role) => {
    setRoleFilter(role);
    setAllUsersPage(1);
  };

  const isRefreshing = loading || allUsersLoading || analyticsLoading || revenueLoading;
  const pendingOwners = owners.filter(o => !o.isActive);
  const approvedOwners = owners.filter(o => o.isActive);
  const pendingBusinessCount = businesses.filter(b => !b.isApproved).length;

  return (
    <div style={{ animation: 'slide-in 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Admin Control Panel</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
            {activeSubTab === 'analytics' && 'Platform analytics, revenue trends, and booking statistics.'}
            {activeSubTab === 'owners' && 'Approve business owners and manage their accounts.'}
            {activeSubTab === 'businesses' && 'Approve or suspend business wash service providers.'}
            {activeSubTab === 'users' && 'View and manage all registered users.'}
          </p>
        </div>
        <button
          className="glass-btn glass-btn-secondary"
          onClick={handleRefresh}
          disabled={isRefreshing}
          style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={16} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} /> Refresh
        </button>
      </div>

      <div className="tabs-scroll" style={{ marginBottom: '28px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
        {[
          { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={16} />, count: 0 },
          { id: 'owners', label: 'Owner Accounts', icon: <UserCheck size={16} />, count: pendingOwners.length },
          { id: 'businesses', label: 'Business Approvals', icon: <Building2 size={16} />, count: pendingBusinessCount },
          { id: 'users', label: 'All Users', icon: <Users size={16} />, count: 0 },
          ...(user?.role === 'SUPER_ADMIN' ? [{ id: 'admins', label: 'Manage Admins', icon: <ShieldCheck size={16} />, count: 0 }] : []),
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveSubTab(tab.id); dispatch(setAdminSubTab(tab.id)); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px',
              background: activeSubTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeSubTab === tab.id ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontSize: '14px', fontWeight: 700, transition: 'var(--transition-smooth)',
              boxShadow: activeSubTab === tab.id ? '0 4px 12px var(--primary-glow)' : 'none',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.icon} {tab.label}
            {tab.count > 0 && (
              <span style={{
                background: '#ef4444', color: '#fff', borderRadius: '9999px',
                padding: '1px 7px', fontSize: '11px', fontWeight: 800
              }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {activeSubTab === 'analytics' ? (
        <AnalyticsTab
          data={analyticsData}
          transactions={recentTransactions}
          loading={analyticsLoading || revenueLoading}
          pendingOwnersCount={pendingOwners.length}
          pendingBizCount={pendingBusinessCount}
          businessStats={businessStats}
          onTabChange={setActiveSubTab}
        />
      ) : loading && (activeSubTab === 'owners' || activeSubTab === 'businesses') ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '12px' }} />)}
        </div>
      ) : activeSubTab === 'owners' ? (
        <OwnersTab
          pendingOwners={pendingOwners}
          approvedOwners={approvedOwners}
          owners={owners}
          onApprove={handleApproveOwner}
          onSuspend={handleSuspendOwner}
        />
      ) : activeSubTab === 'businesses' ? (
        <BusinessesTab
          businesses={businesses}
          onApprove={handleApproveBusiness}
          onSuspend={(biz) => setSuspendModal({ show: true, businessId: biz.id, businessName: biz.businessName || '', reason: '' })}
        />
      ) : activeSubTab === 'admins' ? (
        <AdminsTab showToast={showToast} />
      ) : (
        <UsersTab
          users={allUsers}
          meta={allUsersMeta}
          loading={allUsersLoading}
          searchInput={userSearchInput}
          onSearchInputChange={setUserSearchInput}
          onSearch={handleSearch}
          roleFilter={roleFilter}
          onRoleFilter={handleRoleFilter}
          page={allUsersPage}
          onPageChange={setAllUsersPage}
          onUserStatus={handleUserStatus}
        />
      )}

      {suspendModal.show && (
        <SuspendModal
          businessName={suspendModal.businessName}
          reason={suspendModal.reason}
          onReasonChange={(val) => setSuspendModal(prev => ({ ...prev, reason: val }))}
          onConfirm={handleSuspendBusiness}
          onClose={() => setSuspendModal({ show: false, businessId: null, businessName: '', reason: '' })}
        />
      )}
    </div>
  );
}

function AdminsTab({ showToast }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ phone: '', fullName: '', password: '', email: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await api.admin.listAdmins();
      setAdmins(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      showToast(err?.message || 'Failed to fetch admins', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.fullName?.trim()) { showToast('Full name is required', 'error'); return; }
    if (!form.phone?.trim() || !isValidEthPhone(form.phone.trim())) { showToast('Enter a valid phone number (e.g. 09XX XXX XXX)', 'error'); return; }
    if (form.email && !isValidEmail(form.email)) { showToast('Enter a valid email address', 'error'); return; }
    if (!form.password || form.password.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
    setSubmitting(true);
    try {
      await api.admin.createAdmin(form);
      showToast('Admin account created', 'success');
      setShowForm(false);
      setForm({ phone: '', fullName: '', password: '', email: '' });
      fetchAdmins();
    } catch (err) {
      showToast(err?.message || 'Failed to create admin', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuspend = async (adminId) => {
    try {
      await api.admin.deleteAdmin(adminId);
      showToast('Admin suspended', 'info');
      fetchAdmins();
    } catch (err) {
      showToast(err?.message || 'Failed to suspend admin', 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Admin Accounts</h3>
        <button className="glass-btn" onClick={() => setShowForm(!showForm)} style={{ padding: '8px 16px', fontSize: 13 }}>
          {showForm ? 'Cancel' : '+ New Admin'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20, padding: 16, background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <input className="glass-input" placeholder="Full Name" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required />
          <input className="glass-input" type="tel" placeholder="Phone (+251...)" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required />
          <input className="glass-input" type="email" placeholder="Email (optional)" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <input className="glass-input" type="password" placeholder="Password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          <button className="glass-btn" type="submit" disabled={submitting} style={{ alignSelf: 'flex-start' }}>
            {submitting ? 'Creating...' : 'Create Admin'}
          </button>
        </form>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 10 }} />)}
        </div>
      ) : admins.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No admin accounts found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {admins.map(a => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--card-bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{a.fullName || 'Unknown'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.phone} {a.email ? `• ${a.email}` : ''}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {a.role} {a.isActive ? '• Active' : '• Suspended'}
                </div>
              </div>
              {a.role !== 'SUPER_ADMIN' && (
                <button className="glass-btn glass-btn-secondary" onClick={() => handleSuspend(a.id)} style={{ padding: '6px 12px', fontSize: 12, color: a.isActive ? 'var(--danger)' : 'var(--success)' }}>
                  {a.isActive ? 'Suspend' : 'Reactivate'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalyticsTab({ data, transactions, loading, pendingOwnersCount, pendingBizCount, businessStats, onTabChange }) {
  const formatCurrency = (amount) => {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', minimumFractionDigits: 2 }).format(amount);
  };

  if (loading && !data) {
    return (
      <div>
        <div className="grid-auto" style={{ marginBottom: '28px' }}>
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton" style={{ height: '110px', borderRadius: '12px' }} />)}
        </div>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div className="skeleton" style={{ flex: '1 1 400px', height: '300px', borderRadius: '12px' }} />
          <div className="skeleton" style={{ flex: '1 1 300px', height: '300px', borderRadius: '12px' }} />
        </div>
      </div>
    );
  }

  const { revenue, bookingStats, userStats } = data || {};

  const bookingStatusData = bookingStats?.bookingsByStatus
    ? Object.entries(bookingStats.bookingsByStatus).map(([name, value]) => ({ name, value }))
    : [];

  const revenueMethodData = revenue?.revenueByMethod
    ? Object.entries(revenue.revenueByMethod).map(([name, value]) => ({ name, value: parseFloat(value) }))
    : [];

  const dailyRevenueData = revenue?.dailyRevenue || [];
  const dailyBookingData = bookingStats?.dailyBookings || [];

  const totalBizOwners = userStats?.usersByRole?.BUSINESS_OWNER ?? '—';
  const newThisMonth = userStats?.recentRegistrations ?? '—';
  const pendingApproval = (pendingOwnersCount || 0) + (pendingBizCount || 0);
  const activeThisWeek = userStats?.activeUsers ?? '—';

  return (
    <div>
      {/* Growth */}
      <SectionHeader icon={<TrendingUp size={16} />} title="Growth" subtitle="Business owner registrations &amp; platform growth" />
      <div className="grid-auto" style={{ marginBottom: '28px' }}>
        <StatCard
          icon={<UserCheck size={20} />}
          label="Total business owners"
          value={totalBizOwners}
          color="#10b981"
          bg="rgba(16,185,129,0.12)"
          onClick={() => onTabChange?.('owners')}
        />
        <StatCard
          icon={<UserPlus size={20} />}
          label="New this month"
          value={newThisMonth}
          color="#3b82f6"
          bg="rgba(59,130,246,0.12)"
          onClick={() => onTabChange?.('owners')}
        />
        <StatCard
          icon={<Building2 size={20} />}
          label="Total businesses"
          value={businessStats?.total ?? '—'}
          color="#8b5cf6"
          bg="rgba(139,92,246,0.12)"
          onClick={() => onTabChange?.('businesses')}
        />
        <StatCard
          icon={<CheckCircle size={20} />}
          label="Approved businesses"
          value={businessStats?.approved ?? '—'}
          color="#10b981"
          bg="rgba(16,185,129,0.12)"
          onClick={() => onTabChange?.('businesses')}
        />
      </div>

      {/* Pipeline */}
      <SectionHeader icon={<Clock size={16} />} title="Pipeline" subtitle="Approvals pending your review" />
      <div className="grid-auto" style={{ marginBottom: '28px' }}>
        <StatCard
          icon={<FileText size={20} />}
          label="Pending approval"
          value={pendingApproval}
          color="#f59e0b"
          bg="rgba(245,158,11,0.12)"
          onClick={() => onTabChange?.('owners')}
        />
      </div>

      {/* Quality */}
      <SectionHeader icon={<Star size={16} />} title="Quality" subtitle="Service ratings &amp; business flags" />
      <div className="grid-auto" style={{ marginBottom: '28px' }}>
        <StatCard
          icon={<Award size={20} />}
          label="Top rated"
          value="—"
          color="#8b5cf6"
          bg="rgba(139,92,246,0.12)"
        />
        <StatCard
          icon={<AlertTriangle size={20} />}
          label="Flagged"
          value="—"
          color="#ef4444"
          bg="rgba(239,68,68,0.12)"
        />
        <StatCard
          icon={<Star size={20} />}
          label="Avg customer rating"
          value="—"
          color="#f59e0b"
          bg="rgba(245,158,11,0.12)"
        />
      </div>

      {/* Risk */}
      <SectionHeader icon={<ShieldCheck size={16} />} title="Risk" subtitle="Complaints &amp; suspended accounts" />
      <div className="grid-auto" style={{ marginBottom: '28px' }}>
        <StatCard
          icon={<AlertTriangle size={20} />}
          label="Open complaints"
          value="—"
          color="#f43f5e"
          bg="rgba(244,63,94,0.12)"
        />
        <StatCard
          icon={<ShieldCheck size={20} />}
          label="Flagged / Suspended"
          value="—"
          color="#ef4444"
          bg="rgba(239,68,68,0.12)"
        />
      </div>

      {/* Engagement */}
      <SectionHeader icon={<Activity size={16} />} title="Engagement" subtitle="Users actively using the platform" />
      <div className="grid-auto" style={{ marginBottom: '28px' }}>
        <StatCard
          icon={<Users size={20} />}
          label="Active this week"
          value={activeThisWeek}
          color="#06b6d4"
          bg="rgba(6,182,212,0.12)"
        />
      </div>

      {/* Charts — unchanged */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '28px' }}>
        <div className="glass-card" style={{ flex: '2 1 500px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} style={{ color: 'var(--green)' }} /> Revenue Trend (Last 30 Days)
          </h3>
          {dailyRevenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyRevenueData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,23,42,0.95)',
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px'
                  }}
                  formatter={(value) => [formatCurrency(value), 'Revenue']}
                />
                <Area type="monotone" dataKey="amount" stroke="#10b981" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              No revenue data yet
            </div>
          )}
        </div>

        <div className="glass-card" style={{ flex: '1 1 300px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={18} style={{ color: 'var(--primary)' }} /> Revenue by Method
          </h3>
          {revenueMethodData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={revenueMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {revenueMethodData.map((entry) => (
                      <Cell key={entry.name} fill={METHOD_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15,23,42,0.95)',
                      border: '1px solid rgba(148,163,184,0.2)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '13px'
                    }}
                    formatter={(value) => [formatCurrency(value), 'Amount']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                {revenueMethodData.map((entry) => (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: METHOD_COLORS[entry.name] || '#94a3b8' }} />
                    {entry.name}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              No payment data yet
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '28px' }}>
        <div className="glass-card" style={{ flex: '1 1 350px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={18} style={{ color: 'var(--primary)' }} /> Bookings by Status
          </h3>
          {bookingStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={bookingStatusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} width={90} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,23,42,0.95)',
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px'
                  }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {bookingStatusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              No booking data yet
            </div>
          )}
        </div>

        <div className="glass-card" style={{ flex: '2 1 450px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} style={{ color: '#8b5cf6' }} /> Daily Bookings (Last 7 Days)
          </h3>
          {dailyBookingData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyBookingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,23,42,0.95)',
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px'
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              No daily booking data yet
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '28px' }}>
        <div className="glass-card" style={{ flex: '1 1 300px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} style={{ color: '#8b5cf6' }} /> Users by Role
          </h3>
          {userStats?.usersByRole ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(userStats.usersByRole).map(([role, count]) => (
                <div key={role} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(148,163,184,0.06)', borderRadius: '8px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600 }}>{role.replace(/_/g, ' ')}</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 800 }}>{count}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(99,102,241,0.1)', borderRadius: '8px', marginTop: '4px' }}>
                <span style={{ color: 'var(--primary)', fontSize: '14px', fontWeight: 700 }}>Recent (7d)</span>
                <span style={{ color: 'var(--primary)', fontSize: '18px', fontWeight: 800 }}>{userStats.recentRegistrations}</span>
              </div>
            </div>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              No user data yet
            </div>
          )}
        </div>

        <div className="glass-card" style={{ flex: '2 1 450px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} /> Recent Transactions
          </h3>
          {transactions.length === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              No transactions yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 280, overflowY: 'auto' }}>
              {transactions.map(txn => (
                <div key={txn.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', background: 'rgba(148,163,184,0.06)', borderRadius: '8px',
                  fontSize: '13px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '11px' }}>
                      #{txn.id?.slice(0, 8) || '—'}
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {formatCurrency(txn.amount)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                      background: txn.paymentMethod === 'TELEBIRR' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
                      color: txn.paymentMethod === 'TELEBIRR' ? '#60a5fa' : '#34d399'
                    }}>
                      {txn.paymentMethod || 'N/A'}
                    </span>
                    <span style={{
                      padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                      background: txn.status === 'COMPLETED' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                      color: txn.status === 'COMPLETED' ? '#34d399' : '#fbbf24'
                    }}>
                      {txn.status || 'N/A'}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                      {txn.createdAt ? new Date(txn.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: '12px', marginTop: '8px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {icon} {title}
      </h3>
      {subtitle && (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{subtitle}</p>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, bg, onClick }) {
  return (
    <div
      className="glass-card"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      style={{
        padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={onClick ? (e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; } : undefined}
      onMouseLeave={onClick ? (e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; } : undefined}
    >
      <div style={{ background: bg, borderRadius: '12px', padding: '10px', display: 'flex', flexShrink: 0 }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</p>
        <p style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</p>
      </div>
    </div>
  );
}

function OwnersTab({ pendingOwners, approvedOwners, owners, onApprove, onSuspend }) {
  return (
    <div>
      {pendingOwners.length > 0 && (
        <>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '12px', textTransform: 'uppercase' }}>
            Pending Approval ({pendingOwners.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            {pendingOwners.map(owner => (
              <OwnerCard key={owner.id} owner={owner} onApprove={onApprove} onSuspend={null} isPending />
            ))}
          </div>
        </>
      )}

      {approvedOwners.length > 0 && (
        <>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '12px', textTransform: 'uppercase' }}>
            Active Accounts ({approvedOwners.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {approvedOwners.map(owner => (
              <OwnerCard key={owner.id} owner={owner} onApprove={null} onSuspend={onSuspend} isPending={false} />
            ))}
          </div>
        </>
      )}

      {owners.length === 0 && (
        <EmptyState icon={<UserCheck size={48} />} title="No Business Owner Accounts" body="No business owners have registered yet." />
      )}
    </div>
  );
}

function BusinessesTab({ businesses, onApprove, onSuspend }) {
  return (
    <div>
      {businesses.length === 0 ? (
        <EmptyState icon={<Building2 size={48} />} title="No Businesses" body="There are no businesses registered yet." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {businesses.map(biz => (
            <div key={biz.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: 700 }}>{biz.businessName}</h3>
                  {!biz.isApproved && (
                    <span className="badge badge-pending">Pending</span>
                  )}
                  {biz.isApproved && !biz.isSuspended && (
                    <span className="badge badge-confirmed">Approved</span>
                  )}
                  {biz.isSuspended && (
                    <span className="badge badge-cancelled">Suspended</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <span>{biz.city || 'N/A'}</span>
                  <span>{biz.phone || 'N/A'}</span>
                  {biz.owner && (
                    <span>Owner: {biz.owner.firstName ? `${biz.owner.firstName} ${biz.owner.lastName || ''}`.trim() : 'N/A'} ({biz.owner.phone || 'N/A'})</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                {!biz.isApproved && (
                  <button className="glass-btn" onClick={() => onApprove(biz.id)} style={{ padding: '8px 20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} /> Approve
                  </button>
                )}
                {biz.isApproved && !biz.isSuspended && (
                  <button
                    className="glass-btn-danger"
                    onClick={() => onSuspend(biz)}
                    style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <AlertTriangle size={14} /> Suspend
                  </button>
                )}
                {biz.isSuspended && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center' }}>—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UsersTab({ users, meta, loading, searchInput, onSearchInputChange, onSearch, roleFilter, onRoleFilter, page, onPageChange, onUserStatus }) {
  return (
    <div>
      <div className="glass-card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <form onSubmit={onSearch} className="flex-row-responsive stack-sm" style={{ flex: 1, minWidth: 0 }}>
          <div className="glass-input" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', flex: 1 }}>
            <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchInput}
              onChange={e => onSearchInputChange(e.target.value)}
              style={{
                background: 'transparent', border: 'none', color: 'var(--text-primary)',
                outline: 'none', width: '100%', padding: '8px 0', fontSize: '14px'
              }}
            />
          </div>
          <button type="submit" className="glass-btn" style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Search size={14} /> Search
          </button>
        </form>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Role:</span>
          <select
            value={roleFilter}
            onChange={e => onRoleFilter(e.target.value)}
            className="glass-input"
            style={{ padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            <option value="ALL">ALL</option>
            <option value="CUSTOMER">Customer</option>
            <option value="BUSINESS_OWNER">Business Owner</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '12px' }} />)}
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={<Users size={48} />} title="No Users Found" body="No users match your search criteria." />
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {users.map(u => (
              <UserCard key={u.id} user={u} onUserStatus={onUserStatus} />
            ))}
          </div>
          {meta.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
              <button
                className="glass-btn-secondary"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                style={{ padding: '8px 16px', fontSize: '13px', opacity: page <= 1 ? 0.5 : 1 }}
              >
                Previous
              </button>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                Page {page} of {meta.totalPages} ({meta.total} total)
              </span>
              <button
                className="glass-btn-secondary"
                disabled={page >= meta.totalPages}
                onClick={() => onPageChange(page + 1)}
                style={{ padding: '8px 16px', fontSize: '13px', opacity: page >= meta.totalPages ? 0.5 : 1 }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function UserCard({ user, onUserStatus }) {
  const isActive = user.isActive !== false;
  const roleColors = {
    ADMIN: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8' },
    BUSINESS_OWNER: { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
    CUSTOMER: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  };
  const roleStyle = roleColors[user.role] || { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' };

  return (
    <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: '200px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: 700 }}>
            {user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown'}
          </h3>
          <span style={{
            background: roleStyle.bg, color: roleStyle.color,
            padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700
          }}>
            {user.role?.replace(/_/g, ' ')}
          </span>
          <span className={`badge ${isActive ? 'badge-confirmed' : 'badge-cancelled'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '13px', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Phone size={12} /> {user.phone || 'N/A'}
          </span>
          {user.email && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Mail size={12} /> {user.email}
            </span>
          )}
          <span style={{ fontSize: '11px', opacity: 0.6 }}>
            Created: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        {isActive ? (
          <button
            className="glass-btn-danger"
            onClick={() => onUserStatus(user.id, false)}
            style={{ padding: '8px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <XCircle size={14} /> Suspend
          </button>
        ) : (
          <button
            className="glass-btn"
            onClick={() => onUserStatus(user.id, true)}
            style={{ padding: '8px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <CheckCircle size={14} /> Activate
          </button>
        )}
      </div>
    </div>
  );
}

function SuspendModal({ businessName, reason, onReasonChange, onConfirm, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
      }}
      onClick={onClose}
    >
      <div className="glass-card" style={{ maxWidth: '420px', width: '90%', padding: '28px' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: '20px', color: 'var(--text-primary)', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={20} style={{ color: 'var(--red)' }} /> Suspend Business
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
          Are you sure you want to suspend <strong style={{ color: 'var(--text-primary)' }}>{businessName}</strong>?
        </p>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Reason (optional)
          </label>
          <textarea
            className="glass-input"
            value={reason}
            onChange={e => onReasonChange(e.target.value)}
            placeholder="Enter reason for suspension..."
            rows={3}
            style={{
              width: '100%', padding: '10px', color: 'var(--text-primary)', fontSize: '14px',
              outline: 'none', border: 'none', borderRadius: '8px', resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button className="glass-btn-secondary" onClick={onClose} style={{ padding: '10px 20px', fontSize: '14px' }}>
            Cancel
          </button>
          <button className="glass-btn-danger" onClick={onConfirm} style={{ padding: '10px 20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={16} /> Suspend
          </button>
        </div>
      </div>
    </div>
  );
}

function OwnerCard({ owner, onApprove, onSuspend, isPending }) {
  // Demo proof images are inline data URLs, so no upload gateway is needed.
  const proofUrl = owner.proofOfOwnership || null;

  return (
    <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <h3 style={{ fontSize: '17px', color: 'var(--text-primary)', fontWeight: 700 }}>{owner.fullName || `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'Unknown'}</h3>
          <span className={`badge ${isPending ? 'badge-pending' : 'badge-confirmed'}`}>
            {isPending ? 'Pending Approval' : 'Active'}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: proofUrl ? '12px' : 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Phone size={12} /> {owner.phone}
          </span>
          {owner.email && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Mail size={12} /> {owner.email}
            </span>
          )}
          {owner.digitalId && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IdCard size={12} /> Digital ID: {owner.digitalId}
            </span>
          )}
          <span style={{ fontSize: '11px', opacity: 0.6 }}>
            Registered: {new Date(owner.createdAt).toLocaleDateString()}
          </span>
        </div>
        {proofUrl && (
          <a
            href={proofUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              color: 'var(--cyan)', fontSize: '13px', fontWeight: 600,
              textDecoration: 'none', border: '1px solid var(--cyan)',
              padding: '4px 12px', borderRadius: '6px',
              transition: 'var(--transition-smooth)'
            }}
          >
            <FileText size={13} /> View Proof of Ownership
          </a>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        {isPending && onApprove && (
          <button className="glass-btn" onClick={() => onApprove(owner.id)} style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={14} /> Approve
          </button>
        )}
        {!isPending && onSuspend && (
          <button
            onClick={() => onSuspend(owner.id)}
            style={{
              padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)',
              color: '#f87171', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
              transition: 'var(--transition-smooth)'
            }}
          >
            <XCircle size={14} /> Suspend
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, body }) {
  return (
    <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ marginBottom: '16px', opacity: 0.5, color: 'var(--primary)', display: 'flex', justifyContent: 'center' }}>{icon}</div>
      <h3 style={{ fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>{title}</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{body}</p>
    </div>
  );
}
