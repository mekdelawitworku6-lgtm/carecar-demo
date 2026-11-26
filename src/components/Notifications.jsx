import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { api } from '../services/api';
import { setUnreadCount } from '../store/uiSlice';
import { Bell, RefreshCw, Clock, X, Check, CheckCheck } from 'lucide-react';

/* ─── helpers ────────────────────────────────────────────── */
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now  = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 3600)  return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}day`;
  return `${Math.floor(diff / 604800)}week`;
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr);
  const t = new Date();
  const isSame = (unit) => {
    if (unit === 'date') return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
    if (unit === 'yesterday') {
      const y = new Date(t); y.setDate(y.getDate() - 1);
      return d.getDate() === y.getDate() && d.getMonth() === y.getMonth() && d.getFullYear() === y.getFullYear();
    }
    return false;
  };
  if (isSame('date')) return 'Today';
  if (isSame('yesterday')) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

/* ─── Notification Detail Modal ─────────────────────────── */
function NotifModal({ notif, onClose }) {
  if (!notif) return null;
  const isUnread = !notif.isRead;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h3 style={{
              fontSize: 15, fontWeight: 700,
              color: isUnread ? 'var(--primary)' : 'var(--text-secondary)',
              marginBottom: 2,
            }}>
              {notif.type?.replace(/_/g, ' ') || 'Notification'}
            </h3>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(notif.createdAt)}</span>
          </div>
        </div>

        {/* Body */}
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
          {notif.body || notif.message || 'No details available.'}
        </p>

        {notif.error && (
          <div className="alert alert-danger" style={{ marginBottom: 16, fontSize: 12 }}>
            Error: {notif.error}
          </div>
        )}

        <button
          className="btn btn-secondary btn-full"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}

/* ─── Single Notification Card ───────────────────────────── */
function NotifCard({ notif, onClick }) {
  const isUnread = !notif.isRead;
  const title = notif.type?.replace(/_/g, ' ') || 'Notification';
  return (
    <div
      className={`notif-card${isUnread ? ' unread' : ''}`}
      onClick={() => onClick(notif)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <h4 className={`notif-title${isUnread ? '' : ' read'}`}>
          {isUnread ? title : title}
        </h4>
        <span className="notif-time">{timeAgo(notif.createdAt)}</span>
      </div>
      <p className="notif-body">
        {notif.body || notif.message || 'Your request has been accepted and your car is in line for service. We\'ll start as soon as possible.'}
      </p>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function Notifications({ showToast }) {
  const [logs, setLogs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const dispatch = useDispatch();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.notifications.getLogs();
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setLogs(list);
    } catch (err) {
      showToast(err.message || 'Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const markAllRead = useCallback(async () => {
    setLogs(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await api.notifications.markAllRead?.();
    } catch (_) { /* silently ignore */ }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    dispatch(setUnreadCount(logs.filter(n => !n.isRead).length));
  }, [logs, dispatch]);

  const unreadCount = logs.filter(n => !n.isRead).length;

  /* Group by date label */
  const grouped = logs.reduce((acc, n) => {
    const label = formatDateLabel(n.createdAt);
    if (!acc[label]) acc[label] = [];
    acc[label].push(n);
    return acc;
  }, {});
  const groupKeys = Object.keys(grouped);

  return (
    <>
      {/* Page header */}
      <div className="section-header" style={{ marginBottom: 20 }}>
        <h1 className="page-hero-title" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          Notifications
          {unreadCount > 0 && (
            <span style={{
              background: 'var(--primary)', color: '#fff',
              borderRadius: '50%', width: 22, height: 22,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>
              {unreadCount}
            </span>
          )}
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {unreadCount > 0 && (
            <button
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={markAllRead}
            >
              <CheckCheck size={14} /> Mark all as read
            </button>
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={fetchLogs}
            disabled={loading}
            style={{ padding: '6px 12px', gap: 6 }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 16 }} />)}
        </div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
          <Bell size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600 }}>No notifications</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>You're all caught up!</p>
        </div>
      ) : (
        <div>
          {groupKeys.map(label => (
            <div key={label} style={{ marginBottom: 24 }}>
              <p className="notif-section-header" style={{ margin: '0 0 10px' }}>{label}</p>
              <div className="notif-list-desktop">
                {grouped[label].map(n => (
                  <NotifCard key={n.id} notif={n} onClick={setSelected} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <NotifModal
          notif={selected}
          onClose={() => {
            /* mark as read locally + persist */
            const id = selected.id;
            setLogs(prev => prev.map(n =>
              n.id === id
                ? { ...n, isRead: true }
                : n
            ));
            setSelected(null);
            api.notifications.markRead?.(id).catch(() => {});
          }}
        />
      )}
    </>
  );
}
