import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { toAmPm } from '../utils/timeFormat';
import {
  Calendar, Car, Clock, ShieldCheck, AlertCircle, Check, XCircle,
  Star, Play, History, ChevronDown, ChevronUp, Building2, Wrench,
  RefreshCw, Plus, MapPin, Phone, ArrowLeft, Home, Droplets, X, Zap,
  CreditCard, User, RotateCcw
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { selectSelectedBusiness, setSelectedBusiness } from '../store/uiSlice';

/* ─── Status config ──────────────────────────────────────── */
const STATUS_BADGE = {
  PENDING:     'badge-pending',
  CONFIRMED:   'badge-confirmed',
  IN_PROGRESS: 'badge-confirmed',
  COMPLETED:   'badge-completed',
  CANCELLED:   'badge-cancelled',
};
const ROLE_TRANSITIONS = {
  CUSTOMER:      { PENDING: ['CANCELLED'] },
  BUSINESS_OWNER:{ PENDING: ['CONFIRMED','CANCELLED'], CONFIRMED: ['IN_PROGRESS','CANCELLED'], IN_PROGRESS: ['COMPLETED','CANCELLED'] },
  ADMIN:         { PENDING: ['CONFIRMED','CANCELLED'], CONFIRMED: ['IN_PROGRESS','CANCELLED'], IN_PROGRESS: ['COMPLETED','CANCELLED'] },
};

/* ─── Service icons map ──────────────────────────────────── */
const SERVICE_ICONS = {
  'Full Service':    <Droplets size={28} />,
  'Exterior Carwash': <Car size={28} />,
  'Interior Clean':  <Wrench size={28} />,
  default:           <Wrench size={28} />,
};
function getServiceIcon(name = '') {
  for (const [k, v] of Object.entries(SERVICE_ICONS)) {
    if (k !== 'default' && name.toLowerCase().includes(k.toLowerCase().split(' ')[0])) return v;
  }
  return SERVICE_ICONS.default;
}

/* ─── Wash type options ──────────────────────────────────── */
const WASH_TYPES = [
  {
    value: 'ON_GARAGE',
    label: 'On Garage',
    altLabel: 'On station',
    desc: 'The customer drives their car to a fixed-location car wash station.',
    icon: '🏢',
  },
  {
    value: 'MOBILE',
    label: 'Your home/Office',
    altLabel: 'Mobile',
    desc: 'The service provider comes to the customer\'s location (home, office, or parking area).',
    icon: '🏠',
  },
];

/* ─── History timeline ───────────────────────────────────── */
function HistoryTimeline({ history }) {
  if (!history?.length) return <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>No history.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {history.map((entry, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
            {i < history.length - 1 && <div style={{ width: 2, flex: 1, background: 'var(--border)', minHeight: 20 }} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {entry.fromStatus && <span className={`badge ${STATUS_BADGE[entry.fromStatus] || 'badge-pending'}`} style={{ fontSize: 10 }}>{entry.fromStatus}</span>}
              {entry.fromStatus && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>}
              <span className={`badge ${STATUS_BADGE[entry.toStatus] || 'badge-pending'}`} style={{ fontSize: 10 }}>{entry.toStatus}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 'auto' }}>
                {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '--'}
              </span>
            </div>
            {entry.reason && <p style={{ color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic', marginTop: 2 }}>Reason: {entry.reason}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Booking details panel ──────────────────────────────── */
function BookingDetails({ booking, onClose }) {
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setHistoryLoading(true);
      try {
        const res = await api.bookings.getHistory(booking.id);
        setHistory(res?.data || res || []);
      } catch (_) { setHistory([]); }
      finally { setHistoryLoading(false); }
    })();
  }, [booking.id]);

  return (
    <div className="card" style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Booking Details</h3>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
      </div>
      <div className="grid-2" style={{ gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Type',     val: booking.bookingType === 'INSTANT' ? 'Instant Wash' : 'Scheduled Appointment' },
          { label: 'Date',     val: booking.bookingType === 'SCHEDULED' ? new Date(booking.date).toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' }) : null },
          { label: 'Time',     val: booking.bookingType === 'INSTANT' ? 'Immediate' : `${toAmPm(booking.startTime)} – ${toAmPm(booking.endTime)}` },
          { label: 'Status',   val: <span className={`badge ${STATUS_BADGE[booking.status] || 'badge-pending'}`}>{booking.status}</span> },
          { label: 'Service',  val: booking.serviceName },
          { label: 'Vehicle',  val: booking.vehicle },
          { label: 'Business', val: booking.businessName },
        ].filter(r => r.val).map((r, i) => (
          <div key={i}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>{r.label}</span>
            <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{r.val}</span>
          </div>
        ))}
      </div>
      {booking.notes && (
        <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
          📝 {booking.notes}
        </div>
      )}
      <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <History size={14} style={{ color: 'var(--primary)' }} /> History
      </h4>
      {historyLoading ? <div className="skeleton" style={{ height: 60, borderRadius: 8 }} /> : <HistoryTimeline history={history} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   COMPANY DETAIL VIEW (matches screenshot 1)
══════════════════════════════════════════════════════════ */
function CompanyDetailView({ business, services, onClose, onBook, user, showToast, customerName, customerPhone }) {
  const [bookingType, setBookingType] = useState('SCHEDULED');
  const [selectedService, setSelectedService] = useState(services[0]?.id || '');
  const [washType, setWashType] = useState('ON_GARAGE');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [queueCount] = useState(Math.floor(Math.random() * 8) + 1); // mock queue

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    if (!business?.id) return;
    const fetchReviews = async () => {
      setReviewsLoading(true);
      try {
        const res = await api.bookings.listBusinessReviews(business.id);
        setReviews(Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      } catch (_) {
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    };
    fetchReviews();
  }, [business?.id]);

  /* Load slots when date or business changes */
  useEffect(() => {
    if (!business?.id) return;
    const load = async () => {
      setSlotsLoading(true);
      try {
        const res = await api.slots.getAvailableSlots(business.id, date, date);
        setAvailableSlots(res?.data || res || []);
        setSelectedSlot(null);
      } catch (_) { setAvailableSlots([]); }
      finally { setSlotsLoading(false); }
    };
    load();
  }, [business?.id, date]);

  /* Generate next 3 days for quick date selection */
  const nextDays = Array.from({ length: 3 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d;
  });

  const handleBookNow = () => {
    if (!selectedService) { showToast('Select a service', 'error'); return; }
    if (bookingType === 'SCHEDULED' && !selectedSlot) { showToast('Select a time slot', 'error'); return; }
    setShowServiceModal(true);
  };

  if (showServiceModal) {
    return (
      <ServiceSelectionModal
        business={business}
        services={services}
        selectedService={selectedService}
        setSelectedService={setSelectedService}
        washType={washType}
        setWashType={setWashType}
        selectedSlot={selectedSlot}
        date={date}
        bookingType={bookingType}
        user={user}
        showToast={showToast}
        customerName={customerName}
        customerPhone={customerPhone}
        onBack={() => setShowServiceModal(false)}
        onConfirm={onBook}
      />
    );
  }

  return (
    <div className="slide-in">
      {/* Topbar */}
      <div className="topbar" style={{ position: 'static', marginBottom: 0 }}>
        <button className="topbar-back" onClick={onClose}><ArrowLeft size={16} /></button>
        <span className="topbar-title">{business.businessName}</span>
        {business.phone && (
          <a href={`tel:${business.phone}`} className="topbar-action">
            <Phone size={16} />
          </a>
        )}
        {!business.phone && <div style={{ width: 36 }} />}
      </div>

      <div style={{ padding: '16px 16px 100px' }}>
        {/* Booking type toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            className={`btn ${bookingType === 'INSTANT' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}
            onClick={() => setBookingType('INSTANT')}
          >
            <Zap size={15} /> Instant Wash
          </button>
          <button
            className={`btn ${bookingType === 'SCHEDULED' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}
            onClick={() => setBookingType('SCHEDULED')}
          >
            <Calendar size={15} /> Scheduled
          </button>
        </div>

        {/* Location & Queue */}
        <h2 className="section-title">Location &amp; Queue</h2>
        <div className="location-card" style={{ marginBottom: 20 }}>
          <div className="location-row">
            <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
            <span>{business.city || business.address || 'Location not set'} _ {(Math.random() * 4 + 0.5).toFixed(1)}km away</span>
          </div>
          <div className="location-row">
            <Car size={14} style={{ color: 'var(--primary)' }} />
            <span className="location-queue-count">{queueCount} Cars before you</span>
          </div>
        </div>

        {/* Services */}
        <h2 className="section-title">Services</h2>
        <div className="grid-2" style={{ gap: 10, marginBottom: 24 }}>
          {services.length === 0 ? (
            <div className="alert alert-info" style={{ gridColumn: 'span 2', fontSize: 13 }}>
              No services listed yet.
            </div>
          ) : services.map(svc => (
            <div
              key={svc.id}
              className={`service-card${selectedService === svc.id ? ' selected' : ''}`}
              onClick={() => setSelectedService(svc.id)}
            >
              <div className="service-radio">
                {selectedService === svc.id && <div className="service-radio-dot" />}
              </div>
              <div className="service-card-icon">{getServiceIcon(svc.name)}</div>
              <div className="service-card-label">{svc.name}</div>
              {svc.price && (
                <div style={{ fontSize: 10, color: selectedService === svc.id ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', fontWeight: 600 }}>
                  ETB {svc.price}
                </div>
              )}
            </div>
          ))}
        </div>

        {bookingType === 'SCHEDULED' && (
          <>
            {/* Booked Date */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 className="section-title" style={{ margin: 0 }}>Booked Date</h2>
            </div>

            {/* Quick date chips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {nextDays.map((d, i) => {
                const ds = d.toISOString().split('T')[0];
                const isSelected = date === ds;
                const label = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                const time = availableSlots[i]?.startTime || (isSelected && selectedSlot?.startTime) || '--:--';
                return (
                  <div
                    key={ds}
                    className={`date-slot-item${isSelected ? ' selected' : ''}`}
                    onClick={() => setDate(ds)}
                  >
                    <Calendar size={18} style={{ color: isSelected ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: isSelected ? 'var(--primary)' : 'var(--text-primary)', flex: 1 }}>
                      {label}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
                      {toAmPm(time)} {availableSlots[i]?.endTime ? `– ${toAmPm(availableSlots[i].endTime)}` : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Time slots */}
            {slotsLoading ? (
              <div className="grid-3" style={{ marginBottom: 20 }}>
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 44 }} />)}
              </div>
            ) : availableSlots.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Available slots</p>
                <div className="grid-3">
                  {availableSlots.slice(0, 9).map(s => (
                    <button
                      key={s.id}
                      className={`slot-btn${selectedSlot?.id === s.id ? ' selected' : ''}`}
                      onClick={() => setSelectedSlot(s)}
                    >
                      {toAmPm(s.startTime)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {bookingType === 'INSTANT' && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', marginBottom: 24 }}>
            <Zap size={32} style={{ color: 'var(--primary)', marginBottom: 8 }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Instant Wash</p>
            <p style={{ fontSize: 12 }}>Book immediately — no appointment needed. We'll serve you as soon as possible.</p>
          </div>
        )}

        {/* Customer Reviews Section */}
        <h2 className="section-title" style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Star size={16} style={{ color: 'var(--primary)' }} /> Customer Reviews ({reviews.length})
        </h2>
        {reviewsLoading ? (
          <div className="skeleton" style={{ height: 60, borderRadius: 12 }} />
        ) : reviews.length === 0 ? (
          <div style={{ padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
            No reviews yet for this provider.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reviews.map(rev => (
              <div key={rev.id} style={{ padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                    {rev.booking?.customerName || 'Anonymous'}
                  </span>
                  <div style={{ display: 'flex', gap: 1, color: '#f59e0b' }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star key={n} size={11} fill={n <= rev.rating ? '#f59e0b' : 'none'} style={{ opacity: n <= rev.rating ? 1 : 0.2 }} />
                    ))}
                  </div>
                </div>
                {rev.comment ? (
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>"{rev.comment}"</p>
                ) : (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No comment left.</p>
                )}
                <span style={{ fontSize: 9, color: 'var(--text-muted)', alignSelf: 'flex-end' }}>
                  {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Book button (fixed) */}
      <div className="sticky-action-bar">
        <button
          className="btn btn-primary btn-full"
          onClick={handleBookNow}
          disabled={!selectedService || (bookingType === 'SCHEDULED' && !selectedSlot)}
        >
          {bookingType === 'INSTANT' ? <Zap size={18} /> : <Calendar size={18} />}
          {bookingType === 'INSTANT' ? 'Book Instant Wash' : 'Book Service Now'}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SERVICE SELECTION MODAL (matches screenshot 2 & 3)
══════════════════════════════════════════════════════════ */
function ServiceSelectionModal({
  business, services, selectedService, setSelectedService,
  washType, setWashType, selectedSlot, date, bookingType, user,
  showToast, onBack, onConfirm, customerName, customerPhone,
}) {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.user.getVehicles();
        const list = res?.data || res || [];
        setVehicles(list);
        const def = list.find(v => v.isDefault) || list[0];
        if (def) setSelectedVehicle(def.id);
      } catch (_) {}
    })();
  }, []);

  const handleConfirm = async () => {
    if (!selectedVehicle) { showToast('Select a vehicle', 'error'); return; }
    setSubmitting(true);
    try {
      const svc = services.find(s => s.id === selectedService);
      const payload = {
        businessId: business.id,
        serviceId: selectedService,
        vehicleId: selectedVehicle,
        bookingType,
        washType,
        notes,
        totalAmount: svc?.price ? parseFloat(svc.price) : undefined,
        customerName: customerName?.trim() || undefined,
        customerPhone: customerPhone?.trim() || undefined,
      };
      if (bookingType === 'SCHEDULED') {
        payload.date = date;
        payload.startTime = selectedSlot?.startTime;
        payload.endTime = selectedSlot?.endTime;
        payload.slotIds = selectedSlot ? [selectedSlot.id] : [];
      }
      await api.bookings.create(payload);
      showToast('Booking confirmed!', 'success');
      onConfirm();
    } catch (err) {
      showToast(err.message || 'Booking failed', 'error');
    } finally { setSubmitting(false); }
  };

  const svc = services.find(s => s.id === selectedService);

  return (
    <div className="slide-in">
      {/* Topbar */}
      <div className="topbar" style={{ position: 'static', marginBottom: 0 }}>
        <button className="topbar-back" onClick={onBack}><ArrowLeft size={16} /></button>
        <span className="topbar-title">Select Service</span>
        <div style={{ width: 36 }} />
      </div>

      <div style={{ padding: '16px 16px 120px' }}>
        {/* Selected service summary */}
        {svc && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border)', marginBottom: 20 }}>
            <div style={{ padding: 8, borderRadius: 10, background: 'var(--primary-bg)', color: 'var(--primary)', display: 'flex' }}>
              {getServiceIcon(svc.name)}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{svc.name}</p>
              {svc.price && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>ETB {svc.price}</p>}
            </div>
          </div>
        )}

        {/* Car Wash Type */}
        <h2 className="section-title">Car Wash type</h2>

        {/* Illustration */}
        <div style={{
          width: '100%', height: 140, borderRadius: 16, marginBottom: 16,
          background: washType === 'MOBILE'
            ? 'linear-gradient(135deg, #E8F4FE 0%, #BFDBFE 100%)'
            : 'linear-gradient(135deg, #F0FFF4 0%, #BBF7D0 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 64,
          border: '1px solid var(--border)',
        }}>
          {washType === 'MOBILE' ? '🔧🚗' : '🏪🚗'}
        </div>

        {/* Wash type options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
          {WASH_TYPES.map(wt => (
            <div key={wt.value}>
              <div className="wash-type-option" onClick={() => setWashType(wt.value)}>
                <div className={`wash-type-radio${washType === wt.value ? ' selected' : ''}`}>
                  {washType === wt.value && <div className="wash-type-radio-inner" />}
                </div>
                <span className="wash-type-label">{wt.label}</span>
              </div>
              {washType === wt.value && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, marginLeft: 30, lineHeight: 1.5 }}>
                  {wt.desc}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Vehicle selector */}
        {vehicles.length > 0 && (
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Your Vehicle</label>
            <select
              className="form-input"
              value={selectedVehicle}
              onChange={e => setSelectedVehicle(e.target.value)}
              style={{ appearance: 'none' }}
            >
              <option value="">Select vehicle</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.make} {v.model} ({v.plateNumber})</option>
              ))}
            </select>
          </div>
        )}

        {vehicles.length === 0 && (
          <div className="alert alert-warning" style={{ marginBottom: 14, fontSize: 13 }}>
            No vehicles found. Add a vehicle in your Account first.
          </div>
        )}

        {/* Notes */}
        <div className="form-group">
          <label className="form-label">Notes <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
          <textarea
            className="form-input"
            placeholder="e.g. muddy wheels, interior cleaning..."
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ resize: 'none' }}
          />
        </div>
      </div>

      {/* Confirm button */}
      <div className="sticky-action-bar">
        {svc && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
            <span>{svc.name} · {bookingType === 'INSTANT' ? 'Instant Wash' : date}</span>
            {svc.price && <span style={{ fontWeight: 700, color: 'var(--primary)' }}>ETB {svc.price}</span>}
          </div>
        )}
        <button
          className="btn btn-primary btn-full"
          onClick={handleConfirm}
          disabled={submitting || !selectedVehicle || !selectedService}
        >
          {submitting ? 'Booking...' : 'Confirm Booking'}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   REVIEW MODAL
══════════════════════════════════════════════════════════ */
function ReviewModal({ booking, onClose }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating < 1) return;
    setSubmitting(true);
    try {
      await api.bookings.createReview(booking.id, { rating, comment: comment.trim() });
      onClose(true);
    } catch (err) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => {}}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, textAlign: 'center' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Rate your experience</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          {booking.serviceName || 'Car Wash Service'}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
          {[1,2,3,4,5].map(n => (
            <button
              key={n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                color: n <= (hover || rating) ? '#f59e0b' : 'var(--border)',
                transition: 'color 0.15s',
              }}
            >
              <Star size={32} fill={n <= (hover || rating) ? '#f59e0b' : 'none'} />
            </button>
          ))}
        </div>

        <textarea
          className="form-input"
          rows={3}
          placeholder="Share your feedback (optional)"
          value={comment}
          onChange={e => setComment(e.target.value)}
          style={{ resize: 'none', marginBottom: 16, textAlign: 'left' }}
        />

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-full" onClick={() => onClose(false)} disabled={submitting}>Skip</button>
          <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={submitting || rating < 1}>
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   CANCELLATION REASON MODAL
══════════════════════════════════════════════════════════ */
function CancelModal({ onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Cancel Booking</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Please provide a reason for cancellation (optional).</p>
        <textarea
          className="form-input"
          rows={3}
          placeholder="e.g. Schedule changed..."
          value={reason}
          onChange={e => setReason(e.target.value)}
          style={{ resize: 'none', marginBottom: 16 }}
          autoFocus
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-full" onClick={onClose}>Back</button>
          <button className="btn btn-danger btn-full" onClick={() => onConfirm(reason || 'Cancelled')}>
            <XCircle size={14} /> Confirm Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   RESCHEDULE MODAL
══════════════════════════════════════════════════════════ */
function RescheduleModal({ booking, onReschedule, onClose, showToast }) {
  const [step, setStep] = useState('prompt'); // 'prompt' | 'schedule' | 'confirming'
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    if (step !== 'schedule' || !booking?.businessId) return;
    const load = async () => {
      setSlotsLoading(true);
      try {
        const res = await api.slots.getAvailableSlots(booking.businessId, date, date);
        setAvailableSlots(res?.data || res || []);
        setSelectedSlot(null);
      } catch (_) { setAvailableSlots([]); }
      finally { setSlotsLoading(false); }
    };
    load();
  }, [booking?.businessId, date, step]);

  const handleConfirmReschedule = () => {
    if (!selectedSlot) { showToast('Select a time slot', 'error'); return; }
    onReschedule({
      date,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      slotIds: [selectedSlot.id]
    });
  };

  if (step === 'prompt') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <RotateCcw size={24} style={{ color: 'var(--primary)' }} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Booking Cancelled</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
            Your booking has been cancelled. Would you like to reschedule for a different date and time?
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost btn-full" onClick={onClose}>No, thanks</button>
            <button className="btn btn-primary btn-full" onClick={() => setStep('schedule')}>
              <RotateCcw size={14} /> Reschedule
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Reschedule Booking</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="form-group">
          <label className="form-label">New Date</label>
          <input
            className="form-input"
            type="date"
            value={date}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        {slotsLoading ? (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 44, flex: 1 }} />)}
          </div>
        ) : availableSlots.length > 0 ? (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Available slots</p>
            <div className="grid-3">
              {availableSlots.slice(0, 9).map(s => (
                <button
                  key={s.id}
                  className={`slot-btn${selectedSlot?.id === s.id ? ' selected' : ''}`}
                  onClick={() => setSelectedSlot(s)}
                >
                  {toAmPm(s.startTime)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="alert alert-info" style={{ marginBottom: 16, fontSize: 13 }}>
            No available slots for this date. Try another date.
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-full" onClick={() => setStep('prompt')}>Back</button>
          <button
            className="btn btn-primary btn-full"
            onClick={handleConfirmReschedule}
            disabled={!selectedSlot}
          >
            <RotateCcw size={14} /> Confirm Reschedule
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   BOOKINGS LIST
══════════════════════════════════════════════════════════ */
export default function Bookings({ user, showToast }) {
  const [bookings, setBookings]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [myBusiness, setMyBusiness]   = useState(null);
  const [expandedId, setExpandedId]   = useState(null);
  const [view, setView]               = useState('list');  // 'list' | 'company' | 'create'
  const [businesses, setBusinesses]   = useState([]);
  const [bizLoading, setBizLoading]   = useState(false);
  const [selectedBiz, setSelectedBiz] = useState(null);
  const [bizServices, setBizServices] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelledBooking, setCancelledBooking] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);
  const promptedReviewsRef = useRef(new Set());

  const dispatch = useDispatch();
  const selectedBusiness = useSelector(selectSelectedBusiness);

  /* fetch business (for BUSINESS_OWNER) */
  const fetchMyBusiness = useCallback(async () => {
    try {
      const res = await api.user.getMyBusiness();
      setMyBusiness(res?.data || res || null);
      return res?.data || res || null;
    } catch (_) { return null; }
  }, []);

  /* fetch bookings list */
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      let params = {};
      if (user.role === 'CUSTOMER')       params = { customerId: user.id };
      if (user.role === 'BUSINESS_OWNER') {
        const biz = myBusiness || await fetchMyBusiness();
        if (biz?.id) params = { businessId: biz.id };
      }
      const res = await api.bookings.list(params);
      setBookings(res?.data || res || []);
    } catch (err) {
      showToast(err.message || 'Failed to load bookings', 'error');
    } finally { setLoading(false); }
  }, [user, myBusiness, fetchMyBusiness, showToast]);

  useEffect(() => {
    if (user.role === 'BUSINESS_OWNER') fetchMyBusiness();
  }, [user.id]);
  useEffect(() => { fetchBookings(); }, [user.id]);

  useEffect(() => {
    if (user.role === 'CUSTOMER' && bookings.length > 0) {
      const skipped = JSON.parse(localStorage.getItem('skipped_reviews') || '[]');
      const toReview = bookings.find(b => 
        b.status === 'COMPLETED' && 
        !b.review && 
        !skipped.includes(b.id) &&
        !promptedReviewsRef.current.has(b.id)
      );
      if (toReview) {
        promptedReviewsRef.current.add(toReview.id);
        setReviewBooking(toReview);
      }
    }
  }, [bookings, user.role]);

  /* load businesses for new booking */
  const openNewBooking = async () => {
    setBizLoading(true);
    setView('create');
    try {
      const res = await api.business.listPublic({ approved: true });
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setBusinesses(list);
    } catch (_) { setBusinesses([]); }
    finally { setBizLoading(false); }
  };

  /* open company detail */
  const openCompany = useCallback(async biz => {
    setSelectedBiz(biz);
    try {
      const res = await api.business.listServices(biz.id);
      setBizServices(Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
    } catch (_) { setBizServices([]); }
    setView('company');
  }, []);

  useEffect(() => {
    if (selectedBusiness) {
      openCompany(selectedBusiness);
      dispatch(setSelectedBusiness(null));
    }
  }, [selectedBusiness, openCompany, dispatch]);

  /* status change */
  const handleStatusChange = async (bookingId, status) => {
    if (status === 'CANCELLED') {
      setCancelTarget(bookingId); // open modal
      return;
    }
    try {
      await api.bookings.changeStatus(bookingId, status, '');
      showToast(`Booking ${status.toLowerCase()} successfully`, 'success');
      fetchBookings();
    } catch (err) {
      showToast(err.message || 'Status update failed', 'error');
    }
  };

  const handleCancelConfirm = async (reason) => {
    if (!cancelTarget) return;
    try {
      if (user.role === 'CUSTOMER') {
        const res = await api.bookings.cancel(cancelTarget, reason);
        const booking = res?.data || res || {};
        setCancelledBooking(booking);
      } else {
        await api.bookings.changeStatus(cancelTarget, 'CANCELLED', reason);
      }
      showToast('Booking cancelled', 'success');
      fetchBookings();
    } catch (err) {
      showToast(err.message || 'Cancellation failed', 'error');
    } finally {
      setCancelTarget(null);
    }
  };

  const handleReschedule = async (bookingId, data) => {
    try {
      await api.bookings.reschedule(bookingId, data);
      showToast('Booking rescheduled successfully', 'success');
      setCancelledBooking(null);
      fetchBookings();
    } catch (err) {
      showToast(err.message || 'Reschedule failed', 'error');
    }
  };

  const canTransition = b => (ROLE_TRANSITIONS[user.role] || {})[b.status] || [];

  /* ── COMPANY DETAIL VIEW ── */
  if (view === 'company' && selectedBiz) {
    return (
      <CompanyDetailView
        business={selectedBiz}
        services={bizServices}
        user={user}
        showToast={showToast}
        customerName={customerName}
        customerPhone={customerPhone}
        onClose={() => { setView('create'); setSelectedBiz(null); }}
        onBook={() => { setView('list'); setSelectedBiz(null); fetchBookings(); }}
      />
    );
  }

  /* ── BUSINESS SELECTOR (new booking) ── */
  if (view === 'create') {
    return (
      <div className="slide-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button className="topbar-back" onClick={() => setView('list')}><ArrowLeft size={16} /></button>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Select Provider</h1>
        </div>

        {/* Business owner: enter customer ID first */}
        {user.role !== 'CUSTOMER' && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="form-label">Customer Name <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(for walk-in)</span></label>
              <input className="form-input" placeholder="e.g. John" value={customerName} onChange={e => setCustomerName(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="form-label">Phone <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <input className="form-input" placeholder="e.g. 0911223344" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
            </div>
          </div>
        )}

        {bizLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16 }} />)}
          </div>
        ) : businesses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
            <Building2 size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p>No businesses available</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {businesses.map(b => (
              <div key={b.id} className="card" onClick={() => openCompany(b)} style={{ cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                  <Building2 size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 3 }}>{b.businessName}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={11} /> {b.city || b.address || 'Location N/A'}
                  </p>
                </div>
                <ChevronDown size={16} style={{ color: 'var(--text-muted)', transform: 'rotate(-90deg)' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── BOOKINGS LIST ── */
  return (
    <div className="slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Bookings</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {user.role === 'CUSTOMER' ? 'Your scheduled car wash appointments' : 'Manage client appointments'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={fetchBookings} style={{ padding: '8px 10px' }}>
            <RefreshCw size={15} />
          </button>
          <button className="btn btn-primary btn-sm" onClick={openNewBooking}>
            <Plus size={15} /> New
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 16 }} />)}
        </div>
      ) : bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
          <Calendar size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600 }}>No bookings yet</p>
          <p style={{ fontSize: 13, marginTop: 4, marginBottom: 20 }}>
            {user.role === 'CUSTOMER' ? 'Book your first car wash' : 'No bookings for your business yet.'}
          </p>
          {user.role === 'CUSTOMER' && (
            <button className="btn btn-primary" onClick={openNewBooking}>
              <Calendar size={16} /> Book a Car Wash
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bookings.map(b => {
            const transitions = canTransition(b);
            const isExpanded = expandedId === b.id;
            return (
              <div key={b.id}>
                <div className="card" onClick={() => setExpandedId(isExpanded ? null : b.id)} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1 }}>
                      <div style={{ padding: 10, borderRadius: 12, background: 'var(--primary-bg)', color: 'var(--primary)', flexShrink: 0 }}>
                        <Calendar size={20} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                            {new Date(b.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span className={`badge ${STATUS_BADGE[b.status] || 'badge-pending'}`}>{b.status}</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Clock size={12} /> {b.bookingType === 'INSTANT' ? 'Immediate' : `${toAmPm(b.startTime)} – ${toAmPm(b.endTime)}`}
                          </span>
                          {b.serviceName && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Wrench size={12} /> {b.serviceName}</span>}
                          {b.businessName && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Building2 size={12} /> {b.businessName}</span>}
                          {b.vehicle && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Car size={12} /> {b.vehicle}</span>}
                          {b.customerName && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><User size={12} /> {b.customerName}{b.customerPhone ? ` (${b.customerPhone})` : ''}</span>}
                        </div>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                  </div>
                </div>

                {isExpanded && <BookingDetails booking={b} onClose={() => setExpandedId(null)} />}

                {transitions.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, padding: '8px 0 4px', flexWrap: 'wrap' }}>
                    {transitions.includes('CONFIRMED')   && <button className="btn btn-primary btn-sm"  onClick={() => handleStatusChange(b.id,'CONFIRMED')}><Check size={13}/> Confirm</button>}
                    {transitions.includes('IN_PROGRESS') && <button className="btn btn-sm" style={{ background:'var(--info)', color:'#fff' }} onClick={() => handleStatusChange(b.id,'IN_PROGRESS')}><Play size={13}/> Start</button>}
                    {transitions.includes('COMPLETED')   && <button className="btn btn-success btn-sm"  onClick={() => handleStatusChange(b.id,'COMPLETED')}><Star size={13}/> Complete</button>}
                    {transitions.includes('CANCELLED')   && <button className="btn btn-danger btn-sm"   onClick={() => handleStatusChange(b.id,'CANCELLED')}><XCircle size={13}/> Cancel</button>}
                  </div>
                )}

                {b.status === 'COMPLETED' && (
                  <div style={{ display: 'flex', gap: 8, padding: '8px 0 4px', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary btn-sm" onClick={async () => {
                      const amt = parseFloat(b.totalAmount) || 0;
                      if (amt < 1) { showToast('Invalid payment amount', 'error'); return; }
                      try {
                        const res = await api.payments.initiate(
                          amt,
                          localStorage.getItem('phone'),
                          b.businessId,
                          b.id,
                          b.serviceName || 'Car Wash Service'
                        );
                        showToast(`Demo Telebirr checkout ready · ${res.data?.outTradeNo}`, 'success');
                      } catch (err) {
                        showToast(err.message || 'Demo payment could not be started', 'error');
                      }
                    }}>
                      <CreditCard size={13}/> Telebirr
                    </button>
                    <button className="btn btn-success btn-sm" onClick={async () => {
                      const amt = parseFloat(b.totalAmount) || 0;
                      if (amt < 1) { showToast('Invalid payment amount', 'error'); return; }
                      try {
                        await api.payments.recordCash(
                          amt,
                          localStorage.getItem('userId'),
                          b.id,
                          b.serviceName || 'Car Wash Service'
                        );
                        showToast('Cash payment recorded in the demo', 'success');
                      } catch (err) { showToast(err.message, 'error'); }
                    }}>
                      Pay with Cash
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {reviewBooking && (
        <ReviewModal
          booking={reviewBooking}
          onClose={submitted => {
            if (!submitted) {
              const skipped = JSON.parse(localStorage.getItem('skipped_reviews') || '[]');
              if (!skipped.includes(reviewBooking.id)) {
                skipped.push(reviewBooking.id);
                localStorage.setItem('skipped_reviews', JSON.stringify(skipped));
              }
            }
            setReviewBooking(null);
            fetchBookings();
          }}
        />
      )}
      {cancelTarget && <CancelModal onConfirm={handleCancelConfirm} onClose={() => setCancelTarget(null)} />}
      {cancelledBooking && (
        <RescheduleModal
          booking={cancelledBooking}
          onReschedule={(data) => handleReschedule(cancelledBooking.id, data)}
          onClose={() => setCancelledBooking(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
}
