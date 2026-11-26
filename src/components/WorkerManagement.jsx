import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { isValidEthPhone } from '../utils/validation';
import { UserPlus, Users, Edit2, Trash2, Clock, Plus, X, Check, ToggleLeft, ToggleRight } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function WorkerManagement({ user, showToast }) {
  const [business, setBusiness] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editWorker, setEditWorker] = useState(null);
  const [availWorker, setAvailWorker] = useState(null);
  const [availData, setAvailData] = useState([]);
  const [loadingAvail, setLoadingAvail] = useState(false);

  // Add form state
  const [addForm, setAddForm] = useState({
    name: '', phone: '', jobRole: '', digitalId: '', profileImage: null,
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '', phone: '', jobRole: '', digitalId: '', isActive: true,
  });
  const [editImageFile, setEditImageFile] = useState(null);

  // Availability form state
  const [availForm, setAvailForm] = useState(
    DAYS.map((_, i) => ({ dayOfWeek: i, isAvailable: false, startTime: '09:00', endTime: '17:00' }))
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      let biz = null;
      try {
        const bizRes = await api.user.getMyBusiness();
        biz = bizRes?.data ?? bizRes ?? null;
      } catch (err) {
        if (!err.message?.toLowerCase().includes('not found') && !err.message?.toLowerCase().includes('no business')) {
          throw err;
        }
      }
      setBusiness(biz);

      if (biz) {
        const wRes = await api.user.listWorkers();
        const list = wRes?.data ?? wRes ?? [];
        setWorkers(Array.isArray(list) ? list : []);
      } else {
        setWorkers([]);
      }
    } catch (err) {
      showToast('Failed to load data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const businessId = business?.id || business?.business?.id;

  if (!loading && !business) {
    return (
      <div className="form-container" style={{ animation: 'slide-in 0.3s ease-out' }}>
        <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <Users size={48} style={{ marginBottom: 16, opacity: 0.3, color: 'var(--text-muted)' }} />
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            Business profile required
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            Register your business profile before adding workers. Go to the Business section and complete your business details first.
          </p>
        </div>
      </div>
    );
  }

  const resetAddForm = () => {
    setAddForm({ name: '', phone: '', jobRole: '', digitalId: '', profileImage: null });
    setShowAddForm(false);
  };

  const fieldStyle = {
    display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px',
  };

  const handleAddWorker = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.phone.trim()) {
      showToast('Name and phone are required', 'error');
      return;
    }
    if (!isValidEthPhone(addForm.phone.trim())) {
      showToast('Enter a valid phone number (e.g. 09XX XXX XXX)', 'error');
      return;
    }
    try {
      const fd = new FormData();
      fd.append('name', addForm.name.trim());
      fd.append('phone', addForm.phone.trim());
      if (addForm.jobRole) fd.append('jobRole', addForm.jobRole.trim());
      if (addForm.digitalId) fd.append('digitalId', addForm.digitalId.trim());
      if (addForm.profileImage) fd.append('profileImage', addForm.profileImage);
      await api.user.addWorker(fd);
      showToast('Worker added successfully!', 'success');
      resetAddForm();
      fetchData();
    } catch (err) {
      showToast('Failed to add worker: ' + err.message, 'error');
    }
  };

  const openEditForm = (worker) => {
    setEditWorker(worker);
    setEditForm({
      name: worker.name || '',
      phone: worker.phone || '',
      jobRole: worker.jobRole || '',
      digitalId: worker.digitalId || '',
      isActive: worker.isActive !== false,
    });
  };

  const handleEditWorker = async (e) => {
    e.preventDefault();
    if (!editWorker) return;
    const cleaned = {
      ...editForm,
      name: editForm.name.trim(),
      phone: editForm.phone.trim(),
      jobRole: (editForm.jobRole || '').trim(),
      digitalId: (editForm.digitalId || '').trim(),
    };
    if (!cleaned.name || !cleaned.phone) {
      showToast('Name and phone are required', 'error');
      return;
    }
    if (!isValidEthPhone(cleaned.phone)) {
      showToast('Enter a valid phone number (e.g. 09XX XXX XXX)', 'error');
      return;
    }
    try {
      const payload = editImageFile ? new FormData() : cleaned;
      if (editImageFile) {
        Object.entries(cleaned).forEach(([k, v]) => payload.append(k, v));
        payload.append('profileImage', editImageFile);
      }
      await api.user.updateWorker(editWorker.id, payload);
      showToast('Worker updated successfully!', 'success');
      setEditWorker(null);
      setEditImageFile(null);
      fetchData();
    } catch (err) {
      showToast('Failed to update worker: ' + err.message, 'error');
    }
  };

  const openAvailability = async (worker) => {
    setAvailWorker(worker);
    if (!businessId) return;
    try {
      setLoadingAvail(true);
      const res = await api.workers.getAvailability(businessId, worker.id);
      const existing = Array.isArray(res) ? res : res.data || [];
      const formData = DAYS.map((_, i) => {
        const found = existing.find(a => a.dayOfWeek === i);
        return found
          ? { dayOfWeek: i, isAvailable: found.isAvailable !== false, startTime: found.startTime || '09:00', endTime: found.endTime || '17:00' }
          : { dayOfWeek: i, isAvailable: false, startTime: '09:00', endTime: '17:00' };
      });
      setAvailForm(formData);
    } catch {
      setAvailForm(DAYS.map((_, i) => ({ dayOfWeek: i, isAvailable: false, startTime: '09:00', endTime: '17:00' })));
    } finally {
      setLoadingAvail(false);
    }
  };

  const toggleAvailDay = (idx) => {
    setAvailForm(prev => prev.map((d, i) => i === idx ? { ...d, isAvailable: !d.isAvailable } : d));
  };

  const updateAvailTime = (idx, field, value) => {
    setAvailForm(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  };

  const saveAvailability = async () => {
    if (!businessId || !availWorker) return;
    for (const d of availForm) {
      if (!d.isAvailable) continue;
      if (!d.startTime || !d.endTime) {
        showToast(`${DAYS[d.dayOfWeek]}: start and end times are required`, 'error');
        return;
      }
      if (d.endTime <= d.startTime) {
        showToast(`${DAYS[d.dayOfWeek]}: end time must be after start time`, 'error');
        return;
      }
    }
    try {
      await api.workers.setAvailability(businessId, availWorker.id, availForm);
      showToast('Availability saved!', 'success');
      setAvailWorker(null);
    } catch (err) {
      showToast('Failed to save availability: ' + err.message, 'error');
    }
  };

  const handleIncrementWash = async (worker) => {
    try {
      await api.user.incrementWorkerWash(worker.id);
      showToast(`Wash count incremented for ${worker.name}!`, 'success');
      fetchData();
    } catch (err) {
      showToast('Failed to increment wash: ' + err.message, 'error');
    }
  };

  const handleDelete = async (worker) => {
    if (!window.confirm(`Are you sure you want to delete worker "${worker.name}"? This action cannot be undone.`)) return;
    try {
      await api.user.deleteWorker(worker.id);
      showToast('Worker deleted successfully!', 'success');
      fetchData();
    } catch (err) {
      showToast('Failed to delete worker: ' + err.message, 'error');
    }
  };

  return (
    <div style={{ animation: 'slide-in 0.3s ease-out' }}>
      <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Worker Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
            Manage your car wash staff, schedules, and performance.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(prev => !prev)} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {showAddForm ? <X size={18} /> : <UserPlus size={18} />}
          {showAddForm ? 'Cancel' : 'Add Worker'}
        </button>
      </div>

      {/* Add Worker Form */}
      {showAddForm && (
        <div className="card" style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '20px', color: 'var(--text-primary)', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <UserPlus size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Add New Worker
          </h3>
          <form onSubmit={handleAddWorker} className="grid-form">
            <div>
              <label style={fieldStyle}>NAME *</label>
              <input type="text" className="form-input" placeholder="Worker name" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <label style={fieldStyle}>PHONE *</label>
              <input type="text" className="form-input" placeholder="Phone number" value={addForm.phone} onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))} required />
            </div>
            <div>
              <label style={fieldStyle}>JOB ROLE</label>
              <input type="text" className="form-input" placeholder="e.g. Washer, Detailer" value={addForm.jobRole} onChange={e => setAddForm(p => ({ ...p, jobRole: e.target.value }))} />
            </div>
            <div>
              <label style={fieldStyle}>DIGITAL ID</label>
              <input type="text" className="form-input" placeholder="Digital identifier" value={addForm.digitalId} onChange={e => setAddForm(p => ({ ...p, digitalId: e.target.value }))} />
            </div>
            <div>
              <label style={fieldStyle}>PROFILE IMAGE</label>
              <input type="file" className="form-input" accept="image/*" onChange={e => setAddForm(p => ({ ...p, profileImage: e.target.files[0] }))} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={18} /> Add Worker
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Workers Grid */}
      {loading ? (
        <div className="grid-cards">
          {[1, 2, 3].map(i => (
            <div key={i} className="card" style={{ padding: '24px' }}>
              <div className="skeleton" style={{ height: '20px', width: '60%', marginBottom: '12px', borderRadius: '6px' }}></div>
              <div className="skeleton" style={{ height: '14px', width: '40%', marginBottom: '8px', borderRadius: '6px' }}></div>
              <div className="skeleton" style={{ height: '14px', width: '50%', marginBottom: '8px', borderRadius: '6px' }}></div>
              <div className="skeleton" style={{ height: '14px', width: '30%', marginBottom: '16px', borderRadius: '6px' }}></div>
              <div className="skeleton" style={{ height: '36px', width: '100%', borderRadius: '8px' }}></div>
            </div>
          ))}
        </div>
      ) : workers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <Users size={48} style={{ marginBottom: '16px', opacity: 0.3, color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>No Workers Yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
            Add your first worker to start managing your team.
          </p>
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)} style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
            <UserPlus size={18} /> Add Worker
          </button>
        </div>
      ) : (
        <div className="grid-cards">
          {workers.map(w => (
            <div key={w.id} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {w.profileImage ? (
                    <img src={w.profileImage} alt={w.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '16px', fontWeight: 700, flexShrink: 0 }}>
                      {w.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{w.name}</h3>
                    <span className={`badge ${w.isActive !== false ? 'badge-completed' : 'badge-cancelled'}`} style={{ fontSize: '11px' }}>
                      {w.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => openEditForm(w)} className="btn-ghost" style={{ padding: '8px', cursor: 'pointer', display: 'flex', color: 'var(--text-secondary)' }} title="Edit">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(w)} className="btn-ghost" style={{ padding: '8px', cursor: 'pointer', display: 'flex', color: 'var(--danger)' }} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {w.phone && <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>📞 {w.phone}</div>}
              {w.jobRole && <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>🔧 {w.jobRole}</div>}
              <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                🧼 Washed: <strong style={{ color: 'var(--text-primary)' }}>{w.washedCount || w.washCount || 0}</strong>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button className="btn btn-primary" onClick={() => handleIncrementWash(w)} style={{ flex: 1, padding: '8px', fontSize: '13px', display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={14} /> Wash
                </button>
                <button className="btn-secondary" onClick={() => openAvailability(w)} style={{ flex: 1, padding: '8px', fontSize: '13px', display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={14} /> Schedule
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Worker Modal */}
      {editWorker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => { setEditWorker(null); setEditImageFile(null); }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '32px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '20px', color: 'var(--text-primary)' }}>Edit Worker</h3>
              <button onClick={() => { setEditWorker(null); setEditImageFile(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleEditWorker} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={fieldStyle}>NAME</label>
                <input type="text" className="form-input" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div>
                <label style={fieldStyle}>PHONE</label>
                <input type="text" className="form-input" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} required />
              </div>
              <div>
                <label style={fieldStyle}>JOB ROLE</label>
                <input type="text" className="form-input" value={editForm.jobRole} onChange={e => setEditForm(p => ({ ...p, jobRole: e.target.value }))} />
              </div>
              <div>
                <label style={fieldStyle}>DIGITAL ID</label>
                <input type="text" className="form-input" value={editForm.digitalId} onChange={e => setEditForm(p => ({ ...p, digitalId: e.target.value }))} />
              </div>
              <div>
                <label style={fieldStyle}>PROFILE IMAGE</label>
                <input type="file" className="form-input" accept="image/*" onChange={e => setEditImageFile(e.target.files[0] || null)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button type="button" onClick={() => setEditForm(p => ({ ...p, isActive: !p.isActive }))} style={{ cursor: 'pointer', color: editForm.isActive ? 'var(--green)' : 'var(--red)', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                  {editForm.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  {editForm.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={18} /> Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Availability Modal */}
      {availWorker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setAvailWorker(null)}>
          <div className="card" style={{ maxWidth: '640px', width: '100%', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '20px', color: 'var(--text-primary)' }}>Availability — {availWorker.name}</h3>
              <button onClick={() => setAvailWorker(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            {loadingAvail ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '56px', borderRadius: '8px' }}></div>)}
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                  {availForm.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                      <button type="button" onClick={() => toggleAvailDay(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: d.isAvailable ? 'var(--green)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: d.isAvailable ? 700 : 400, fontSize: '14px', minWidth: '60px' }}>
                        {d.isAvailable ? <Check size={16} /> : <X size={16} />}
                        {DAYS[i]}
                      </button>
                      {d.isAvailable && (
                        <div style={{ display: 'flex', gap: '12px', flex: 1, alignItems: 'center' }}>
                          <input type="time" className="form-input" value={d.startTime} onChange={e => updateAvailTime(i, 'startTime', e.target.value)} style={{ flex: 1 }} />
                          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>to</span>
                          <input type="time" className="form-input" value={d.endTime} onChange={e => updateAvailTime(i, 'endTime', e.target.value)} style={{ flex: 1 }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary" onClick={saveAvailability} style={{ width: '100%', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={18} /> Save Schedule
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
