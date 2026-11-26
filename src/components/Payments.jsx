import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { isValidEthPhone, isValidUUID } from '../utils/validation';
import { CreditCard, DollarSign, TrendingUp, Receipt, Wallet, ExternalLink } from 'lucide-react';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(amount);
}

function shortId(id) {
  if (!id) return '';
  return id.length > 8 ? id.substring(0, 8) + '...' : id;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getStatusBadgeClass(status) {
  if (status === 'PENDING') return 'badge-pending';
  if (status === 'COMPLETED') return 'badge-completed';
  if (status === 'FAILED' || status === 'REFUNDED') return 'badge-cancelled';
  return 'badge-pending';
}

function getMethodStyle(method) {
  if (method === 'TELEBIRR') return { color: 'var(--cyan)', border: '1px solid rgba(6, 182, 212, 0.3)', background: 'rgba(6, 182, 212, 0.08)' };
  if (method === 'CASH') return { color: 'var(--green)', border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.08)' };
  return {};
}

export default function Payments({ user, showToast }) {
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  const tabs = user.role === 'CUSTOMER'
    ? [
        { id: 'transactions', label: 'My Transactions', icon: Receipt },
        { id: 'make-payment', label: 'Make Payment', icon: CreditCard },
      ]
    : user.role === 'BUSINESS_OWNER'
      ? [
          { id: 'transactions', label: 'Transactions', icon: Receipt },
          { id: 'record-cash', label: 'Record Cash', icon: DollarSign },
          { id: 'revenue', label: 'Revenue', icon: TrendingUp },
        ]
      : [
          { id: 'transactions', label: 'All Transactions', icon: Receipt },
          { id: 'platform-revenue', label: 'Platform Revenue', icon: TrendingUp },
        ];

  const [activeTab, setActiveTab] = useState(tabs[0].id);

  // Transactions state
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);

  // Make Payment form
  const [payAmount, setPayAmount] = useState('');
  const [payPhone, setPayPhone] = useState('');
  const [payBookingId, setPayBookingId] = useState('');
  const [payDescription, setPayDescription] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [payResult, setPayResult] = useState(null);

  // Record Cash form
  const [cashAmount, setCashAmount] = useState('');
  const [cashCustomerId, setCashCustomerId] = useState('');
  const [cashBookingId, setCashBookingId] = useState('');
  const [cashDescription, setCashDescription] = useState('');
  const [cashLoading, setCashLoading] = useState(false);
  const [cashResult, setCashResult] = useState(null);

  // Revenue state
  const [dailyRev, setDailyRev] = useState(null);
  const [weeklyRev, setWeeklyRev] = useState(null);
  const [monthlyRev, setMonthlyRev] = useState(null);
  const [revLoading, setRevLoading] = useState(false);

  // Admin revenue state
  const [platformRevenue, setPlatformRevenue] = useState(null);
  const [platRevLoading, setPlatRevLoading] = useState(false);

  const fetchTransactions = async () => {
    try {
      setTxLoading(true);
      const params = { page: 1, limit: 50 };
      let res;
      if (isAdmin) {
        res = await api.payments.admin.listTransactions(params);
      } else {
        res = await api.payments.listTransactions(params);
      }
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setTransactions(list);
    } catch (err) {
      setTransactions([]);
      showToast(err.message || 'Failed to load transactions', 'error');
    } finally {
      setTxLoading(false);
    }
  };

  const fetchRevenue = async () => {
    try {
      setRevLoading(true);
      const [daily, weekly, monthly] = await Promise.all([
        api.payments.revenue.daily(),
        api.payments.revenue.weekly(),
        api.payments.revenue.monthly(),
      ]);
      setDailyRev(daily.data || daily);
      setWeeklyRev(weekly.data || weekly);
      setMonthlyRev(monthly.data || monthly);
    } catch (err) {
      showToast(err.message || 'Failed to load revenue', 'error');
    } finally {
      setRevLoading(false);
    }
  };

  const fetchPlatformRevenue = async () => {
    try {
      setPlatRevLoading(true);
      const res = await api.payments.admin.revenue();
      setPlatformRevenue(res.data || res);
    } catch (err) {
      showToast(err.message || 'Failed to load platform revenue', 'error');
    } finally {
      setPlatRevLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user.id]);

  useEffect(() => {
    if (activeTab === 'revenue' && user.role === 'BUSINESS_OWNER') {
      fetchRevenue();
    }
    if (activeTab === 'platform-revenue' && isAdmin) {
      fetchPlatformRevenue();
    }
  }, [activeTab, user.id]);

  const handleInitiatePayment = async (e) => {
    e.preventDefault();
    const amt = Number(payAmount);
    if (!isFinite(amt) || amt <= 0) {
      showToast('Enter a valid positive amount', 'error');
      return;
    }
    if (!payPhone.trim()) {
      showToast('Phone number is required', 'error');
      return;
    }
    if (!isValidEthPhone(payPhone.trim())) {
      showToast('Enter a valid phone number (e.g. 09XX XXX XXX)', 'error');
      return;
    }
    if (payBookingId && !isValidUUID(payBookingId.trim())) {
      showToast('Booking ID is not a valid UUID', 'error');
      return;
    }
    setPayLoading(true);
    setPayResult(null);
    try {
      const res = await api.payments.initiate(
        amt,
        payPhone.trim(),
        user.businessId || '',
        payBookingId?.trim() || undefined,
        payDescription === undefined ? undefined : payDescription.trim()
      );
      setPayResult(res.data || res);
      showToast('Payment initiated successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to initiate payment', 'error');
    } finally {
      setPayLoading(false);
    }
  };

  const handleRecordCash = async (e) => {
    e.preventDefault();
    const amt = Number(cashAmount);
    if (!isFinite(amt) || amt <= 0) {
      showToast('Enter a valid positive amount', 'error');
      return;
    }
    if (!cashCustomerId.trim()) {
      showToast('Customer ID is required', 'error');
      return;
    }
    if (!isValidUUID(cashCustomerId.trim())) {
      showToast('Customer ID is not a valid UUID', 'error');
      return;
    }
    if (cashBookingId && !isValidUUID(cashBookingId.trim())) {
      showToast('Booking ID is not a valid UUID', 'error');
      return;
    }
    setCashLoading(true);
    setCashResult(null);
    try {
      const res = await api.payments.recordCash(
        amt,
        cashCustomerId.trim(),
        cashBookingId?.trim() || undefined,
        cashDescription === undefined ? undefined : cashDescription.trim()
      );
      setCashResult(res.data || res);
      showToast('Cash payment recorded successfully!', 'success');
      fetchTransactions();
    } catch (err) {
      showToast(err.message || 'Failed to record cash payment', 'error');
    } finally {
      setCashLoading(false);
    }
  };

  const renderTransactions = () => {
    const safeTransactions = Array.isArray(transactions) ? transactions : [];
    return (
      <div>

      {txLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="skeleton" style={{ height: '100px', borderRadius: '16px' }}></div>
          <div className="skeleton" style={{ height: '100px', borderRadius: '16px' }}></div>
          <div className="skeleton" style={{ height: '100px', borderRadius: '16px' }}></div>
        </div>
      ) : safeTransactions.length === 0 ? (
        <div className="glass-card" style={{
          textAlign: 'center',
          padding: '60px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Receipt size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>No transactions found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {user.role === 'CUSTOMER' ? 'You have not made any payments yet.' : 'No payment records available.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {safeTransactions.map((tx) => (
            <div key={tx.id} className="glass-card" style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                <div style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)'
                }}>
                  <Wallet size={24} style={{ color: 'var(--primary)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      #{shortId(tx.id)}
                    </span>
                    <span className={`badge ${getStatusBadgeClass(tx.status)}`}>{tx.status}</span>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      ...getMethodStyle(tx.paymentMethod || tx.method)
                    }}>
                      <CreditCard size={11} /> {tx.paymentMethod || tx.method || 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '20px', color: 'var(--text-muted)', fontSize: '13px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatCurrency(tx.amount)}
                    </span>
                    <span>{formatDate(tx.createdAt || tx.date)}</span>
                    {tx.bookingId && <span>Booking: {shortId(tx.bookingId)}</span>}
                    {tx.invoiceId && (
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          api.payments.getInvoice(tx.invoiceId).then(res => {
                            showToast('Invoice loaded', 'success');
                          }).catch(() => {
                            showToast('Invoice not available', 'error');
                          });
                        }}
                        style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                      >
                        <Receipt size={12} /> Invoice
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

  const renderMakePayment = () => (
    <div className="glass-card" style={{ maxWidth: '520px', margin: '0 auto' }}>
      <h3 style={{ fontSize: '20px', color: 'var(--text-primary)', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <CreditCard size={20} style={{ color: 'var(--primary)' }} /> Make Payment
      </h3>

      {payResult ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            padding: '20px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid var(--green-glow)',
          }}>
            <p style={{ color: 'var(--green)', fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
              Payment initiated successfully!
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>
              Transaction ID: <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{payResult.transactionId}</span>
            </p>
            {payResult.outTradeNo && (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>
                Order No: <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{payResult.outTradeNo}</span>
              </p>
            )}
          </div>

          {payResult.toPayUrl && (
            <a
              href={payResult.toPayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-btn"
              style={{
                textAlign: 'center',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'var(--primary)',
                border: 'none',
              }}
            >
              <ExternalLink size={16} /> Open Payment Gateway
            </a>
          )}

          <button
            className="glass-btn glass-btn-secondary"
            onClick={() => { setPayResult(null); setPayAmount(''); setPayPhone(''); setPayBookingId(''); setPayDescription(''); }}
          >
            Make Another Payment
          </button>
        </div>
      ) : (
        <form onSubmit={handleInitiatePayment} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>AMOUNT (ETB)</label>
            <input type="number" className="glass-input" placeholder="e.g. 500" value={payAmount} onChange={e => setPayAmount(e.target.value)} required min={1} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>PHONE NUMBER</label>
            <input type="text" className="glass-input" placeholder="e.g. 251912345678" value={payPhone} onChange={e => setPayPhone(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>BOOKING ID (OPTIONAL)</label>
            <input type="text" className="glass-input" placeholder="Booking ID" value={payBookingId} onChange={e => setPayBookingId(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>DESCRIPTION (OPTIONAL)</label>
            <input type="text" className="glass-input" placeholder="e.g. Premium wash" value={payDescription} onChange={e => setPayDescription(e.target.value)} />
          </div>
          <button type="submit" className="glass-btn" style={{ marginTop: '8px' }} disabled={payLoading}>
            {payLoading ? 'Processing...' : 'Initiate Payment'}
          </button>
        </form>
      )}
    </div>
  );

  const renderRecordCash = () => (
    <div className="glass-card" style={{ maxWidth: '520px', margin: '0 auto' }}>
      <h3 style={{ fontSize: '20px', color: 'var(--text-primary)', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <DollarSign size={20} style={{ color: 'var(--green)' }} /> Record Cash Payment
      </h3>

      {cashResult ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            padding: '20px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid var(--green-glow)',
          }}>
            <p style={{ color: 'var(--green)', fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
              Cash payment recorded successfully!
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>
              Transaction ID: <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{cashResult.transactionId}</span>
            </p>
            {cashResult.invoiceId && (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                Invoice ID: <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{cashResult.invoiceId}</span>
              </p>
            )}
          </div>
          <button
            className="glass-btn glass-btn-secondary"
            onClick={() => { setCashResult(null); setCashAmount(''); setCashCustomerId(''); setCashBookingId(''); setCashDescription(''); }}
          >
            Record Another Payment
          </button>
        </div>
      ) : (
        <form onSubmit={handleRecordCash} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>AMOUNT (ETB)</label>
            <input type="number" className="glass-input" placeholder="e.g. 500" value={cashAmount} onChange={e => setCashAmount(e.target.value)} required min={1} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>CUSTOMER ID</label>
            <input type="text" className="glass-input" placeholder="Customer UUID" value={cashCustomerId} onChange={e => setCashCustomerId(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>BOOKING ID (OPTIONAL)</label>
            <input type="text" className="glass-input" placeholder="Booking ID" value={cashBookingId} onChange={e => setCashBookingId(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>DESCRIPTION (OPTIONAL)</label>
            <input type="text" className="glass-input" placeholder="e.g. Premium wash - cash" value={cashDescription} onChange={e => setCashDescription(e.target.value)} />
          </div>
          <button type="submit" className="glass-btn" style={{ marginTop: '8px', background: 'var(--green)', boxShadow: '0 4px 14px var(--green-glow)' }} disabled={cashLoading}>
            {cashLoading ? 'Recording...' : 'Record Cash Payment'}
          </button>
        </form>
      )}
    </div>
  );

  const renderRevenueCard = (title, data, loading) => (
    <div className="glass-card" style={{ flex: 1, minWidth: '220px' }}>
      {loading ? (
        <div>
          <div className="skeleton" style={{ width: '100px', height: '14px', borderRadius: '4px', marginBottom: '12px' }}></div>
          <div className="skeleton" style={{ width: '140px', height: '40px', borderRadius: '8px', marginBottom: '8px' }}></div>
          <div className="skeleton" style={{ width: '80px', height: '12px', borderRadius: '4px' }}></div>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '12px' }}>{title}</p>
          <h3 style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
            {formatCurrency(data?.totalAmount || data?.totalRevenue || 0)}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {data?.transactionCount || 0} transaction{(data?.transactionCount || 0) !== 1 ? 's' : ''}
          </p>
        </>
      )}
    </div>
  );

  const renderRevenue = () => (
    <div>
      <div style={{
        display: 'flex',
        gap: '24px',
        flexWrap: 'wrap',
        marginBottom: '40px'
      }}>
        {renderRevenueCard('Daily Revenue', dailyRev, revLoading && !dailyRev)}
        {renderRevenueCard('Weekly Revenue', weeklyRev, revLoading && !weeklyRev)}
        {renderRevenueCard('Monthly Revenue', monthlyRev, revLoading && !monthlyRev)}
      </div>
      <div className="glass-card">
        <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={18} style={{ color: 'var(--primary)' }} /> Revenue Summary
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          View your business revenue trends across different time periods.
        </p>
      </div>
    </div>
  );

  const renderPlatformRevenue = () => (
    <div>
      <div style={{
        display: 'flex',
        gap: '24px',
        flexWrap: 'wrap',
        marginBottom: '40px'
      }}>
        <div className="glass-card" style={{ flex: 1, minWidth: '220px' }}>
          {platRevLoading ? (
            <div>
              <div className="skeleton" style={{ width: '120px', height: '14px', borderRadius: '4px', marginBottom: '12px' }}></div>
              <div className="skeleton" style={{ width: '160px', height: '40px', borderRadius: '8px', marginBottom: '8px' }}></div>
              <div className="skeleton" style={{ width: '100px', height: '12px', borderRadius: '4px' }}></div>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '12px' }}>PLATFORM REVENUE (ALL TIME)</p>
              <h3 style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                {formatCurrency(platformRevenue?.totalRevenue || 0)}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {platformRevenue?.transactionCount || 0} total transaction{(platformRevenue?.transactionCount || 0) !== 1 ? 's' : ''}
              </p>
            </>
          )}
        </div>
      </div>
      <div className="glass-card">
        <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={18} style={{ color: 'var(--primary)' }} /> Platform Overview
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          Total revenue generated across all businesses on the platform.
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ animation: 'slide-in 0.3s ease-out' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Payments</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
          {user.role === 'CUSTOMER' ? 'View your transactions and make payments' :
           user.role === 'BUSINESS_OWNER' ? 'Manage payments and track revenue' :
           'Oversee all platform payments and revenue'}
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '32px',
        flexWrap: 'wrap',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '12px'
      }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '10px',
                border: isActive ? '1px solid var(--primary)' : '1px solid transparent',
                background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 700,
                transition: 'var(--transition-smooth)',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'transactions' && renderTransactions()}
      {activeTab === 'make-payment' && renderMakePayment()}
      {activeTab === 'record-cash' && renderRecordCash()}
      {activeTab === 'revenue' && renderRevenue()}
      {activeTab === 'platform-revenue' && renderPlatformRevenue()}
    </div>
  );
}
