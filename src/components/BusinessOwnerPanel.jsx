import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import {
  isValidEmail, isValidEthPhone, isValidUrl, validateGoogleMapsLink,
  validateWorkingHours, toPositiveNumber, toPositiveInt, isValidTime, timeToMinutes,
} from '../utils/validation';
import {
  Building2, RefreshCw, Plus, Edit3, Trash2, Save, X, DollarSign,
  Users, Calendar, Clock, Settings, Briefcase, BarChart3, ChevronRight,
  MapPin, Phone, Mail, AlertCircle, CheckCircle, Activity, Eye, EyeOff,
  FileText, CreditCard, ListOrdered, Star, Navigation
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

const isAllowedProofFile = (file) => {
  if (!file) return false;
  const fileName = (file.name || '').toLowerCase();
  const fileType = (file.type || '').toLowerCase();
  return (
    fileType.startsWith('image/') ||
    fileType === 'application/pdf' ||
    /\.(pdf|jpg|jpeg|png)$/.test(fileName)
  );
};

const SUB_TABS = [
  { id: 'overview', label: 'Overview', icon: <Building2 size={16} /> },
  { id: 'branches', label: 'Branches', icon: <MapPin size={16} /> },
  { id: 'services', label: 'Services', icon: <Briefcase size={16} /> },
  { id: 'config', label: 'Config', icon: <Settings size={16} /> },
  { id: 'holidays', label: 'Holidays', icon: <Calendar size={16} /> },
  { id: 'workers', label: 'Workers', icon: <Users size={16} /> },
  { id: 'reports', label: 'Reports', icon: <BarChart3 size={16} /> },
  { id: 'reviews', label: 'Reviews', icon: <Star size={16} /> },
];

const STATUS_COLORS = {
  PENDING: '#f59e0b',
  CONFIRMED: '#10b981',
  IN_PROGRESS: '#3b82f6',
  COMPLETED: '#8b5cf6',
  CANCELLED: '#ef4444',
};

const PIE_COLORS = ['#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#06b6d4'];

const initServiceForm = () => ({ name: '', description: '', price: '', duration: '' });
const initConfigForm = () => ({
  slotDuration: 30,
  bufferBetweenSlots: 5,
  maxAdvanceBooking: 30,
  maxSlotsPerBooking: 5,
  operatingHours: '',
  slotDurationRules: [],
  mobileServiceEnabled: false,
  mobileServiceRadiusKm: 8,
});

export default function BusinessOwnerPanel({ user, showToast, setActiveTab }) {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('overview');

  const fetchBusiness = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.user.getMyBusiness();
      const biz = res?.data || res || null;
      setBusiness(biz);
    } catch (err) {
      setBusiness(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBusiness(); }, [fetchBusiness]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '12px' }} />)}
      </div>
    );
  }

  if (!business) {
    return <CreateBusinessForm showToast={showToast} onCreated={fetchBusiness} />;
  }

  const isApproved = business?.isApproved === true || business?.is_approved === true;
  if (!isApproved) {
    return <PendingApproval business={business} />;
  }

  return (
    <div style={{ animation: 'slide-in 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            {business.businessName}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
            Manage your car wash services, workers, and business settings.
          </p>
        </div>
        <button className="glass-btn glass-btn-secondary" onClick={fetchBusiness} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="tabs-scroll" style={{ marginBottom: '28px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
              padding: '10px 20px',
              background: activeSubTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeSubTab === tab.id ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontSize: '14px', fontWeight: 700, transition: 'var(--transition-smooth)',
              boxShadow: activeSubTab === tab.id ? '0 4px 12px var(--primary-glow)' : 'none'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'overview' && <OverviewTab business={business} onUpdate={fetchBusiness} showToast={showToast} />}
      {activeSubTab === 'branches' && <BranchesTab businessId={business.id} showToast={showToast} />}
      {activeSubTab === 'services' && <ServicesTab businessId={business.id} showToast={showToast} />}
      {activeSubTab === 'config' && <ConfigTab businessId={business.id} showToast={showToast} />}
      {activeSubTab === 'holidays' && <HolidaysTab businessId={business.id} showToast={showToast} />}
      {activeSubTab === 'workers' && <WorkersTab showToast={showToast} setActiveTab={setActiveTab} />}
      {activeSubTab === 'reports' && <ReportsTab showToast={showToast} setActiveTab={setActiveTab} />}
      {activeSubTab === 'reviews' && <ReviewsTab businessId={business.id} showToast={showToast} />}
    </div>
  );
}

function CreateBusinessForm({ showToast, onCreated }) {
  const defaultWorkingHours = JSON.stringify({
    monday: { open: '09:00', close: '18:00' },
    tuesday: { open: '09:00', close: '18:00' },
    wednesday: { open: '09:00', close: '18:00' },
    thursday: { open: '09:00', close: '18:00' },
    friday: { open: '09:00', close: '18:00' },
    saturday: { open: '09:00', close: '12:00' },
    sunday: { closed: true },
  });
  const [form, setForm] = useState({ businessName: '', description: '', address: '', city: '', phone: '', email: '', workingHours: defaultWorkingHours, googleMapsLink: '' });
  const [proofFile, setProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.businessName.trim()) {
      showToast('Business name is required', 'error');
      return;
    }
    if (form.phone && !isValidEthPhone(form.phone)) {
      showToast('Enter a valid business phone number (e.g. 09XX XXX XXX)', 'error');
      return;
    }
    if (form.email && !isValidEmail(form.email)) {
      showToast('Enter a valid business email address', 'error');
      return;
    }
    const mapsErr = validateGoogleMapsLink(form.googleMapsLink);
    if (mapsErr) { showToast(mapsErr, 'error'); return; }
    const hoursErr = validateWorkingHours(form.workingHours);
    if (hoursErr) { showToast(hoursErr, 'error'); return; }
    if (!proofFile) { showToast('Upload proof of ownership', 'error'); return; }
    if (!isAllowedProofFile(proofFile)) { showToast('Proof of ownership must be a PDF, JPG, JPEG, or PNG file', 'error'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v !== null && v !== undefined ? v : ''));
      if (proofFile) fd.append('proofOfOwnership', proofFile);
      await api.user.createBusiness(fd);
      showToast('Business created successfully! Awaiting approval.', 'success');
      onCreated();
    } catch (err) {
      showToast(err.message || 'Failed to create business', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  return (
    <div className="form-container" style={{ animation: 'slide-in 0.3s ease-out' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 24px var(--primary-glow)' }}>
          <Building2 size={28} color="#fff" />
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Create Your Business</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Fill in your business details to register as a service provider.</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="grid-2">
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Business Name <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input className="glass-input" name="businessName" value={form.businessName} onChange={handleChange} placeholder="e.g. Sparkle Car Wash" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Address</label>
            <input className="glass-input" name="address" value={form.address} onChange={handleChange} placeholder="Street address" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>City</label>
            <input className="glass-input" name="city" value={form.city} onChange={handleChange} placeholder="City" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Phone</label>
            <input className="glass-input" name="phone" value={form.phone} onChange={handleChange} placeholder="Phone number" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Email</label>
            <input className="glass-input" name="email" value={form.email} onChange={handleChange} placeholder="Email address" type="email" />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Description</label>
            <textarea className="glass-input" name="description" value={form.description} onChange={handleChange} placeholder="Describe your business..." rows={3} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Google Maps Link <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input className="glass-input" name="googleMapsLink" value={form.googleMapsLink} onChange={handleChange} placeholder="https://maps.google.com/?q=9.0084,38.7575" />
            <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Open your business in Google Maps, tap Share &rarr; Copy link, then paste it here. We read the location from this link.
            </span>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Working Hours</label>
            <WorkingHoursInput value={form.workingHours} onChange={(val) => setForm(prev => ({ ...prev, workingHours: val }))} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Proof of Ownership</label>
            <input type="file" onChange={(e) => setProofFile(e.target.files[0] || null)} style={{ color: 'var(--text-muted)', fontSize: '13px' }} accept=".pdf,.jpg,.jpeg,.png" />
          </div>
        </div>
        <button className="glass-btn" type="submit" disabled={submitting} style={{ width: '100%', padding: '14px', fontSize: '16px' }}>
          {submitting ? 'Submitting...' : <><Building2 size={18} /> Create Business</>}
        </button>
      </form>
    </div>
  );
}

function PendingApproval({ business }) {
  return (
    <div className="content-narrow" style={{ animation: 'slide-in 0.3s ease-out', marginTop: 60, textAlign: 'center' }}>
      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', border: '2px solid var(--orange-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
        <AlertCircle size={40} style={{ color: 'var(--orange)' }} />
      </div>
      <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>Pending Approval</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '16px', marginBottom: '24px', lineHeight: '1.6' }}>
        Your business <strong style={{ color: 'var(--text-primary)' }}>{business.businessName}</strong> has been submitted and is waiting for admin approval. You'll be notified once it's approved.
      </p>
      <div className="glass-card" style={{ textAlign: 'left' }}>
        <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: 700, marginBottom: '16px' }}>Business Details</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: 'var(--text-muted)' }}>
          {business.businessName && <DetailRow icon={<Building2 size={14} />} label="Name" value={business.businessName} />}
          {business.description && <DetailRow icon={<FileText size={14} />} label="Description" value={business.description} />}
          {business.address && <DetailRow icon={<MapPin size={14} />} label="Address" value={business.address} />}
          {business.city && <DetailRow icon={<MapPin size={14} />} label="City" value={business.city} />}
          {business.phone && <DetailRow icon={<Phone size={14} />} label="Phone" value={business.phone} />}
          {business.email && <DetailRow icon={<Mail size={14} />} label="Email" value={business.email} />}
          {business.googleMapsLink && (
            <DetailRow icon={<MapPin size={14} />} label="Google Maps" value={
              <a href={business.googleMapsLink} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)', textDecoration: 'none', fontSize: '13px' }}>View on Maps â†—</a>
            } />
          )}
        </div>
        {business.workingHours && (
          <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>WORKING HOURS</span>
            <pre style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
              {typeof business.workingHours === 'object' ? JSON.stringify(business.workingHours, null, 2) : business.workingHours}
            </pre>
          </div>
        )}
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-pending">Pending</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Submitted for review</span>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ color: 'var(--primary)', display: 'flex' }}>{icon}</span>
      <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{label}:</span>
      <span style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

function OverviewTab({ business, onUpdate, showToast }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...business });
  const [services, setServices] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [dailyRev, setDailyRev] = useState(null);
  const [monthlyRev, setMonthlyRev] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    setForm({ ...business });
  }, [business]);

  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const [svcRes, wrkRes] = await Promise.all([
          api.business.listServices(business.id).catch(() => ({ data: [] })),
          api.user.listWorkers().catch(() => ({ data: [] })),
        ]);
        setServices(Array.isArray(svcRes?.data) ? svcRes.data : (Array.isArray(svcRes) ? svcRes : []));
        setWorkers(Array.isArray(wrkRes?.data) ? wrkRes.data : (Array.isArray(wrkRes) ? wrkRes : []));
      } catch (_) {}
      try {
        const [daily, monthly] = await Promise.all([
          api.payments.revenue.daily().catch(() => null),
          api.payments.revenue.monthly().catch(() => null),
        ]);
        setDailyRev(daily?.data ?? daily?.total ?? daily ?? null);
        setMonthlyRev(monthly?.data ?? monthly?.total ?? monthly ?? null);
      } catch (_) {}
      setStatsLoading(false);
    };
    fetchStats();
  }, [business.id]);

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!form.businessName?.trim()) { showToast('Business name is required', 'error'); return; }
    if (form.phone && !isValidEthPhone(form.phone)) { showToast('Enter a valid business phone number', 'error'); return; }
    if (form.email && !isValidEmail(form.email)) { showToast('Enter a valid business email address', 'error'); return; }
    const mapsErr = validateGoogleMapsLink(form.googleMapsLink);
    if (mapsErr) { showToast(mapsErr, 'error'); return; }
    const hoursErr = validateWorkingHours(form.workingHours);
    if (hoursErr) { showToast(hoursErr, 'error'); return; }
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k !== 'id' && k !== 'workers' && k !== 'photos' && k !== 'isApproved' && k !== 'isSuspended') {
          fd.append(k, v === null || v === undefined ? '' : v);
        }
      });
      await api.user.updateBusiness(fd);
      showToast('Business updated successfully', 'success');
      setEditing(false);
      onUpdate();
    } catch (err) {
      showToast(err.message || 'Failed to update business', 'error');
    }
  };

  const formatWorkingHours = (wh) => {
    if (!wh) return 'Not set';
    try {
      const obj = typeof wh === 'string' ? JSON.parse(wh) : wh;
      const labels = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };
      return Object.entries(obj).map(([day, hrs]) => {
        if (hrs.closed) return `${labels[day] || day}: Closed`;
        return `${labels[day] || day}: ${hrs.open || 'N/A'} - ${hrs.close || 'N/A'}`;
      }).join(' | ');
    } catch {
      return typeof wh === 'string' ? wh : 'Invalid format';
    }
  };

  const statCards = [
    { label: 'Services', value: services.length, icon: <Briefcase size={20} />, color: 'var(--primary)' },
    { label: 'Workers', value: workers.length, icon: <Users size={20} />, color: 'var(--cyan)' },
    { label: 'Daily Revenue', value: dailyRev !== null ? `$${Number(dailyRev).toFixed(2)}` : '--', icon: <DollarSign size={20} />, color: 'var(--green)' },
    { label: 'Monthly Revenue', value: monthlyRev !== null ? `$${Number(monthlyRev).toFixed(2)}` : '--', icon: <BarChart3 size={20} />, color: 'var(--orange)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div className="grid-auto">
        {statCards.map((s, i) => (
          <div key={i} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '120px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{s.label}</span>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: s.color }}>{s.icon}</div>
            </div>
            {statsLoading ? (
              <div className="skeleton" style={{ width: '80px', height: '36px' }} />
            ) : (
              <h3 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</h3>
            )}
          </div>
        ))}
      </div>

      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
          <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={18} style={{ color: 'var(--primary)' }} /> Business Profile
          </h3>
          <button
            className={`glass-btn ${editing ? 'glass-btn-secondary' : ''}`}
            onClick={() => setEditing(!editing)}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            {editing ? <><X size={14} /> Cancel</> : <><Edit3 size={14} /> Edit</>}
          </button>
        </div>

          {editing ? (
          <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="grid-2" style={{ gap: 14 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Business Name</label>
                <input className="glass-input" value={form.businessName || ''} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Address</label>
                <input className="glass-input" value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>City</label>
                <input className="glass-input" value={form.city || ''} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Phone</label>
                <input className="glass-input" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Email</label>
                <input className="glass-input" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Description</label>
                <textarea className="glass-input" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Google Maps Link <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input className="glass-input" value={form.googleMapsLink || ''} onChange={e => setForm(f => ({ ...f, googleMapsLink: e.target.value }))} placeholder="https://maps.google.com/?q=9.0084,38.7575" />
                <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Open your business in Google Maps, tap Share &rarr; Copy link, then paste it here. We read the location from this link.
                </span>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Working Hours</label>
                <WorkingHoursInput value={form.workingHours} onChange={(val) => setForm(f => ({ ...f, workingHours: val }))} />
              </div>
            </div>
            <button className="glass-btn" type="submit" style={{ alignSelf: 'flex-start' }}><Save size={16} /> Save Changes</button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: 'var(--text-muted)' }}>
            <DetailRow icon={<Building2 size={14} />} label="Name" value={business.businessName} />
            <DetailRow icon={<FileText size={14} />} label="Description" value={business.description || 'N/A'} />
            <DetailRow icon={<MapPin size={14} />} label="Address" value={business.address || 'N/A'} />
            <DetailRow icon={<MapPin size={14} />} label="City" value={business.city || 'N/A'} />
            <DetailRow icon={<Phone size={14} />} label="Phone" value={business.phone || 'N/A'} />
            <DetailRow icon={<Mail size={14} />} label="Email" value={business.email || 'N/A'} />
            {business.googleMapsLink && (
              <DetailRow icon={<MapPin size={14} />} label="Google Maps" value={
                <a href={business.googleMapsLink} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)', textDecoration: 'none', fontSize: '13px' }}>View on Maps â†—</a>
              } />
            )}
            <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Working Hours</span>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{formatWorkingHours(business.workingHours)}</p>
            </div>
            <div style={{ marginTop: '8px', display: 'flex', gap: '12px' }}>
              <span className={`badge ${business.isApproved ? 'badge-confirmed' : 'badge-pending'}`}>
                {business.isApproved ? 'âœ“ Approved' : 'Pending'}
              </span>
              {business.isSuspended && <span className="badge badge-cancelled">Suspended</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ServicesTab({ businessId, showToast }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initServiceForm());
  const [saving, setSaving] = useState(false);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await api.business.listServices(businessId);
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setServices(list);
    } catch (err) {
      showToast(err.message || 'Failed to load services', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchServices(); }, [businessId]);

  const openAdd = () => {
    setForm(initServiceForm());
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (svc) => {
    setForm({ name: svc.name || '', description: svc.description || '', price: svc.price ?? '', duration: svc.duration ?? '' });
    setEditingId(svc.id);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast('Service name is required', 'error'); return; }
    const price = toPositiveNumber(form.price);
    if (price == null) { showToast('Price must be a positive number', 'error'); return; }
    const duration = toPositiveInt(form.duration);
    if (duration == null) { showToast('Duration must be a whole number greater than 0', 'error'); return; }
    setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim(), description: (form.description || '').trim(), price, duration };
      if (editingId) {
        await api.business.updateService(businessId, editingId, payload);
        showToast('Service updated', 'success');
      } else {
        await api.business.createService(businessId, payload);
        showToast('Service created', 'success');
      }
      setShowForm(false);
      fetchServices();
    } catch (err) {
      showToast(err.message || 'Failed to save service', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (svcId) => {
    if (!window.confirm('Delete this service?')) return;
    try {
      await api.business.deleteService(businessId, svcId);
      showToast('Service deleted', 'success');
      fetchServices();
    } catch (err) {
      showToast(err.message || 'Failed to delete service', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Briefcase size={18} style={{ color: 'var(--primary)' }} /> Services ({services.length})
        </h3>
        <button className="glass-btn" onClick={openAdd} style={{ padding: '8px 16px', fontSize: '13px' }}>
          <Plus size={14} /> Add Service
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h4 style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 700, marginBottom: '4px' }}>
            {editingId ? 'Edit Service' : 'New Service'}
          </h4>
          <div className="grid-2" style={{ gap: 14 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Name <span style={{ color: 'var(--red)' }}>*</span></label>
              <input className="glass-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Premium Wash" />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Description</label>
              <textarea className="glass-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Service description" />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Price ($)</label>
              <input className="glass-input" type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Duration (min)</label>
              <input className="glass-input" type="number" min="1" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="e.g. 30" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="glass-btn" type="submit" disabled={saving} style={{ padding: '8px 20px', fontSize: '13px' }}>
              {saving ? 'Saving...' : <><Save size={14} /> {editingId ? 'Update' : 'Create'}</>}
            </button>
            <button type="button" className="glass-btn glass-btn-secondary" onClick={() => setShowForm(false)} style={{ padding: '8px 20px', fontSize: '13px' }}>
              <X size={14} /> Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: '90px', borderRadius: '12px' }} />)}
        </div>
      ) : services.length === 0 ? (
        <EmptyState icon={<Briefcase size={40} />} title="No Services Yet" body="Add your first car wash service to get started." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {services.map(svc => (
            <div key={svc.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '18px 22px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h4 style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: 700 }}>{svc.name}</h4>
                  <span className="badge badge-confirmed" style={{ fontSize: '11px' }}>${Number(svc.price).toFixed(2)}</span>
                  <span className="badge badge-pending" style={{ fontSize: '11px' }}>{svc.duration} min</span>
                </div>
                {svc.description && (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{svc.description}</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button className="glass-btn glass-btn-secondary" onClick={() => openEdit(svc)} style={{ padding: '7px 12px', fontSize: '12px' }}>
                  <Edit3 size={13} />
                </button>
                <button className="glass-btn glass-btn-secondary" onClick={() => handleDelete(svc.id)} style={{ padding: '7px 12px', fontSize: '12px', borderColor: 'rgba(239,68,68,0.3)', color: 'var(--red)' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfigTab({ businessId, showToast }) {
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState(initConfigForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await api.business.getConfig(businessId);
      const cfg = res?.data || res || {};
      setConfig(cfg);
      const opHours = typeof cfg.operatingHours === 'object' ? cfg.operatingHours : {};
      const converted = {};
      for (const day of ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']) {
        const d = opHours[day];
        if (!d || d.isOpen === false) {
          converted[day] = { closed: true };
        } else {
          converted[day] = { open: d.open || '09:00', close: d.close || '18:00' };
        }
      }
      setForm({
        slotDuration: cfg.slotDuration ?? 30,
        bufferBetweenSlots: cfg.bufferBetweenSlots ?? 5,
        maxAdvanceBooking: cfg.maxAdvanceBooking ?? 30,
        maxSlotsPerBooking: cfg.maxSlotsPerBooking ?? 5,
        operatingHours: JSON.stringify(converted),
        slotDurationRules: Array.isArray(cfg.slotDurationRules) ? cfg.slotDurationRules : [],
      });
      try {
        const biz = await api.user.getMyBusiness();
        const b = biz?.data || biz || {};
        if (b && typeof b === 'object') {
          setForm(f => ({ ...f, mobileServiceEnabled: !!b.mobileServiceEnabled, mobileServiceRadiusKm: b.mobileServiceRadiusKm ?? 8 }));
        }
      } catch (_) { /* business profile may not exist */ }
    } catch (err) {
      showToast(err.message || 'Failed to load config', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfig(); }, [businessId]);

  const handleSave = async (e) => {
    e.preventDefault();
    const whErr = validateWorkingHours(form.operatingHours);
    if (whErr) { showToast(whErr, 'error'); return; }
    const radius = toPositiveNumber(form.mobileServiceRadiusKm, { allowZero: true });
    if (radius == null) { showToast('Service radius must be 0 or a positive number', 'error'); return; }
    const slotDuration = toPositiveInt(form.slotDuration);
    if (slotDuration == null) { showToast('Slot duration must be a whole number greater than 0', 'error'); return; }
    const buffer = toPositiveInt(form.bufferBetweenSlots, { allowZero: true });
    if (buffer == null) { showToast('Buffer must be 0 or a whole number', 'error'); return; }
    const maxAdvance = toPositiveInt(form.maxAdvanceBooking);
    if (maxAdvance == null) { showToast('Max advance booking must be a whole number greater than 0', 'error'); return; }
    const maxPerBooking = toPositiveInt(form.maxSlotsPerBooking);
    if (maxPerBooking == null) { showToast('Max slots per booking must be a whole number greater than 0', 'error'); return; }
    for (const r of form.slotDurationRules) {
      if (!r.from || !r.to) continue;
      if (!isValidTime(r.from) || !isValidTime(r.to)) { showToast('Slot rules must use HH:mm times', 'error'); return; }
      if (timeToMinutes(r.to) <= timeToMinutes(r.from)) { showToast('Slot rule: end time must be after start time', 'error'); return; }
    }
    setSaving(true);
    try {
      const wh = JSON.parse(form.operatingHours || '{}');
      const apiHours = {};
      for (const [day, val] of Object.entries(wh)) {
        apiHours[day] = val.closed ? { isOpen: false } : { isOpen: true, open: val.open, close: val.close };
      }
      const payload = {
        ...form,
        slotDuration,
        bufferBetweenSlots: buffer,
        maxAdvanceBooking: maxAdvance,
        maxSlotsPerBooking: maxPerBooking,
        operatingHours: apiHours,
        slotDurationRules: form.slotDurationRules.filter(r => r.from && r.to && r.duration),
      };
      await api.business.updateConfig(businessId, payload);
      try {
        await api.user.updateBusiness({
          mobileServiceEnabled: !!form.mobileServiceEnabled,
          mobileServiceRadiusKm: radius,
        });
      } catch (_) { /* mobile wash settings best-effort */ }
      showToast('Configuration saved', 'success');
      fetchConfig();
    } catch (err) {
      showToast(err.message || 'Failed to save config', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '12px' }} />)}
      </div>
    );
  }

  return (
    <div className="glass-card">
      <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
        <Settings size={18} style={{ color: 'var(--primary)' }} /> Business Configuration
      </h3>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div className="grid-2">
          <div style={{ gridColumn: 'span 2', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '6px' }}>
            <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <Navigation size={16} /> Mobile Wash Service
            </label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Accept Mobile Wash Bookings</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Let customers choose "Mobile Wash" so your team comes to their location.</div>
              </div>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, mobileServiceEnabled: !f.mobileServiceEnabled }))}
                style={{
                  width: '52px', height: '28px', borderRadius: '999px', border: 'none', cursor: 'pointer',
                  background: form.mobileServiceEnabled ? 'var(--primary)' : 'var(--border)',
                  position: 'relative', transition: 'background .2s', flexShrink: 0
                }}
                aria-label="Toggle mobile wash"
              >
                <span style={{
                  position: 'absolute', top: '3px', left: form.mobileServiceEnabled ? '27px' : '3px',
                  width: '22px', height: '22px', borderRadius: '50%', background: '#fff', transition: 'left .2s'
                }} />
              </button>
            </div>
            <div style={{ marginTop: '12px', maxWidth: '220px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Max Service Radius (km)</label>
              <input className="glass-input" type="number" min="1" max="200" value={form.mobileServiceRadiusKm} disabled={!form.mobileServiceEnabled} onChange={e => setForm(f => ({ ...f, mobileServiceRadiusKm: e.target.value }))} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Slot Duration (minutes)</label>
            <input className="glass-input" type="number" min="5" step="5" value={form.slotDuration} onChange={e => setForm(f => ({ ...f, slotDuration: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Buffer Between Slots (minutes)</label>
            <input className="glass-input" type="number" min="0" step="5" value={form.bufferBetweenSlots} onChange={e => setForm(f => ({ ...f, bufferBetweenSlots: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Max Advance Booking (days)</label>
            <input className="glass-input" type="number" min="1" value={form.maxAdvanceBooking} onChange={e => setForm(f => ({ ...f, maxAdvanceBooking: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Max Slots Per Booking</label>
            <input className="glass-input" type="number" min="1" value={form.maxSlotsPerBooking} onChange={e => setForm(f => ({ ...f, maxSlotsPerBooking: e.target.value }))} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Operating Hours</label>
            <WorkingHoursInput value={form.operatingHours} onChange={(val) => setForm(f => ({ ...f, operatingHours: val }))} />
          </div>
          <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Per-Time-Block Slot Duration Rules <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(leave empty to use global slot duration)</span></label>
            {form.slotDurationRules.map((rule, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                <input className="glass-input" type="text" placeholder="09:00" value={rule.from} onChange={e => { const r = [...form.slotDurationRules]; r[i] = { ...r[i], from: e.target.value }; setForm(f => ({ ...f, slotDurationRules: r })); }} style={{ width: '70px' }} />
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>to</span>
                <input className="glass-input" type="text" placeholder="12:00" value={rule.to} onChange={e => { const r = [...form.slotDurationRules]; r[i] = { ...r[i], to: e.target.value }; setForm(f => ({ ...f, slotDurationRules: r })); }} style={{ width: '70px' }} />
                <input className="glass-input" type="number" placeholder="Dur" value={rule.duration} onChange={e => { const r = [...form.slotDurationRules]; r[i] = { ...r[i], duration: e.target.value }; setForm(f => ({ ...f, slotDurationRules: r })); }} style={{ width: '60px' }} min="5" step="5" />
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>min, buf</span>
                <input className="glass-input" type="number" placeholder="Buf" value={rule.buffer ?? 5} onChange={e => { const r = [...form.slotDurationRules]; r[i] = { ...r[i], buffer: e.target.value }; setForm(f => ({ ...f, slotDurationRules: r })); }} style={{ width: '60px' }} min="0" step="5" />
                <button type="button" className="glass-btn" style={{ padding: '4px 10px', background: 'var(--danger)' }} onClick={() => setForm(f => ({ ...f, slotDurationRules: f.slotDurationRules.filter((_, j) => j !== i) }))}>X</button>
              </div>
            ))}
            <button type="button" className="glass-btn" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={() => setForm(f => ({ ...f, slotDurationRules: [...f.slotDurationRules, { from: '', to: '', duration: 30, buffer: 5 }] }))}>
              + Add Rule
            </button>
          </div>
        </div>
        <button className="glass-btn" type="submit" disabled={saving} style={{ alignSelf: 'flex-start' }}>
          {saving ? 'Saving...' : <><Save size={16} /> Save Configuration</>}
        </button>
      </form>

      {config && (
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Current Values</span>
          <div className="grid-auto-md" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            <div><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{config.slotDuration ?? '--'}</span> min per slot</div>
            <div><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{config.bufferBetweenSlots ?? '--'}</span> min buffer</div>
            <div><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{config.maxAdvanceBooking ?? '--'}</span> days advance</div>
            <div><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{config.maxSlotsPerBooking ?? '--'}</span> max slots</div>
          </div>
        </div>
      )}
    </div>
  );
}

function HolidaysTab({ businessId, showToast }) {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState('');
  const [newReason, setNewReason] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await api.business.listHolidays(businessId);
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setHolidays(list);
    } catch (err) {
      showToast(err.message || 'Failed to load holidays', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHolidays(); }, [businessId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newDate) { showToast('Please select a date', 'error'); return; }
    setAdding(true);
    try {
      await api.business.addHoliday(businessId, newDate, newReason || 'Holiday');
      showToast('Holiday added', 'success');
      setNewDate('');
      setNewReason('');
      fetchHolidays();
    } catch (err) {
      showToast(err.message || 'Failed to add holiday', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (holidayId) => {
    if (!window.confirm('Remove this holiday?')) return;
    try {
      await api.business.deleteHoliday(businessId, holidayId);
      showToast('Holiday removed', 'success');
      fetchHolidays();
    } catch (err) {
      showToast(err.message || 'Failed to delete holiday', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <form onSubmit={handleAdd} className="glass-card" style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Date</label>
          <input className="glass-input" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
        </div>
        <div style={{ flex: '1 1 250px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Reason</label>
          <input className="glass-input" value={newReason} onChange={e => setNewReason(e.target.value)} placeholder="e.g. Public Holiday" />
        </div>
        <button className="glass-btn" type="submit" disabled={adding} style={{ padding: '10px 20px', fontSize: '13px' }}>
          {adding ? 'Adding...' : <><Plus size={14} /> Add Holiday</>}
        </button>
      </form>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: '60px', borderRadius: '12px' }} />)}
        </div>
      ) : holidays.length === 0 ? (
        <EmptyState icon={<Calendar size={40} />} title="No Holidays" body="No holidays have been added yet." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {holidays.map(h => (
            <div key={h.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(245,158,11,0.08)', color: 'var(--orange)', display: 'flex' }}>
                  <Calendar size={16} />
                </div>
                <div>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '15px' }}>{new Date(h.date).toLocaleDateString()}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px', marginLeft: '10px' }}>{h.reason}</span>
                </div>
              </div>
              <button className="glass-btn glass-btn-secondary" onClick={() => handleDelete(h.id)} style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'rgba(239,68,68,0.3)', color: 'var(--red)' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkersTab({ showToast, setActiveTab }) {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);
      try {
        const res = await api.user.listWorkers();
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setWorkers(list);
      } catch (err) {
        showToast(err.message || 'Failed to load workers', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchWorkers();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} style={{ color: 'var(--primary)' }} /> Workers ({workers.length})
        </h3>
        {setActiveTab && (
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Manage workers in <button className="glass-btn glass-btn-secondary" onClick={() => setActiveTab('workers')} style={{ padding: '6px 14px', fontSize: '12px', display: 'inline-flex' }}>Worker Management <ChevronRight size={12} /></button>
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '70px', borderRadius: '12px' }} />)}
        </div>
      ) : workers.length === 0 ? (
        <EmptyState icon={<Users size={40} />} title="No Workers" body="You haven't added any workers yet." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {workers.map(w => (
            <div key={w.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '15px' }}>{w.name || w.fullName || 'Unknown'}</span>
                  {w.jobRole && <span className="badge badge-confirmed" style={{ fontSize: '10px' }}>{w.jobRole}</span>}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', gap: '16px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> {w.phone || 'N/A'}</span>
                  <span>Washes: <strong style={{ color: 'var(--text-primary)' }}>{w.washedCount ?? 0}</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RevenueTab({ showToast }) {
  const [daily, setDaily] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRevenue = async () => {
      setLoading(true);
      try {
        const [d, w, m, txnRes] = await Promise.all([
          api.payments.revenue.daily().catch(() => null),
          api.payments.revenue.weekly().catch(() => null),
          api.payments.revenue.monthly().catch(() => null),
          api.payments.listTransactions().catch(() => ({ data: [] })),
        ]);
        setDaily(d?.data ?? d?.total ?? d ?? null);
        setWeekly(w?.data ?? w?.total ?? w ?? null);
        setMonthly(m?.data ?? m?.total ?? m ?? null);
        const list = Array.isArray(txnRes?.data) ? txnRes.data : (Array.isArray(txnRes) ? txnRes : []);
        setTransactions(list);
      } catch (_) {
      } finally {
        setLoading(false);
      }
    };
    fetchRevenue();
  }, []);

  const revenueCards = [
    { label: 'Daily Revenue', value: daily, icon: <DollarSign size={22} />, color: 'var(--green)', glow: 'var(--green-glow)' },
    { label: 'Weekly Revenue', value: weekly, icon: <Activity size={22} />, color: 'var(--primary)', glow: 'var(--primary-glow)' },
    { label: 'Monthly Revenue', value: monthly, icon: <BarChart3 size={22} />, color: 'var(--cyan)', glow: 'var(--cyan-glow)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="grid-auto">
        {revenueCards.map((c, i) => (
          <div key={i} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '130px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{c.label}</span>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: c.color, boxShadow: `0 0 12px ${c.glow}` }}>{c.icon}</div>
            </div>
            {loading ? (
              <div className="skeleton" style={{ width: '100px', height: '40px' }} />
            ) : (
              <h3 style={{ fontSize: '34px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {c.value !== null ? `$${Number(c.value).toFixed(2)}` : '$0.00'}
              </h3>
            )}
          </div>
        ))}
      </div>

      <div className="glass-card">
        <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
          <CreditCard size={18} style={{ color: 'var(--primary)' }} /> Recent Transactions
        </h3>
        {loading ? (
          <div className="skeleton" style={{ height: '200px', borderRadius: '8px' }} />
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <CreditCard size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p style={{ fontSize: '14px' }}>No transactions yet.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="responsive-table">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>ID</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Method</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 15).map(txn => (
                  <tr key={txn.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '11px' }}>{txn.id?.slice(0, 8)}...</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-primary)', fontWeight: 600 }}>${Number(txn.amount).toFixed(2)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{txn.paymentMethod || txn.method || '--'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`badge ${txn.status === 'COMPLETED' || txn.status === 'SUCCESS' ? 'badge-completed' : txn.status === 'PENDING' ? 'badge-pending' : txn.status === 'FAILED' ? 'badge-cancelled' : 'badge-pending'}`} style={{ fontSize: '10px' }}>
                        {txn.status || '--'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                      {txn.createdAt ? new Date(txn.createdAt).toLocaleDateString() : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function ReportsTab({ showToast, refreshKey = 0, setActiveTab }) {
  const [stats, setStats] = useState(null);
  const [daily, setDaily] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [statsRes, d, w, m, workerRes, txnRes] = await Promise.all([
          api.bookings.getBusinessStats().catch(() => null),
          api.payments.revenue.daily().catch(() => null),
          api.payments.revenue.weekly().catch(() => null),
          api.payments.revenue.monthly().catch(() => null),
          api.user.listWorkers().catch(() => ({ data: [] })),
          api.payments.listTransactions().catch(() => ({ data: [] })),
        ]);
        setStats(statsRes?.data ?? statsRes ?? null);
        setDaily(d?.data ?? d?.total ?? d ?? null);
        setWeekly(w?.data ?? w?.total ?? w ?? null);
        setMonthly(m?.data ?? m?.total ?? m ?? null);
        const wl = Array.isArray(workerRes?.data) ? workerRes.data : (Array.isArray(workerRes) ? workerRes : []);
        setWorkers(wl);
        const tx = Array.isArray(txnRes?.data) ? txnRes.data : (Array.isArray(txnRes) ? txnRes : []);
        setTransactions(tx);
      } catch (_) {
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [refreshKey]);

  const s = stats || {};
  const inQueue = (s.pendingBookings ?? 0) + (s.confirmedBookings ?? 0) + (s.inProgressBookings ?? 0);

  const kpis = [
    { label: 'Total Bookings', value: s.totalBookings ?? 0, icon: <ListOrdered size={20} />, color: 'var(--primary)', glow: 'var(--primary-glow)' },
    { label: 'Washes Completed', value: s.completedWashes ?? 0, icon: <CheckCircle size={20} />, color: 'var(--green)', glow: 'var(--green-glow)' },
    { label: 'In Queue', value: inQueue, icon: <Clock size={20} />, color: 'var(--warning)', glow: 'var(--primary-glow)' },
    { label: "Today's Washes", value: s.todayBookings ?? 0, icon: <Calendar size={20} />, color: 'var(--cyan)', glow: 'var(--cyan-glow)' },
  ];

  const revenueCards = [
    { label: 'Daily Revenue', value: daily, icon: <DollarSign size={20} />, color: 'var(--green)', glow: 'var(--green-glow)' },
    { label: 'Weekly Revenue', value: weekly, icon: <Activity size={20} />, color: 'var(--primary)', glow: 'var(--primary-glow)' },
    { label: 'Monthly Revenue', value: monthly, icon: <BarChart3 size={20} />, color: 'var(--cyan)', glow: 'var(--cyan-glow)' },
  ];

  const tooltipStyle = { background: 'rgba(15, 23, 42, 0.92)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' };
  const chartTitle = { fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '14px' };
  const trend = Array.isArray(s.dailyTrend) ? s.dailyTrend : [];
  const byStatus = Object.entries(s.washesByStatus || {}).map(([name, value]) => ({ name, value }));
  const byWashType = Object.entries(s.washesByWashType || {}).map(([name, value]) => ({ name: name === 'MOBILE' ? 'Mobile' : 'On-Garage', value }));
  const byBookingType = Object.entries(s.washesByBookingType || {}).map(([name, value]) => ({ name: name === 'INSTANT' ? 'Instant' : 'Scheduled', value }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="grid-auto">
        {kpis.map((k, i) => (
          <div
            key={i}
            className={`glass-card${setActiveTab ? ' clickable-card' : ''}`}
            onClick={setActiveTab ? () => setActiveTab('bookings') : undefined}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '120px', cursor: setActiveTab ? 'pointer' : 'default' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{k.label}</span>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: k.color, boxShadow: `0 0 12px ${k.glow}` }}>{k.icon}</div>
            </div>
            {loading ? (
              <div className="skeleton" style={{ width: '80px', height: '38px' }} />
            ) : (
              <h3 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)' }}>{Number(k.value) || 0}</h3>
            )}
          </div>
        ))}
      </div>

      <div className="grid-auto">
        {revenueCards.map((c, i) => (
          <div
            key={`rev-${i}`}
            className={`glass-card${setActiveTab ? ' clickable-card' : ''}`}
            onClick={setActiveTab ? () => setActiveTab('payments') : undefined}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '130px', cursor: setActiveTab ? 'pointer' : 'default' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{c.label}</span>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: c.color, boxShadow: `0 0 12px ${c.glow}` }}>{c.icon}</div>
            </div>
            {loading ? (
              <div className="skeleton" style={{ width: '100px', height: '40px' }} />
            ) : (
              <h3 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)' }}>
                ${Number(c.value ?? 0).toFixed(2)}
              </h3>
            )}
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ ...chartTitle, color: 'var(--cyan)' }}>
          <Activity size={18} /> Washes Trend (Last 30 Days)
        </h3>
        {loading ? (
          <div className="skeleton" style={{ height: '260px', borderRadius: '12px' }} />
        ) : trend.length === 0 ? (
          <EmptyState icon={<BarChart3 size={40} />} title="No Data Yet" body="Bookings will appear here over time." />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="bookGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="doneGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
              <Area type="monotone" dataKey="bookings" name="Bookings" stroke="#06b6d4" strokeWidth={2} fill="url(#bookGrad)" />
              <Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} fill="url(#doneGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid-2">
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ ...chartTitle, color: 'var(--green)' }}>
            <CheckCircle size={18} /> Washes by Status
          </h3>
          <PieBreakdown data={byStatus} colorMap={STATUS_COLORS} loading={loading} />
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ ...chartTitle, color: 'var(--cyan)' }}>
            <Navigation size={18} /> Mobile vs On-Garage
          </h3>
          <PieBreakdown data={byWashType} colorMap={PIE_COLORS} loading={loading} />
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ ...chartTitle, color: 'var(--warning)' }}>
            <ListOrdered size={18} /> Instant vs Scheduled
          </h3>
          <PieBreakdown data={byBookingType} colorMap={PIE_COLORS} loading={loading} />
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ ...chartTitle, color: 'var(--primary)' }}>
            <Briefcase size={18} /> Top Services
          </h3>
          {loading ? (
            <div className="skeleton" style={{ height: '220px', borderRadius: '12px' }} />
          ) : (s.topServices || []).length === 0 ? (
            <EmptyState icon={<Briefcase size={36} />} title="No Services" body="Service bookings will appear here." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={(s.topServices || []).map(t => ({ name: t.serviceName, count: t.count }))} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={110} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ ...chartTitle, color: 'var(--green)' }}>
          <Users size={18} /> Worker Performance
        </h3>
        {loading ? (
          <div className="skeleton" style={{ height: '200px', borderRadius: '12px' }} />
        ) : workers.length === 0 ? (
          <EmptyState icon={<Users size={40} />} title="No Workers" body="Add workers from the Workers tab to see their performance." />
        ) : (
          <div className="table-wrap">
            <table className="responsive-table">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Worker</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Role</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Phone</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Washes</th>
                </tr>
              </thead>
              <tbody>
                {workers.map(w => (
                  <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-primary)', fontWeight: 600 }}>{w.name || w.fullName || 'Unknown'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{w.jobRole || '--'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`badge ${((w.isActive ?? true) === true || w.is_active === true) ? 'badge-completed' : 'badge-cancelled'}`} style={{ fontSize: '10px' }}>
                        {((w.isActive ?? true) === true || w.is_active === true) ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{w.phone || '--'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-primary)', fontWeight: 700 }}>{w.washedCount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ ...chartTitle, color: 'var(--primary)' }}>
          <CreditCard size={18} /> Recent Transactions
        </h3>
        {loading ? (
          <div className="skeleton" style={{ height: '200px', borderRadius: '12px' }} />
        ) : transactions.length === 0 ? (
          <EmptyState icon={<CreditCard size={40} />} title="No Transactions Yet" body="Payments will appear here." />
        ) : (
          <div className="table-wrap">
            <table className="responsive-table">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>ID</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Method</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 15).map(txn => (
                  <tr key={txn.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '11px' }}>{txn.id?.slice(0, 8)}...</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-primary)', fontWeight: 600 }}>${Number(txn.amount).toFixed(2)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{txn.paymentMethod || txn.method || '--'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`badge ${txn.status === 'COMPLETED' || txn.status === 'SUCCESS' ? 'badge-completed' : txn.status === 'PENDING' ? 'badge-pending' : txn.status === 'FAILED' ? 'badge-cancelled' : 'badge-pending'}`} style={{ fontSize: '10px' }}>
                        {txn.status || '--'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                      {txn.createdAt ? new Date(txn.createdAt).toLocaleDateString() : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PieBreakdown({ data, colorMap, loading }) {
  const tooltipStyle = { background: 'rgba(15, 23, 42, 0.92)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' };
  if (loading) return <div className="skeleton" style={{ height: '220px', borderRadius: '12px' }} />;
  if (data.length === 0) {
    return <EmptyState icon={<BarChart3 size={36} />} title="No Data Yet" body="Nothing to show." />;
  }
  const colorFor = (name) => (typeof colorMap === 'object' ? colorMap[name] : colorMap) || '#94a3b8';
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={72} innerRadius={44} paddingAngle={3} label={({ name }) => name}>
          {data.map((entry) => <Cell key={entry.name} fill={colorFor(entry.name)} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function BranchesTab({ businessId, showToast }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ branchName: '', address: '', city: '', phone: '', email: '', googleMapsLink: '', workingHours: '' });
  const [saving, setSaving] = useState(false);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await api.business.listBranches(businessId);
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setBranches(list);
    } catch (err) {
      showToast(err.message || 'Failed to load branches', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBranches(); }, [businessId]);

  const openAdd = () => {
    setForm({ branchName: '', address: '', city: '', phone: '', email: '', googleMapsLink: '', workingHours: '' });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (b) => {
    setForm({
      branchName: b.branchName || '',
      address: b.address || '',
      city: b.city || '',
      phone: b.phone || '',
      email: b.email || '',
      googleMapsLink: b.googleMapsLink || '',
      workingHours: typeof b.workingHours === 'object' ? JSON.stringify(b.workingHours) : (b.workingHours || ''),
    });
    setEditingId(b.id);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.branchName.trim()) { showToast('Branch name is required', 'error'); return; }
    if (form.phone && !isValidEthPhone(form.phone)) { showToast('Enter a valid branch phone number', 'error'); return; }
    if (form.email && !isValidEmail(form.email)) { showToast('Enter a valid branch email address', 'error'); return; }
    if (form.googleMapsLink && !isValidUrl(form.googleMapsLink)) { showToast('Google Maps link must be a valid URL', 'error'); return; }
    let parsedHours = null;
    if (form.workingHours) {
      try {
        parsedHours = JSON.parse(form.workingHours);
      } catch {
        showToast('Working hours must be valid JSON', 'error');
        return;
      }
      const hoursErr = validateWorkingHours(parsedHours);
      if (hoursErr) { showToast(hoursErr, 'error'); return; }
    }
    setSaving(true);
    try {
      const payload = { ...form, workingHours: parsedHours };
      if (editingId) {
        await api.business.updateBranch(businessId, editingId, payload);
        showToast('Branch updated', 'success');
      } else {
        await api.business.createBranch(businessId, payload);
        showToast('Branch created', 'success');
      }
      setShowForm(false);
      fetchBranches();
    } catch (err) {
      showToast(err.message || 'Failed to save branch', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (branchId) => {
    if (!window.confirm('Delete this branch?')) return;
    try {
      await api.business.deleteBranch(businessId, branchId);
      showToast('Branch deleted', 'success');
      fetchBranches();
    } catch (err) {
      showToast(err.message || 'Failed to delete branch', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={18} style={{ color: 'var(--primary)' }} /> Branches ({branches.length})
        </h3>
        <button className="glass-btn" onClick={openAdd} style={{ padding: '8px 16px', fontSize: '13px' }}>
          <Plus size={14} /> Add Branch
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h4 style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 700, marginBottom: '4px' }}>
            {editingId ? 'Edit Branch' : 'New Branch'}
          </h4>
          <div className="grid-2" style={{ gap: 14 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Branch Name <span style={{ color: 'var(--red)' }}>*</span></label>
              <input className="glass-input" value={form.branchName} onChange={e => setForm(f => ({ ...f, branchName: e.target.value }))} placeholder="e.g. Downtown Branch" />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Address</label>
              <input className="glass-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street address" />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>City</label>
              <input className="glass-input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="City" />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Phone</label>
              <input className="glass-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Email</label>
              <input className="glass-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email address" type="email" />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Google Maps Link</label>
              <input className="glass-input" value={form.googleMapsLink} onChange={e => setForm(f => ({ ...f, googleMapsLink: e.target.value }))} placeholder="https://maps.google.com/?q=..." />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Working Hours (JSON)</label>
              <textarea className="glass-input" value={form.workingHours} onChange={e => setForm(f => ({ ...f, workingHours: e.target.value }))} rows={3} placeholder='{"monday":{"open":"09:00","close":"18:00"}}' />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="glass-btn" type="submit" disabled={saving} style={{ padding: '8px 20px', fontSize: '13px' }}>
              {saving ? 'Saving...' : <><Save size={14} /> {editingId ? 'Update' : 'Create'}</>}
            </button>
            <button type="button" className="glass-btn glass-btn-secondary" onClick={() => setShowForm(false)} style={{ padding: '8px 20px', fontSize: '13px' }}>
              <X size={14} /> Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: '90px', borderRadius: '12px' }} />)}
        </div>
      ) : branches.length === 0 ? (
        <EmptyState icon={<MapPin size={40} />} title="No Branches Yet" body="Add your first branch to manage multiple locations." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {branches.map(b => (
            <div key={b.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '18px 22px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h4 style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: 700 }}>{b.branchName}</h4>
                  {b.isActive === false && <span className="badge badge-cancelled" style={{ fontSize: '10px' }}>Inactive</span>}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {b.address && <span><MapPin size={12} /> {b.address}</span>}
                  {b.city && <span>{b.city}</span>}
                  {b.phone && <span><Phone size={12} /> {b.phone}</span>}
                  {b.email && <span><Mail size={12} /> {b.email}</span>}
                  {b.googleMapsLink && (
                    <a href={b.googleMapsLink} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)', fontSize: '12px' }}>Maps â†—</a>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button className="glass-btn glass-btn-secondary" onClick={() => openEdit(b)} style={{ padding: '7px 12px', fontSize: '12px' }}>
                  <Edit3 size={13} />
                </button>
                <button className="glass-btn glass-btn-secondary" onClick={() => handleDelete(b.id)} style={{ padding: '7px 12px', fontSize: '12px', borderColor: 'rgba(239,68,68,0.3)', color: 'var(--red)' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

function WorkingHoursInput({ value, onChange }) {
  const defaults = {
    monday:    { open: '09:00', close: '18:00' },
    tuesday:   { open: '09:00', close: '18:00' },
    wednesday: { open: '09:00', close: '18:00' },
    thursday:  { open: '09:00', close: '18:00' },
    friday:    { open: '09:00', close: '18:00' },
    saturday:  { open: '09:00', close: '12:00' },
    sunday:    { closed: true },
  };

  const getSchedule = () => {
    const parsed = typeof value === 'object' ? value : (value ? JSON.parse(value) : {});
    return DAYS.map(d => {
      const day = parsed[d.key] || defaults[d.key] || {};
      return {
        key: d.key,
        label: d.label,
        closed: day.closed === true,
        open: day.open || '09:00',
        close: day.close || '18:00',
      };
    });
  };

  const [schedule, setSchedule] = useState(getSchedule);

  useEffect(() => {
    setSchedule(getSchedule());
  }, [value]);

  const updateDay = (key, field, val) => {
    const next = schedule.map(d => d.key === key ? { ...d, [field]: val } : d);
    setSchedule(next);
    const json = {};
    next.forEach(d => {
      json[d.key] = d.closed ? { closed: true } : { open: d.open, close: d.close };
    });
    onChange(JSON.stringify(json));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {schedule.map(day => (
        <div key={day.key} style={{
          display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
          borderRadius: '8px', background: 'var(--bg-surface)', border: '1px solid var(--border)'
        }}>
          <label style={{ minWidth: '90px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input type="checkbox" checked={day.closed} onChange={e => updateDay(day.key, 'closed', e.target.checked)}
              style={{ accentColor: 'var(--primary)', width: '14px', height: '14px' }} />
            {day.label}
          </label>
          {!day.closed && (
            <>
              <input type="time" value={day.open} onChange={e => updateDay(day.key, 'open', e.target.value)}
                className="glass-input" style={{ width: '110px', padding: '6px 10px', fontSize: '13px' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>to</span>
              <input type="time" value={day.close} onChange={e => updateDay(day.key, 'close', e.target.value)}
                className="glass-input" style={{ width: '110px', padding: '6px 10px', fontSize: '13px' }} />
            </>
          )}
          {day.closed && <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>Closed</span>}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, body }) {
  return (
    <div className="glass-card" style={{ textAlign: 'center', padding: '50px 20px' }}>
      <div style={{ marginBottom: '14px', opacity: 0.4, color: 'var(--primary)', display: 'flex', justifyContent: 'center' }}>{icon}</div>
      <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '6px' }}>{title}</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{body}</p>
    </div>
  );
}

function ReviewsTab({ businessId, showToast }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      try {
        const res = await api.bookings.listBusinessReviews(businessId);
        setReviews(Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      } catch (err) {
        showToast(err.message || 'Failed to load reviews', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [businessId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Star size={18} style={{ color: 'var(--primary)' }} /> Customer Reviews ({reviews.length})
      </h3>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '90px', borderRadius: '12px' }} />)}
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState icon={<Star size={40} />} title="No Reviews Yet" body="Customer reviews and ratings for your business will appear here." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reviews.map(rev => (
            <div key={rev.id} className="glass-card" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '15px' }}>
                    {rev.customerName || rev.reviewerName || rev.booking?.customerName || 'Verified Customer'}
                  </span>
                  <div style={{ display: 'flex', gap: '2px', color: '#f59e0b' }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star key={n} size={14} fill={n <= rev.rating ? '#f59e0b' : 'none'} style={{ opacity: n <= rev.rating ? 1 : 0.2 }} />
                    ))}
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : '--'}
                </span>
              </div>
              {rev.comment ? (
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  "{rev.comment}"
                </p>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                  No comment left.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
