import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setUser } from '../store/authSlice';
import { api } from '../services/api';
import { isValidEmail } from '../utils/validation';
import { User, Phone, Mail, Car, Bell, LogOut, ChevronRight, Edit3, Save, X, Shield, Trash2, AlertTriangle } from 'lucide-react';

export default function Profile({ user, showToast, onLogout, setActiveTab }) {
  const dispatch = useDispatch();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });
  const [saving, setSaving] = useState(false);

  const [deleteOtpSent, setDeleteOtpSent] = useState(false);
  const [deleteOtpCode, setDeleteOtpCode] = useState('');
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTimer, setDeleteTimer] = useState(0);
  const [sendingDeleteOtp, setSendingDeleteOtp] = useState(false);

  // Countdown timer for delete OTP
  useEffect(() => {
    if (!deleteOtpSent || deleteTimer <= 0) return;
    const interval = setInterval(() => {
      setDeleteTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [deleteOtpSent, deleteTimer]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.auth.getMe();
        const u = res?.data || res || {};
        setProfile(u);
        setForm({
          firstName: u.firstName || '',
          lastName:  u.lastName  || '',
          email:     u.email     || '',
        });
        const resolvedFullName = u.fullName || [u.firstName, u.lastName].filter(Boolean).join(' ');
        if (resolvedFullName && resolvedFullName !== user?.fullName) {
          localStorage.setItem('fullName', resolvedFullName);
          dispatch(setUser({ ...user, ...u, fullName: resolvedFullName }));
        }
      } catch (_) {}
      finally { setLoading(false); }
    })();
  }, [dispatch, user?.id]);

  const handleSave = async e => {
    e.preventDefault();
    const data = {
      ...form,
      firstName: (form.firstName || '').trim(),
      lastName: (form.lastName || '').trim(),
      email: (form.email || '').trim(),
    };
    if (!data.firstName || !data.lastName) { showToast('First and last name are required', 'error'); return; }
    if (data.email && !isValidEmail(data.email)) { showToast('Enter a valid email address', 'error'); return; }
    setSaving(true);
    try {
      await api.user.updateProfile(data);
      const newFullName = [data.firstName, data.lastName].filter(Boolean).join(' ') || data.firstName;
      await api.auth.updateProfile({ ...data, fullName: newFullName }).catch(() => {});
      showToast('Profile updated', 'success');
      setEditing(false);
      localStorage.setItem('fullName', newFullName);
      if (data.email) localStorage.setItem('email', data.email);
      setProfile(prev => ({ ...prev, ...data, fullName: newFullName }));
      dispatch(setUser({
        ...user,
        fullName: newFullName,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
      }));
    } catch (err) {
      showToast(err.message || 'Update failed', 'error');
    } finally { setSaving(false); }
  };

  const handleSendDeleteOtp = async () => {
    setSendingDeleteOtp(true);
    try {
      await api.auth.sendDeleteOtp(profile?.phone || user.phone);
      setDeleteOtpSent(true);
      setDeleteTimer(60);
      showToast('OTP sent to your phone', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to send OTP', 'error');
    } finally {
      setSendingDeleteOtp(false);
    }
  };

  const handleResendDeleteOtp = async () => {
    if (deleteTimer > 0 || sendingDeleteOtp) return;
    setSendingDeleteOtp(true);
    try {
      await api.auth.sendDeleteOtp(profile?.phone || user.phone);
      setDeleteTimer(60);
      showToast('A new OTP has been sent!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to resend OTP', 'error');
    } finally {
      setSendingDeleteOtp(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteOtpCode.length !== 4) { showToast('Enter the 4-digit OTP code', 'error'); return; }
    setDeleting(true);
    try {
      await api.auth.deleteAccount(profile?.phone || user.phone, deleteOtpCode);
      showToast('Account deleted successfully', 'success');
      setTimeout(() => onLogout(), 1500);
    } catch (err) {
      showToast(err.message || 'Failed to delete account', 'error');
    } finally { setDeleting(false); }
  };

  const name = profile?.fullName || `${form.firstName} ${form.lastName}`.trim() || user.fullName || 'User';

  return (
    <div className="slide-in">
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24 }}>Account</h1>

      {/* Avatar section */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 12, boxShadow: '0 4px 16px var(--primary-glow)',
        }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
        {loading
          ? <div className="skeleton" style={{ width: 120, height: 18, marginBottom: 6 }} />
          : <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{name}</h2>
        }
        <span style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
          color: 'var(--primary)', background: 'var(--primary-bg)',
          padding: '3px 12px', borderRadius: 99,
        }}>
          {user.role?.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Info card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Personal Information</h3>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setEditing(e => !e)}
            style={{ padding: '6px 12px', gap: 6 }}
          >
            {editing ? <><X size={13} /> Cancel</> : <><Edit3 size={13} /> Edit</>}
          </button>
        </div>

        {editing ? (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="grid-auto-sm">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input className="form-input" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input className="form-input" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <button className="btn btn-primary btn-sm" type="submit" disabled={saving} style={{ alignSelf: 'flex-start', gap: 6 }}>
              <Save size={13} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        ) : loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 20 }} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: <Phone size={15}/>, label: 'Phone', val: profile?.phone || user.phone || '—' },
              { icon: <Mail size={15}/>, label: 'Email', val: profile?.email || '—' },
              { icon: <Shield size={15}/>, label: 'Role', val: user.role?.replace(/_/g, ' ') },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: 'var(--primary)', width: 20, display: 'flex' }}>{r.icon}</span>
                <div>
                  <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700 }}>{r.label}</p>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{r.val}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="card" style={{ marginBottom: 16 }}>
        {[
          { icon: <Car size={16}/>, label: 'My Vehicles',    tab: 'vehicles' },
          { icon: <Bell size={16}/>, label: 'Notifications',  tab: 'notifications' },
        ].map((item, i, arr) => (
          <div key={i}>
            <div
              role="button"
              tabIndex={0}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', cursor: 'pointer' }}
              onClick={() => setActiveTab?.(item.tab)}
              onKeyDown={e => e.key === 'Enter' && setActiveTab?.(item.tab)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: 'var(--primary)' }}>{item.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{item.label}</span>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
            {i < arr.length - 1 && <div className="divider" style={{ margin: 0 }} />}
          </div>
        ))}
      </div>

      {/* Sign out */}
      <button
        className="btn btn-full"
        onClick={onLogout}
        style={{
          background: 'var(--danger-bg)', color: 'var(--danger)',
          border: '1.5px solid rgba(239,68,68,0.25)', fontWeight: 600, gap: 8,
        }}
      >
        <LogOut size={16} /> Sign Out
      </button>

      {/* Delete Account */}
      <div style={{ marginTop: 20 }}>
        {!showDeleteConfirm ? (
          <button
            className="btn btn-full"
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              background: 'transparent', color: 'var(--text-muted)',
              border: '1.5px solid var(--border)', fontWeight: 500, gap: 8, fontSize: 13,
            }}
          >
            <Trash2 size={15} /> Delete Account
          </button>
        ) : (
          <div className="card" style={{ border: '1.5px solid rgba(239,68,68,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <AlertTriangle size={18} style={{ color: 'var(--danger)', flexShrink: 0 }} />
              <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--danger)' }}>Delete Account</h4>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
              This will permanently delete your account and all associated data. This action cannot be undone.
            </p>

            {!deleteOtpSent ? (
              <button
                className="btn btn-danger btn-full btn-sm"
                onClick={handleSendDeleteOtp}
                disabled={sendingDeleteOtp}
              >
                {sendingDeleteOtp ? 'Sending OTP...' : 'Send OTP to my phone'}
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Enter 4-digit OTP code sent to your phone</label>
                  <input
                    className="form-input"
                    type="text"
                    maxLength={4}
                    placeholder="0000"
                    value={deleteOtpCode}
                    onChange={e => setDeleteOtpCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    style={{ textAlign: 'center', fontSize: 20, letterSpacing: 8 }}
                    autoFocus
                  />
                </div>

                {/* Countdown + Resend */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {deleteTimer > 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                      Resend in <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{deleteTimer}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', fontWeight: 600, fontSize: 12, cursor: 'pointer', padding: 0 }}
                      onClick={handleResendDeleteOtp}
                      disabled={sendingDeleteOtp}
                    >
                      {sendingDeleteOtp ? 'Sending...' : 'Resend OTP'}
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-ghost btn-sm btn-full"
                    onClick={() => { setShowDeleteConfirm(false); setDeleteOtpSent(false); setDeleteOtpCode(''); setDeleteTimer(0); }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-danger btn-sm btn-full"
                    onClick={handleDeleteAccount}
                    disabled={deleting || deleteOtpCode.length !== 4}
                  >
                    {deleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 20 }}>
        Care Car Wash · v1.0.0
      </p>
    </div>
  );
}
