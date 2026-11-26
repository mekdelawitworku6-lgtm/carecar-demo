import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { isValidEthPhone } from '../utils/validation';
import { toAmPm } from '../utils/timeFormat';
import {
  Calendar, Clock, Check, XCircle, Star, Play, User, UserCheck, Phone,
  RefreshCw, Plus, ChevronDown, ChevronUp, Building2, Wrench,
  Car, CreditCard, X, Zap
} from 'lucide-react';

const STATUS_BADGE = {
  PENDING:     'badge-pending',
  CONFIRMED:   'badge-confirmed',
  IN_PROGRESS: 'badge-confirmed',
  COMPLETED:   'badge-completed',
  CANCELLED:   'badge-cancelled',
};

const TRANSITIONS = {
  PENDING:      ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:    ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS:  ['COMPLETED', 'CANCELLED'],
};

export default function OwnerBookings({ user, showToast }) {
  const [bookings, setBookings]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [myBusiness, setMyBusiness]   = useState(null);
  const [expandedId, setExpandedId]   = useState(null);
  const [filter, setFilter]           = useState('ALL');

  const [showNewForm, setShowNewForm] = useState(false);
  const [services, setServices]       = useState([]);
  const [slots, setSlots]             = useState([]);
  const [form, setForm]               = useState({ name: '', phone: '', serviceId: '', slotId: '', date: new Date().toISOString().split('T')[0] });
  const [submitting, setSubmitting]   = useState(false);

  const [workers, setWorkers]         = useState([]);
  const [selectedWorkers, setSelectedWorkers] = useState({});

  const fetchMyBusiness = useCallback(async () => {
    try {
      const res = await api.user.getMyBusiness();
      const biz = res?.data || res || null;
      setMyBusiness(biz);
      return biz;
    } catch (_) { return null; }
  }, []);

  const fetchWorkers = useCallback(async () => {
    try {
      const res = await api.user.listWorkers();
      setWorkers(Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
    } catch (_) { setWorkers([]); }
  }, []);

  const fetchBookings = useCallback(async () => {
    if (!myBusiness?.id) return;
    setLoading(true);
    try {
      const res = await api.bookings.list({ businessId: myBusiness.id, limit: 100 });
      setBookings(Array.isArray(res?.data) ? res.data : []);
    } catch (_) { setBookings([]); }
    finally { setLoading(false); }
  }, [myBusiness?.id]);

  useEffect(() => {
    fetchMyBusiness();
    fetchWorkers();
  }, [fetchMyBusiness, fetchWorkers]);
  useEffect(() => { if (myBusiness?.id) fetchBookings(); }, [myBusiness?.id, fetchBookings]);

  const handleStatus = async (id, status) => {
    try {
      const booking = bookings.find(b => b.id === id);
      const workerId = selectedWorkers[id] || booking?.workerId || undefined;
      if (status === 'CONFIRMED' && !workerId) {
        showToast('Assign a washer first before confirming', 'error');
        return;
      }
      await api.bookings.changeStatus(id, status, '', workerId);
      showToast(`Booking ${status.toLowerCase()}`, 'success');
      fetchBookings();
      fetchWorkers();
    } catch (err) {
      showToast(err.message || 'Status update failed', 'error');
    }
  };

  const openNewForm = async () => {
    setShowNewForm(true);
    setForm({ name: '', phone: '', serviceId: '', slotId: '', date: new Date().toISOString().split('T')[0] });
    setSlots([]);
    if (myBusiness?.id) {
      try {
        const res = await api.business.listServices(myBusiness.id);
        setServices(Array.isArray(res?.data) ? res.data : []);
      } catch (_) { setServices([]); }
    }
  };

  const loadSlots = async date => {
    if (!myBusiness?.id || !date) { setSlots([]); return; }
    try {
      const res = await api.slots.getAvailableSlots(myBusiness.id, date, date);
      setSlots(Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
    } catch (_) { setSlots([]); }
  };

  useEffect(() => { if (showNewForm) loadSlots(form.date); }, [form.date, showNewForm]);

  const handleCreate = async e => {
    e.preventDefault();
    if (!form.name.trim()) { showToast('Customer name is required', 'error'); return; }
    if (form.phone.trim() && !isValidEthPhone(form.phone.trim())) { showToast('Enter a valid phone number (e.g. 09XX XXX XXX)', 'error'); return; }
    if (!form.serviceId) { showToast('Select a service', 'error'); return; }
    if (!form.slotId) { showToast('Select a time slot', 'error'); return; }
    if (form.date && form.date < new Date().toISOString().split('T')[0]) { showToast('Date cannot be in the past', 'error'); return; }
    setSubmitting(true);
    try {
      const slot = slots.find(s => s.id === form.slotId);
      await api.bookings.create({
        businessId: myBusiness.id,
        serviceId: form.serviceId,
        bookingType: 'SCHEDULED',
        date: form.date,
        startTime: slot?.startTime,
        endTime: slot?.endTime,
        slotIds: [form.slotId],
        customerName: form.name.trim(),
        customerPhone: form.phone.trim() || undefined,
      });
      showToast('Walk-in booking created', 'success');
      setShowNewForm(false);
      fetchBookings();
    } catch (err) {
      showToast(err.message || 'Booking failed', 'error');
    } finally { setSubmitting(false); }
  };

  const filtered = filter === 'ALL' ? bookings : bookings.filter(b => b.status === filter);
  const statuses = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

  return (
    <div className="slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Bookings</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {myBusiness?.businessName || 'Manage your bookings'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={fetchBookings} disabled={loading}>
            <RefreshCw size={15} />
          </button>
          <button className="btn btn-primary btn-sm" onClick={openNewForm}>
            <Plus size={15} /> Walk-in
          </button>
        </div>
      </div>

      {/* Status filter chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, fontSize: 12 }}>
        {statuses.map(s => (
          <button
            key={s}
            className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(s)}
            style={{ padding: '6px 12px' }}
          >
            {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* New walk-in form */}
      {showNewForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Walk-in Booking</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowNewForm(false)}><X size={15} /></button>
          </div>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Name</label>
                <input className="form-input" placeholder="Customer name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Phone</label>
                <input className="form-input" placeholder="Optional" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Service</label>
                <select className="form-input" value={form.serviceId} onChange={e => setForm(p => ({ ...p, serviceId: e.target.value }))}>
                  <option value="">Select</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} — ETB {s.price}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
            </div>
            {form.date && slots.length > 0 && (
              <div>
                <label className="form-label">Time Slot</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                  {slots.filter(s => s.status === 'AVAILABLE').map(s => (
                    <button
                      key={s.id}
                      type="button"
                      className={`btn btn-sm ${form.slotId === s.id ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setForm(p => ({ ...p, slotId: s.id }))}
                      style={{ padding: '6px 12px' }}
                    >
                      {toAmPm(s.startTime)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {form.date && slots.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No available slots for this date.</p>
            )}
            <button type="submit" className="btn btn-primary" disabled={submitting || !form.name || !form.serviceId || !form.slotId}>
              {submitting ? 'Booking...' : 'Create Booking'}
            </button>
          </form>
        </div>
      )}

      {/* Bookings list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 16 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
          <Calendar size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600 }}>No bookings</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Create a walk-in booking or wait for customers.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(b => {
            const ct = TRANSITIONS[b.status] || [];
            const isExpanded = expandedId === b.id;
            return (
              <div key={b.id}>
                <div className="card" onClick={() => setExpandedId(isExpanded ? null : b.id)} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1 }}>
                      <div style={{ padding: 10, borderRadius: 12, background: 'var(--primary-bg)', color: 'var(--primary)', flexShrink: 0 }}>
                        {b.bookingType === 'INSTANT' ? <Zap size={20} /> : <Calendar size={20} />}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                            {b.customerName || 'Customer'}
                          </span>
                          <span className={`badge ${STATUS_BADGE[b.status] || 'badge-pending'}`}>{b.status}</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Clock size={12} /> {b.bookingType === 'INSTANT' ? 'Immediate' : `${toAmPm(b.startTime)} – ${toAmPm(b.endTime)}`}
                          </span>
                          {b.customerPhone && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Phone size={12} /> {b.customerPhone}</span>}
                          {b.serviceName && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Wrench size={12} /> {b.serviceName}</span>}
                          {b.vehicle && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Car size={12} /> {b.vehicle}</span>}
                          {b.totalAmount && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><CreditCard size={12} /> ETB {b.totalAmount}</span>}
                          {b.workerName && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--primary)', fontWeight: 600 }}>
                              <UserCheck size={12} /> Washer: {b.workerName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '12px 16px', background: 'var(--bg-card-subtle)', borderRadius: 12, marginTop: 8, marginLeft: 20 }}>
                    {workers.length > 0 && b.status !== 'COMPLETED' && b.status !== 'CANCELLED' && (
                      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                          Assigned Washer:
                        </span>
                        <select
                          className="form-input"
                          style={{ width: 'auto', padding: '4px 8px', fontSize: 12, height: 32 }}
                          value={selectedWorkers[b.id] || b.workerId || ''}
                          onChange={(e) => setSelectedWorkers(prev => ({ ...prev, [b.id]: e.target.value }))}
                        >
                          <option value="">{b.workerName ? `Current: ${b.workerName}` : 'Auto-assign / Unassigned'}</option>
                          {workers.map(w => (
                            <option key={w.id} value={w.id}>
                              {w.name} {w.jobRole ? `(${w.jobRole})` : ''} - {w.washedCount || 0} washes
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {ct.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {ct.includes('CONFIRMED')   && <button className="btn btn-primary btn-sm" onClick={() => handleStatus(b.id,'CONFIRMED')}><Check size={13}/> Confirm</button>}
                        {ct.includes('IN_PROGRESS') && <button className="btn btn-sm" style={{ background:'var(--info)', color:'#fff' }} onClick={() => handleStatus(b.id,'IN_PROGRESS')}><Play size={13}/> Start</button>}
                        {ct.includes('COMPLETED')   && <button className="btn btn-success btn-sm" onClick={() => handleStatus(b.id,'COMPLETED')}><Star size={13}/> Complete</button>}
                        {ct.includes('CANCELLED')   && <button className="btn btn-danger btn-sm"  onClick={() => handleStatus(b.id,'CANCELLED')}><XCircle size={13}/> Cancel</button>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
