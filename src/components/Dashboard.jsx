import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import {
  Calendar, Car, Bell, ShieldAlert, CheckCircle, Clock,
  Users, DollarSign, Building2, UserPlus, MapPin, Phone,
  Star, Search, RefreshCw, ChevronRight, X, AlertCircle, Navigation, Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { requestAndRegisterFcmToken } from '../firebase';
import { setAdminSubTab } from '../store/uiSlice';
import { extractCoordinatesFromMapsLink } from '../utils/validation';

export const getBizCoords = (biz) => {
  if (!biz) return null;
  let lat = biz.latitude != null ? Number(biz.latitude) : null;
  let lng = biz.longitude != null ? Number(biz.longitude) : null;
  // If stored lat/lng are missing or zero, try to extract from maps link or address
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    const link = biz.googleMapsLink || biz.address || '';
    const coords = extractCoordinatesFromMapsLink(link);
    if (coords) {
      lat = coords.latitude;
      lng = coords.longitude;
    }
  }
  if (lat == null || isNaN(lat) || lng == null || isNaN(lng) || (lat === 0 && lng === 0)) return null;
  return { lat, lng };
};

/* ─── Stat card ───────────────────────────────────────────── */
function StatCard({ title, value, icon, loading, onClick, urgent, subtitle, gradient }) {
  return (
    <div
      className="card stat-pod"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', position: 'relative' }}
    >
      {urgent > 0 && (
        <span style={{
          position: 'absolute', top: 12, right: 12,
          background: 'var(--danger)', color: '#fff',
          fontSize: 10, fontWeight: 800, padding: '3px 8px',
          borderRadius: 99, boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
        }}>
          {urgent} Required
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div className="stat-pod-icon" style={{ background: gradient || 'var(--primary)', color: '#fff', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)' }}>
          {icon}
        </div>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {title}
          </span>
          {loading ? (
            <div className="skeleton" style={{ width: 50, height: 26, marginTop: 4 }} />
          ) : (
            <h3 className="stat-value" style={{ margin: '2px 0 0', fontSize: '1.75rem' }}>
              {value !== null && value !== undefined ? value : '0'}
            </h3>
          )}
          {subtitle && (
            <span style={{ fontSize: 11.5, color: 'var(--text-link)', fontWeight: 600 }}>
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Company card (customer home) ────────────────────────── */
function CompanyCard({ biz, onSelect, onBook, userLocation, haversineDistance }) {
  const [imgError, setImgError] = useState(false);
  const cover = (!imgError && biz.photos?.[0]) ? biz.photos[0] : null;

  const coords = getBizCoords(biz);
  let distanceKm = null;
  if (userLocation && coords && haversineDistance) {
    distanceKm = haversineDistance(
      userLocation.lat,
      userLocation.lng,
      coords.lat,
      coords.lng
    ).toFixed(1);
  }

  const queueCount = biz.queueCount != null ? biz.queueCount : 0;
  const queueLabel = queueCount === 0 ? '🟢 Ready Now' : `🚗 ${queueCount} in queue`;
  const queueBg = queueCount === 0 ? 'rgba(16, 185, 129, 0.92)' : queueCount <= 2 ? 'rgba(59, 130, 246, 0.92)' : 'rgba(245, 158, 11, 0.92)';

  return (
    <div className="company-card" onClick={() => onSelect(biz)}>
      <div className="company-card-img-wrap">
        {cover ? (
          <img src={cover} alt={biz.businessName} className="company-card-img" onError={() => setImgError(true)} />
        ) : (
          <div className="company-card-img img-placeholder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EEF2FF' }}>
            <Car size={42} style={{ color: 'var(--primary)', opacity: 0.6 }} />
          </div>
        )}
        {distanceKm != null && (
          <div className="company-card-badge-left">
            <MapPin size={11} /> {distanceKm} km
          </div>
        )}
        <div className="company-card-badge-right" style={{ background: queueBg }}>
          {queueLabel}
        </div>
      </div>

      <div className="company-card-body">
        <div className="company-card-name">
          <span>{biz.businessName}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>
            <Star size={13} fill="#f59e0b" color="#f59e0b" /> 4.9
          </span>
        </div>
        <div className="company-card-meta">
          <MapPin size={13} style={{ flexShrink: 0, color: 'var(--primary)' }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {biz.city || biz.address || 'Station Location'}
          </span>
        </div>
        {biz.phone && (
          <div className="company-card-meta">
            <Phone size={13} style={{ flexShrink: 0, color: 'var(--primary)' }} />
            <span>{biz.phone}</span>
          </div>
        )}

        <div className="company-card-actions" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            className="btn btn-primary btn-sm btn-full"
            onClick={() => onBook(biz)}
            style={{ fontSize: 12, padding: '8px 12px' }}
          >
            ⚡ Book Bay
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm btn-full"
            onClick={() => onSelect(biz)}
            style={{ fontSize: 12, padding: '8px 12px' }}
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Interactive Map Component ───────────────────────────── */
function NearbyMap({ businesses, userLocation, onSelectBusiness }) {
  const containerRef = useRef(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let mapInstance = null;
    const el = containerRef.current;
    if (!el) return;

    (async () => {
      try {
        const L = await import('leaflet');
        if (cancelled || !el.isConnected) return;
        mapInstance = L.map(el).setView([userLocation.lat, userLocation.lng], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://openstreetmap.org/copyright">OSM</a>',
          maxZoom: 19,
        }).addTo(mapInstance);

        // 1.5 km radius circle visualization
        L.circle([userLocation.lat, userLocation.lng], {
          radius: 1500,
          color: '#4F46E5',
          fillColor: '#6366F1',
          fillOpacity: 0.12,
          weight: 2,
          dashArray: '5, 8',
        }).addTo(mapInstance);

        // User location marker
        const userIcon = L.divIcon({
          className: '',
          html: '<div style="width:18px;height:18px;background:#4F46E5;border:3px solid #fff;border-radius:50%;box-shadow:0 0 12px rgba(79,70,229,0.7);"></div>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
          .addTo(mapInstance)
          .bindPopup('<strong>📍 Your Location</strong><br/>Scanning 1.5 km radius');

        const markers = [];
        businesses.forEach(biz => {
          const coords = getBizCoords(biz);
          if (!coords) return;
          const lat = coords.lat;
          const lng = coords.lng;
          const stationIcon = L.divIcon({
            className: '',
            html: '<div style="width:28px;height:28px;background:#10B981;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;box-shadow:0 3px 10px rgba(0,0,0,0.3);">🚗</div>',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          const marker = L.marker([lat, lng], { icon: stationIcon }).addTo(mapInstance);
          const name = biz.businessName || biz.name || 'Station';
          const queue = biz.queueCount != null ? `<br/><span style="color:#2563EB;">🚗 ${biz.queueCount} in queue</span>` : '';
          marker.bindPopup(`<strong>${name}</strong>${biz.city ? '<br/>' + biz.city : ''}${queue}`);
          marker.on('click', () => { if (onSelectBusiness) onSelectBusiness(biz); });
          markers.push(marker);
        });

        if (markers.length > 0) {
          const group = L.featureGroup([...markers, L.marker([userLocation.lat, userLocation.lng])]);
          mapInstance.fitBounds(group.getBounds().pad(0.15));
        }
        mapInstance.whenReady(() => mapInstance.invalidateSize());
      } catch (err) {
        console.error('[NearbyMap]', err);
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
      if (mapInstance) mapInstance.remove();
    };
  }, [businesses, userLocation]);

  if (loadError) {
    return (
      <div style={{ height: 320, borderRadius: 16, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg-surface)' }}>
        Map unavailable
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ height: 320, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }} />
  );
}

/* ─── Customer Dashboard ──────────────────────────────────── */
function CustomerDashboard({ user, setActiveTab, setSelectedBusiness, showToast }) {
  const [businesses, setBusinesses] = useState([]);
  const [bizLoading, setBizLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ bookings: null, vehicles: null, notifications: null });
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeProfileBusiness, setActiveProfileBusiness] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyResults, setNearbyResults] = useState([]);
  const [locating, setLocating] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'nearby' | 'low_queue'

  const haversineDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation not supported by your browser', 'error');
      return;
    }
    setLocating(true);
    setNearbyResults([]);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        const radiusKm = 1.5;
        const nearby = businesses.filter(b => {
          const coords = getBizCoords(b);
          if (!coords) return false;
          const dist = haversineDistance(latitude, longitude, coords.lat, coords.lng);
          return dist <= radiusKm;
        }).sort((a, b) => {
          const cA = getBizCoords(a);
          const cB = getBizCoords(b);
          const dA = cA ? haversineDistance(latitude, longitude, cA.lat, cA.lng) : 9999;
          const dB = cB ? haversineDistance(latitude, longitude, cB.lat, cB.lng) : 9999;
          return dA - dB;
        });
        setNearbyResults(nearby);
        setActiveFilter('nearby');
        setLocating(false);
        if (nearby.length === 0) {
          showToast('No stations found within 1.5 km of your location', 'info');
        } else {
          showToast(`Found ${nearby.length} station${nearby.length > 1 ? 's' : ''} within 1.5 km!`, 'success');
        }
      },
      () => {
        showToast('Could not access your location. Please check browser permissions.', 'error');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  /* Load businesses */
  useEffect(() => {
    const load = async () => {
      setBizLoading(true);
      try {
        const res = await api.business.listPublic({ approved: true, limit: 30 });
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setBusinesses(list);
      } catch (_) {}
      finally { setBizLoading(false); }
    };
    load();
  }, []);

  /* Load stats */
  useEffect(() => {
    const load = async () => {
      setStatsLoading(true);
      try {
        const [vRes, bRes, nRes] = await Promise.all([
          api.user.getVehicles().catch(() => []),
          api.bookings.list({ customerId: user.id }).catch(() => []),
          api.notifications.list().catch(() => []),
        ]);
        setStats({
          bookings: (Array.isArray(bRes?.data) ? bRes.data : (Array.isArray(bRes) ? bRes : [])).length,
          vehicles: (Array.isArray(vRes?.data) ? vRes.data : (Array.isArray(vRes) ? vRes : [])).length,
          notifications: (Array.isArray(nRes?.data) ? nRes.data : (Array.isArray(nRes) ? nRes : [])).length,
        });
      } catch (_) {}
      finally { setStatsLoading(false); }
    };
    load();
  }, [user.id]);

  let filtered = businesses;
  if (activeFilter === 'nearby' && nearbyResults.length > 0) {
    filtered = nearbyResults;
  } else if (activeFilter === 'low_queue') {
    filtered = businesses.filter(b => (b.queueCount || 0) <= 2);
  }

  const displayed = filtered.filter(b =>
    !search || (b.businessName || '').toLowerCase().includes(search.toLowerCase())
    || (b.city || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleBook = (b) => {
    setSelectedBusiness(b);
    setActiveProfileBusiness(null);
    setActiveTab('bookings');
  };

  return (
    <div className="dashboard-customer">
      {/* Welcome Hero Banner */}
      <div className="page-hero-welcome">
        <div className="hero-tag">
          <Sparkles size={13} /> PREMIUM AUTOMOTIVE NETWORK
        </div>
        <h1>Welcome back, {user.fullName?.split(' ')[0] || 'Car Owner'} 👋</h1>
        <p>
          Find vetted car wash stations within 1.5 km or schedule certified mobile detailing washers directly to your location.
        </p>
        <div className="page-hero-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleNearMe}
            disabled={locating}
            style={{ background: '#FFFFFF', color: '#1E1B4B', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', fontWeight: 700 }}
          >
            <span className="radar-pulse-dot" style={{ background: '#4F46E5', boxShadow: '0 0 0 0 rgba(79, 70, 229, 0.7)' }} />
            {locating ? 'Locating (1.5 km)...' : 'Find Near Me (1.5 km)'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setActiveTab('bookings')}
            style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.25)' }}
          >
            <Calendar size={16} /> Track My Orders
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setViewMode(v => v === 'grid' ? 'map' : 'grid')}
            style={{ color: '#E0E7FF' }}
          >
            <Navigation size={16} /> {viewMode === 'map' ? 'Grid View' : 'Map View'}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard
          title="My Bookings"
          value={stats.bookings}
          subtitle="View active orders →"
          icon={<Calendar size={20}/>}
          loading={statsLoading}
          gradient="#3B82F6"
          onClick={() => setActiveTab('bookings')}
        />
        <StatCard
          title="My Vehicles"
          value={stats.vehicles}
          subtitle="Manage garage →"
          icon={<Car size={20}/>}
          loading={statsLoading}
          gradient="#10B981"
          onClick={() => setActiveTab('vehicles')}
        />
        <StatCard
          title="Service Alerts"
          value={stats.notifications}
          subtitle="Check updates →"
          icon={<Bell size={20}/>}
          loading={statsLoading}
          gradient="#F59E0B"
          onClick={() => setActiveTab('notifications')}
        />
        <StatCard
          title="Nearby Radius"
          value={userLocation ? '1.5 km' : 'All'}
          subtitle={userLocation ? '🟢 Location Filter Active' : 'Tap to filter 1.5 km'}
          icon={<Navigation size={20}/>}
          loading={locating}
          gradient="#8B5CF6"
          onClick={handleNearMe}
        />
      </div>

      {/* Search & filter pills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
          <div className="form-input-icon-wrap" style={{ flex: 1, marginBottom: 0 }}>
            <span className="form-input-icon"><Search size={18} /></span>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 46, height: 48, borderRadius: 99, background: 'var(--bg-card)' }}
              placeholder="Search car wash station or city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleNearMe}
            disabled={locating}
            style={{ padding: '0 20px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
          >
            <Navigation size={16} /> {locating ? 'Locating...' : 'Near Me (1.5 km)'}
          </button>
        </div>

        <div className="filter-pills-bar">
          <button
            type="button"
            className={`filter-pill${activeFilter === 'all' ? ' active' : ''}`}
            onClick={() => { setActiveFilter('all'); }}
          >
            All Stations ({businesses.length})
          </button>
          <button
            type="button"
            className={`filter-pill${activeFilter === 'nearby' ? ' active' : ''}`}
            onClick={handleNearMe}
          >
            📍 Within 1.5 km {nearbyResults.length > 0 ? `(${nearbyResults.length})` : ''}
          </button>
          <button
            type="button"
            className={`filter-pill${activeFilter === 'low_queue' ? ' active' : ''}`}
            onClick={() => setActiveFilter(activeFilter === 'low_queue' ? 'all' : 'low_queue')}
          >
            🚗 Low Queue (≤ 2)
          </button>
          <button
            type="button"
            className={`filter-pill${viewMode === 'map' ? ' active' : ''}`}
            onClick={() => setViewMode(v => v === 'map' ? 'grid' : 'map')}
            style={{ marginLeft: 'auto' }}
          >
            {viewMode === 'map' ? '📋 Show Grid' : '🗺️ Show Map'}
          </button>
        </div>
      </div>

      <div className="dashboard-main-row">
        <div className="dashboard-primary">
          {/* Map view or nearby map */}
          {(viewMode === 'map' || userLocation) && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Interactive Station Map (1.5 km Range)
                </span>
                {userLocation && (
                  <button
                    type="button"
                    className="section-header-link"
                    onClick={() => { setUserLocation(null); setNearbyResults([]); setActiveFilter('all'); }}
                  >
                    Clear location filter
                  </button>
                )}
              </div>
              <NearbyMap
                businesses={displayed}
                userLocation={userLocation || { lat: 9.0227, lng: 38.7468 }}
                onSelectBusiness={(b) => setActiveProfileBusiness(b)}
              />
            </div>
          )}

          <div className="section-header">
            <h2 className="section-header-title">
              {activeFilter === 'nearby' ? 'Nearby Providers (1.5 km)' : 'Available Car Wash Stations'}
            </h2>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Showing {displayed.length} station{displayed.length !== 1 ? 's' : ''}
            </span>
          </div>

          {bizLoading ? (
            <div className="company-grid">
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton" style={{ height: 260, borderRadius: 18 }} />)}
            </div>
          ) : displayed.length === 0 ? (
            <div className="empty-state" style={{ background: 'var(--bg-card)', borderRadius: 18, border: '1px solid var(--border)' }}>
              <Building2 size={48} style={{ opacity: 0.3, marginBottom: 12, color: 'var(--primary)' }} />
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>No car wash stations found</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto 16px' }}>
                {activeFilter === 'nearby'
                  ? 'There are no active car wash stations registered within 1.5 km of your location.'
                  : 'Try adjusting your search terms or expanding your filter range.'}
              </p>
              {activeFilter === 'nearby' && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setActiveFilter('all'); setUserLocation(null); setNearbyResults([]); }}
                >
                  View All Stations
                </button>
              )}
            </div>
          ) : (
            <div className="company-grid">
              {displayed.map(b => (
                <CompanyCard
                  key={b.id}
                  biz={b}
                  userLocation={userLocation}
                  haversineDistance={haversineDistance}
                  onSelect={() => setActiveProfileBusiness(b)}
                  onBook={handleBook}
                />
              ))}
            </div>
          )}
        </div>

        {/* Aside Panel */}
        <aside className="dashboard-aside">
          <div className="dashboard-aside-panel">
            <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Quick Actions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn-primary" onClick={() => setActiveTab('bookings')} style={{ width: '100%', justifyContent: 'flex-start', gap: 10, background: 'var(--primary)', padding: '10px 16px' }}>
                <Calendar size={16} /> Book a Car Wash
              </button>
              <button className="btn btn-secondary" onClick={() => setActiveTab('vehicles')} style={{ width: '100%', justifyContent: 'flex-start', gap: 10, padding: '10px 16px' }}>
                <Car size={16} /> Register Vehicle
              </button>
              <button className="btn btn-ghost" onClick={handleNearMe} style={{ width: '100%', justifyContent: 'flex-start', gap: 10, padding: '10px 16px' }}>
                <Navigation size={16} /> Locate Within 1.5 km
              </button>
            </div>
          </div>

          <div className="dashboard-aside-panel" style={{ background: '#F8FAFC', borderColor: 'rgba(79, 70, 229, 0.2)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Phone size={15} /> Customer Support
            </h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px' }}>
              Need assistance with a booking or mobile washer dispatch?
            </p>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              📞 +251 911 000 000
            </div>
          </div>
        </aside>
      </div>

      {activeProfileBusiness && (
        <BusinessProfileModal
          business={activeProfileBusiness}
          onClose={() => setActiveProfileBusiness(null)}
          onBook={() => handleBook(activeProfileBusiness)}
        />
      )}
    </div>
  );
}

/* ─── Business Owner Dashboard ────────────────────────────── */
function BusinessOwnerDashboard({ user, setActiveTab, showToast }) {
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState(null);
  const [stats, setStats] = useState({ bookings: null, workers: null, todaySlots: null, revenue: null });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const biz = await api.user.getMyBusiness().catch(() => null);
        setBusiness(biz?.data || biz || null);
        if (biz?.id || biz?.data?.id) {
          const bizId = biz.data?.id || biz.id;
          const [bkRes, wkRes, slRes, revRes] = await Promise.all([
            api.bookings.list({ businessId: bizId }).catch(() => []),
            api.user.listWorkers().catch(() => []),
            api.slots.getSlotsByDate(bizId, new Date().toISOString().split('T')[0]).catch(() => []),
            api.payments.revenue.daily().catch(() => null),
          ]);
          setStats({
            bookings: (Array.isArray(bkRes?.data) ? bkRes.data : (Array.isArray(bkRes) ? bkRes : [])).length,
            workers:  (Array.isArray(wkRes?.data) ? wkRes.data : (Array.isArray(wkRes) ? wkRes : [])).length,
            todaySlots: (Array.isArray(slRes?.data) ? slRes.data : (Array.isArray(slRes) ? slRes : [])).length,
            revenue: revRes?.total ?? revRes?.amount ?? revRes ?? null,
          });
        }
      } catch (_) {}
      finally { setLoading(false); }
    };
    load();
  }, [user.id]);

  const isApproved = business?.isApproved === true || business?.is_approved === true;
  if (business && !isApproved) {
    return (
      <div className="content-narrow" style={{ animation: 'slide-in 0.3s ease-out', marginTop: 40, textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', border: '2px solid var(--orange-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <AlertCircle size={40} style={{ color: 'var(--orange)' }} />
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>Pending Approval</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '16px', marginBottom: '24px', lineHeight: '1.6' }}>
          Your business <strong style={{ color: 'var(--text-primary)' }}>{business.businessName}</strong> has been submitted and is waiting for admin approval. You'll be notified once it's approved.
        </p>
        <button className="glass-btn" onClick={() => setActiveTab('business')} style={{ padding: '10px 24px', fontSize: '14px' }}>
          <Building2 size={16} /> View Business Details
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="page-hero-welcome" style={{ background: '#1E1B4B' }}>
        <div className="hero-tag">
          <Building2 size={13} /> STATION MANAGEMENT HUB
        </div>
        <h1>{business?.businessName || user.fullName || 'Station Dashboard'}</h1>
        <p>Monitor real-time customer queue, manage bays and available slots, and track worker productivity.</p>
        <div className="page-hero-actions">
          <button className="btn btn-primary" onClick={() => setActiveTab('slots')} style={{ background: '#fff', color: '#1E1B4B', fontWeight: 700 }}>
            <Clock size={16} /> Manage Today's Slots
          </button>
          <button className="btn btn-secondary" onClick={() => setActiveTab('bookings')} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
            <Calendar size={16} /> View Bookings Queue
          </button>
        </div>
      </div>

      <div className="grid-2 dashboard-biz-stats" style={{ marginBottom: 28 }}>
        <StatCard title="Total Bookings" value={stats.bookings} icon={<Calendar size={18}/>} loading={loading} gradient="#3B82F6" onClick={() => setActiveTab('bookings')} />
        <StatCard title="Active Workers"  value={stats.workers}  icon={<Users size={18}/>}    loading={loading} gradient="#10B981" onClick={() => setActiveTab('workers')} />
        <StatCard title="Today's Slots"  value={stats.todaySlots} icon={<Clock size={18}/>}   loading={loading} gradient="#8B5CF6" onClick={() => setActiveTab('slots')} />
        <StatCard title="Daily Revenue"
          value={stats.revenue != null ? `ETB ${Number(stats.revenue).toFixed(0)}` : 'ETB 0'}
          icon={<DollarSign size={18}/>} loading={loading} gradient="#F59E0B" onClick={() => setActiveTab('payments')}
        />
      </div>

      <div className="card card-lg">
        <h3 className="section-header-title" style={{ marginBottom: 14 }}>Quick Actions</h3>
        <div className="action-list">
          {[
            { label: 'View Bookings Queue', tab: 'bookings', icon: <Calendar size={16}/> },
            { label: 'Manage Workers & Assignments', tab: 'workers', icon: <Users size={16}/> },
            { label: 'Station Profile & Services', tab: 'business', icon: <Building2 size={16}/> },
            { label: 'Financial Reports & Payouts', tab: 'payments', icon: <DollarSign size={16}/> },
          ].map(a => (
            <button key={a.tab} className="btn btn-ghost btn-full" onClick={() => setActiveTab(a.tab)} style={{ justifyContent: 'flex-start', gap: 10 }}>
              {a.icon} {a.label} <ChevronRight size={14} style={{ marginLeft: 'auto' }} />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

/* ─── Admin Dashboard ─────────────────────────────────────── */
function AdminDashboard({ user, setActiveTab, setAdminSubTab, showToast }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: null, pendingOwners: null, pendingBiz: null, revenue: null });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [usersRes, ownersRes, bizRes, revRes] = await Promise.all([
          api.auth.admin.listUsers().catch(() => []),
          api.admin.getPendingOwners().catch(() => []),
          api.admin.getPendingBusinesses().catch(() => []),
          api.payments.admin.revenue().catch(() => null),
        ]);
        setStats({
          users:        (Array.isArray(usersRes?.data)   ? usersRes.data   : (Array.isArray(usersRes)   ? usersRes   : [])).length,
          pendingOwners:(Array.isArray(ownersRes?.data)  ? ownersRes.data  : (Array.isArray(ownersRes)  ? ownersRes  : [])).filter(o => !o.isActive).length,
          pendingBiz:   (Array.isArray(bizRes?.data)     ? bizRes.data     : (Array.isArray(bizRes)     ? bizRes     : [])).filter(b => !b.isApproved).length,
          revenue: revRes?.total ?? revRes?.amount ?? revRes?.data ?? null,
        });
      } catch (_) {}
      finally { setLoading(false); }
    };
    load();
  }, [user.id]);

  return (
    <>
      <div className="page-hero-welcome" style={{ background: '#0F172A' }}>
        <div className="hero-tag">
          <ShieldAlert size={13} /> SYSTEM ADMINISTRATION
        </div>
        <h1>Platform Overview</h1>
        <p>Global monitor for user accounts, business approvals, and platform transaction volumes.</p>
        <div className="page-hero-actions">
          <button className="btn btn-primary" onClick={() => { setAdminSubTab('businesses'); setActiveTab('admin'); }} style={{ background: '#fff', color: '#0F172A', fontWeight: 700 }}>
            <Building2 size={16} /> Review Pending Businesses ({stats.pendingBiz || 0})
          </button>
          <button className="btn btn-secondary" onClick={() => setActiveTab('payments')} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
            <DollarSign size={16} /> Financial Audits
          </button>
        </div>
      </div>

      <div className="grid-2 dashboard-admin-stats" style={{ marginBottom: 28 }}>
        <StatCard title="Total Platform Users" value={stats.users} icon={<Users size={18}/>} loading={loading} gradient="#3B82F6" onClick={() => { setAdminSubTab('users'); setActiveTab('admin'); }} />
        <StatCard title="Pending Owners" value={stats.pendingOwners} icon={<UserPlus size={18}/>} loading={loading} gradient="#F59E0B" onClick={() => { setAdminSubTab('owners'); setActiveTab('admin'); }} urgent={stats.pendingOwners} />
        <StatCard title="Pending Stations" value={stats.pendingBiz} icon={<Building2 size={18}/>} loading={loading} gradient="#EF4444" onClick={() => { setAdminSubTab('businesses'); setActiveTab('admin'); }} urgent={stats.pendingBiz} />
        <StatCard title="Platform Revenue"
          value={stats.revenue != null ? `ETB ${Number(stats.revenue).toFixed(0)}` : 'ETB 0'}
          icon={<DollarSign size={18}/>} loading={loading} gradient="#10B981" onClick={() => setActiveTab('payments')}
        />
      </div>

      {(stats.pendingOwners > 0 || stats.pendingBiz > 0) && (
        <div className="alert alert-warning" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderRadius: 14 }} onClick={() => setActiveTab('admin')}>
          <span style={{ fontSize: 13.5, fontWeight: 700 }}>
            ⚠️ {(stats.pendingOwners || 0) + (stats.pendingBiz || 0)} verification items requiring administrator attention
          </span>
          <ChevronRight size={16} />
        </div>
      )}

      <div className="card card-lg">
        <h3 className="section-header-title" style={{ marginBottom: 14 }}>Admin Actions</h3>
        <div className="action-list">
          {[
            { label: 'Business Owner Approvals', tab: 'admin', icon: <ShieldAlert size={16}/> },
            { label: 'All Platform Transactions', tab: 'payments', icon: <DollarSign size={16}/> },
            { label: 'Notification & Audit Logs', tab: 'notifications', icon: <Bell size={16}/> },
          ].map(a => (
            <button key={a.tab} className="btn btn-ghost btn-full" onClick={() => setActiveTab(a.tab)} style={{ justifyContent: 'flex-start', gap: 10 }}>
              {a.icon} {a.label} <ChevronRight size={14} style={{ marginLeft: 'auto' }} />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

/* ΓöÇΓöÇΓöÇ Root export ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
export default function Dashboard({ setActiveTab, setSelectedBusiness, user, showToast }) {
  const dispatch = useDispatch();
  const role = user?.role || 'CUSTOMER';
  return (
    <div className="slide-in">
      {role === 'CUSTOMER'       && <CustomerDashboard      user={user} setActiveTab={setActiveTab} setSelectedBusiness={setSelectedBusiness} showToast={showToast} />}
      {role === 'BUSINESS_OWNER' && <BusinessOwnerDashboard user={user} setActiveTab={setActiveTab} showToast={showToast} />}
      {(role === 'ADMIN' || role === 'SUPER_ADMIN') && <AdminDashboard user={user} setActiveTab={setActiveTab} setAdminSubTab={(tab) => dispatch(setAdminSubTab(tab))} showToast={showToast} />}
    </div>
  );
}

function BusinessProfileModal({ business, onClose, onBook }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business?.id) return;
    const fetchReviews = async () => {
      setLoading(true);
      try {
        const res = await api.bookings.listBusinessReviews(business.id);
        setReviews(Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      } catch (_) {
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [business?.id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: 24, display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
              {business.businessName}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={13} /> {business.city || business.address || 'Location N/A'}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 4 }}><X size={18} /></button>
        </div>

        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
          {business.description && (
            <p style={{ lineHeight: 1.5, margin: 0, color: 'var(--text-primary)' }}>
              {business.description}
            </p>
          )}
          {business.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Phone size={13} style={{ color: 'var(--primary)' }} />
              <span>{business.phone}</span>
            </div>
          )}
        </div>

        {/* Reviews */}
        <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Star size={14} style={{ color: 'var(--primary)' }} /> Customer Reviews ({reviews.length})
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flex: 1, minHeight: 120, marginBottom: 20, paddingRight: 4 }}>
          {loading ? (
            <div className="skeleton" style={{ height: 60, borderRadius: 12 }} />
          ) : reviews.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', margin: '20px 0' }}>
              No reviews yet for this provider.
            </p>
          ) : (
            reviews.map(rev => (
              <div key={rev.id} style={{ padding: 12, background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>
                    {rev.customerName || rev.reviewerName || rev.booking?.customerName || 'Verified Customer'}
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
              </div>
            ))
          )}
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-ghost btn-full" onClick={onClose}>Close</button>
          <button className="btn btn-primary btn-full" onClick={onBook}>Book Service</button>
        </div>
      </div>
    </div>
  );
}
