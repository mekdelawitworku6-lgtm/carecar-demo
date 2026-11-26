import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../services/api';
import { generateSlots as genSlotsThunk, blockSlots as blockSlotsThunk, selectSlotsLoading } from '../store/slotsSlice';
import { toAmPm } from '../utils/timeFormat';
import { Calendar, Clock, Sparkles, RefreshCw, Ban, EyeOff, ChevronDown, ChevronUp, Save } from 'lucide-react';

export default function Slots({ user, showToast }) {
  const dispatch = useDispatch();
  const loading = useSelector(selectSlotsLoading);

  const [date, setDate]           = useState(new Date().toISOString().split('T')[0]);
  const [businessId, setBusinessId] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [slots, setSlots]         = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [viewRange, setViewRange]   = useState(null);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [genStart, setGenStart]   = useState(new Date().toISOString().split('T')[0]);
  const [genEnd, setGenEnd]       = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [generating, setGenerating] = useState(false);

  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockDate, setBlockDate]   = useState(new Date().toISOString().split('T')[0]);
  const [blockStart, setBlockStart] = useState('09:00');
  const [blockEnd, setBlockEnd]     = useState('10:00');
  const [blockReason, setBlockReason] = useState('');
  const [blocking, setBlocking]     = useState(false);

  const [expandedDates, setExpandedDates] = useState({});
  const [editingSlot, setEditingSlot] = useState(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  const isOwner = user?.role === 'BUSINESS_OWNER' || user?.role === 'ADMIN';

  /* Load businesses on mount */
  useEffect(() => {
    if (user?.role === 'BUSINESS_OWNER') {
      api.user.getMyBusiness().then(bizRes => {
        const biz = bizRes?.data || bizRes || null;
        if (biz && biz.id) {
          setBusinesses([biz]);
          setBusinessId(biz.id);
        }
      }).catch(() => {});
    } else {
      api.business.listPublic({ limit: 50 }).then(res => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setBusinesses(list);
        if (list.length > 0 && !businessId) setBusinessId(list[0].id);
      }).catch(() => {});
    }
  }, []);

  const fetchSlotsForDate = async (range) => {
    if (!businessId) return;
    setLocalLoading(true);
    try {
      const end = range || viewRange;
      const res = await api.slots.getSlotsByDate(businessId, date, end);
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setSlots(list);
    } catch (err) {
      setSlots([]);
      showToast(err.message || 'Failed to fetch slots', 'error');
    } finally {
      setLocalLoading(false);
    }
  };

  useEffect(() => { fetchSlotsForDate(); }, [date, businessId, viewRange]);

  /* Group slots by date */
  const safeSlots = Array.isArray(slots) ? slots : [];
  const slotsByDate = safeSlots.reduce((acc, s) => {
    const d = s.date || date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(s);
    return acc;
  }, {});

  const sortedDates = Object.keys(slotsByDate).sort();

  const toggleDate = (d) => {
    setExpandedDates(prev => ({ ...prev, [d]: !prev[d] }));
  };

  const handleGenerate = async e => {
    e.preventDefault();
    if (!businessId) { showToast('Please select a business', 'error'); return; }
    if (!genStart || !genEnd) { showToast('Start and end dates are required', 'error'); return; }
    if (genEnd < genStart) { showToast('End date must be on or after the start date', 'error'); return; }
    setGenerating(true);
    try {
      await dispatch(genSlotsThunk({ businessId, startDate: genStart, endDate: genEnd })).unwrap();
      showToast('Slots generated successfully!', 'success');
      setViewRange(genEnd);
      setDate(genStart);
      fetchSlotsForDate(genEnd);
    } catch (err) {
      showToast(err.message || 'Failed to generate slots', 'error');
    } finally { setGenerating(false); }
  };

  const handleBlockSlots = async e => {
    e.preventDefault();
    if (!businessId) { showToast('Please select a business', 'error'); return; }
    if (!blockDate || !blockStart || !blockEnd) { showToast('Date, start time, and end time are required', 'error'); return; }
    if (blockEnd <= blockStart) { showToast('End time must be after start time', 'error'); return; }
    setBlocking(true);
    try {
      await dispatch(blockSlotsThunk({ businessId, date: blockDate, startTime: blockStart, endTime: blockEnd, reason: blockReason })).unwrap();
      showToast('Slots blocked successfully!', 'success');
      setShowBlockForm(false);
      setBlockReason('');
      fetchSlotsForDate();
    } catch (err) {
      showToast(err.message || 'Failed to block slots', 'error');
    } finally { setBlocking(false); }
  };

  /* Slot status styling */
  const slotStyle = status => {
    if (status === 'AVAILABLE') return { bg: 'rgba(16,185,129,0.08)', border: 'var(--success)', color: 'var(--success)' };
    if (status === 'BOOKED')    return { bg: 'rgba(239,68,68,0.07)',  border: 'var(--danger)',  color: 'var(--danger)'  };
    if (status === 'BLOCKED')   return { bg: 'rgba(107,114,128,0.08)', border: 'var(--border)', color: 'var(--text-muted)' };
    return { bg: 'var(--bg-surface)', border: 'var(--border)', color: 'var(--text-muted)' };
  };

  const isLoading = loading || localLoading;

  return (
    <div className="slide-in">
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
          Service Slots
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          View availability or manage time slots for your business.
        </p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1 1 160px', marginBottom: 0 }}>
            <label className="form-label">Business</label>
            <select
              className="form-input"
              value={businessId}
              onChange={e => setBusinessId(e.target.value)}
              style={{ appearance: 'none' }}
            >
              <option value="" disabled>Select business</option>
              {businesses.map(b => (
                <option key={b.id} value={b.id}>{b.businessName}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: '1 1 140px', marginBottom: 0 }}>
            <label className="form-label">
              {viewRange ? `Date Range (${date} → ${viewRange})` : 'Date'}
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={e => { setDate(e.target.value); setViewRange(null); }}
                style={{ flex: 1 }}
              />
              {viewRange && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setViewRange(null)}
                  title="Clear range filter"
                  style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => fetchSlotsForDate()}
            disabled={isLoading}
            style={{ padding: '10px 14px', marginBottom: 0, alignSelf: 'flex-end' }}
          >
            <RefreshCw size={15} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Slots by date */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            Available Timings
          </h3>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} /> Available
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} /> Booked
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block' }} /> Blocked
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="grid-slots">
            {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 70, borderRadius: 10 }} />)}
          </div>
        ) : slots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <Calendar size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontSize: 14, fontWeight: 600 }}>No slots for this date</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>
              {isOwner ? 'Generate slots using the form below.' : 'Check back later.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sortedDates.map(dateKey => {
              const isExpanded = expandedDates[dateKey] !== false;
              const daySlots = slotsByDate[dateKey];
              const dateLabel = new Date(dateKey).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
              const availCount = daySlots.filter(s => s.status === 'AVAILABLE').length;
              return (
                <div key={dateKey} className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div
                    onClick={() => toggleDate(dateKey)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '14px 16px', cursor: 'pointer',
                      borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Calendar size={16} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{dateLabel}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {daySlots.length} slots · {availCount} available
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                  {isExpanded && (
                    <div style={{ padding: '12px 16px 16px' }}>
                      <div className="grid-slots">
                        {daySlots.map(s => {
                          const st = slotStyle(s.status);
                          return (
                            <div
                              key={s.id}
                              style={{
                                padding: '6px 8px', borderRadius: 8, textAlign: 'center',
                                background: st.bg, border: `1.5px solid ${st.border}`,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                minHeight: 46, position: 'relative', transition: 'var(--transition-smooth)'
                              }}
                            >
                              {editingSlot === s.id ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
                                  <input type="time" value={editStart} onChange={e => setEditStart(e.target.value)} className="form-input" style={{ width: '100%', padding: '2px 4px', fontSize: 10, textAlign: 'center', height: 22 }} />
                                  <input type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)} className="form-input" style={{ width: '100%', padding: '2px 4px', fontSize: 10, textAlign: 'center', height: 22 }} />
                                  <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginTop: 2 }}>
                                    <button className="btn btn-primary btn-sm" style={{ padding: '2px 6px', fontSize: 9, lineHeight: 1.2, minHeight: 0 }} onClick={async () => {
                                      if (!editStart || !editEnd) { showToast('Start and end times are required', 'error'); return; }
                                      if (editEnd <= editStart) { showToast('End time must be after start time', 'error'); return; }
                                      try {
                                        await api.slots.updateSlot(businessId, s.id, editStart, editEnd);
                                        showToast('Slot updated', 'success');
                                        setEditingSlot(null);
                                        fetchSlotsForDate();
                                      } catch (err) {
                                        showToast(err.message || 'Failed to update slot', 'error');
                                      }
                                    }}><Save size={9} /></button>
                                    <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 9, lineHeight: 1.2, minHeight: 0 }} onClick={() => setEditingSlot(null)}>✕</button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.color, display: 'inline-block', flexShrink: 0 }} />
                                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{toAmPm(s.startTime)}</span>
                                  </div>
                                  <span style={{ fontSize: 9, fontWeight: 600, color: st.color, textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: 2 }}>
                                    {s.status.toLowerCase()}
                                  </span>
                                  {isOwner && s.status === 'AVAILABLE' && (
                                    <button
                                      className="btn btn-ghost btn-sm"
                                      title="Edit time"
                                      style={{ position: 'absolute', top: 2, right: 2, padding: '1px 4px', fontSize: 8, lineHeight: 1, minHeight: 0, opacity: 0.5 }}
                                      onClick={() => { setEditingSlot(s.id); setEditStart(s.startTime); setEditEnd(s.endTime); }}
                                    >
                                      ✎
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Block time toggle — owners only */}
        {isOwner && slots.length > 0 && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowBlockForm(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {showBlockForm ? <EyeOff size={14} /> : <Ban size={14} />}
              {showBlockForm ? 'Hide Block Form' : 'Block Time Slots'}
            </button>
          </div>
        )}

        {/* Block form */}
        {showBlockForm && (
          <form
            onSubmit={handleBlockSlots}
            style={{
              marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14,
              padding: 14, borderRadius: 10,
              background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            <h4 style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}>
              <Ban size={13} /> Block Slots
            </h4>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Date</label>
                <input type="date" className="form-input" value={blockDate} onChange={e => setBlockDate(e.target.value)} required />
              </div>
              <div className="form-group" style={{ flex: '1 1 100px', marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Start</label>
                <input type="time" className="form-input" value={blockStart} onChange={e => setBlockStart(e.target.value)} required />
              </div>
              <div className="form-group" style={{ flex: '1 1 100px', marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 11 }}>End</label>
                <input type="time" className="form-input" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} required />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Reason (optional)</label>
              <input type="text" className="form-input" placeholder="e.g. Maintenance" value={blockReason} onChange={e => setBlockReason(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-danger btn-sm" style={{ alignSelf: 'flex-start' }} disabled={blocking}>
              {blocking ? 'Blocking...' : 'Block Slots'}
            </button>
          </form>
        )}
      </div>

      {/* Generate slots — owners only */}
      {isOwner && (
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} style={{ color: 'var(--primary)' }} /> Generate Slots
          </h3>
          <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: '1 1 140px', marginBottom: 0 }}>
                <label className="form-label">Start Date</label>
                <input type="date" className="form-input" value={genStart} onChange={e => setGenStart(e.target.value)} required />
              </div>
              <div className="form-group" style={{ flex: '1 1 140px', marginBottom: 0 }}>
                <label className="form-label">End Date</label>
                <input type="date" className="form-input" value={genEnd} onChange={e => setGenEnd(e.target.value)} required />
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={generating || !businessId}
              style={{ alignSelf: 'flex-start' }}
            >
              <Sparkles size={15} />
              {generating ? 'Generating...' : 'Run Slot Generator'}
            </button>
          </form>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
