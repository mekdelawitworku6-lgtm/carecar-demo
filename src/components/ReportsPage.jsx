import { useState } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { ReportsTab } from './BusinessOwnerPanel';

export default function ReportsPage({ user, showToast, setActiveTab }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div style={{ animation: 'slide-in 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px var(--primary-glow)' }}>
            <BarChart3 size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Reports
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
              Business performance, revenue, worker status, and completed washes.
            </p>
          </div>
        </div>
        <button className="glass-btn glass-btn-secondary" onClick={() => setRefreshKey(k => k + 1)} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <ReportsTab showToast={showToast} refreshKey={refreshKey} setActiveTab={setActiveTab} />
    </div>
  );
}