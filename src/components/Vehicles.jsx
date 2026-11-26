import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Plus, Trash2, ShieldCheck, Car, Edit2, Star, Image } from 'lucide-react';

export default function Vehicles({ showToast }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [color, setColor] = useState('');
  const [vehicleType, setVehicleType] = useState('SEDAN');
  const [isDefault, setIsDefault] = useState(false);
  const [images, setImages] = useState([]);
  const [formLoading, setFormLoading] = useState(false);

  const [fetchError, setFetchError] = useState(null);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const res = await api.user.getVehicles();
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setVehicles(list);
    } catch (err) {
      setVehicles([]);
      setFetchError(err.message || 'Failed to fetch vehicles');
      showToast(err.message || 'Failed to fetch vehicles', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const resetForm = () => {
    setMake('');
    setModel('');
    setYear('');
    setPlateNumber('');
    setColor('');
    setVehicleType('SEDAN');
    setIsDefault(false);
    setImages([]);
  };

  const fillForm = (v) => {
    setMake(v.make);
    setModel(v.model);
    setYear(String(v.year));
    setPlateNumber(v.plateNumber);
    setColor(v.color);
    setVehicleType(v.vehicleType);
    setIsDefault(v.isDefault);
    setImages([]);
  };

  const validateVehicleForm = () => {
    if (!make.trim() || !model.trim() || !plateNumber.trim() || !color.trim()) {
      showToast('Please fill out all required fields', 'error');
      return null;
    }
    const y = parseInt(year, 10);
    if (!y || y < 1950 || y > new Date().getFullYear() + 1) {
      showToast('Enter a valid vehicle year', 'error');
      return null;
    }
    return {
      make: make.trim(),
      model: model.trim(),
      year: y,
      plateNumber: plateNumber.trim().toUpperCase(),
      color: color.trim(),
      vehicleType,
      isDefault,
    };
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    const data = validateVehicleForm();
    if (!data) return;
    setFormLoading(true);
    try {
      await api.user.addVehicle(data);
      showToast('Vehicle added successfully!', 'success');
      setIsAdding(false);
      resetForm();
      fetchVehicles();
    } catch (err) {
      showToast(err.message || 'Failed to add vehicle', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateVehicle = async (e) => {
    e.preventDefault();
    const data = validateVehicleForm();
    if (!data) return;
    setFormLoading(true);
    try {
      await api.user.updateVehicle(editingId, data);
      showToast('Vehicle updated successfully!', 'success');
      setEditingId(null);
      resetForm();
      fetchVehicles();
    } catch (err) {
      showToast(err.message || 'Failed to update vehicle', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      await api.user.deleteVehicle(id);
      showToast('Vehicle deleted successfully', 'success');
      fetchVehicles();
    } catch (err) {
      showToast(err.message || 'Failed to delete vehicle', 'error');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await api.user.setDefaultVehicle(id);
      showToast('Default vehicle updated!', 'success');
      fetchVehicles();
    } catch (err) {
      showToast(err.message || 'Failed to set default vehicle', 'error');
    }
  };

  const handleEdit = (v) => {
    setEditingId(v.id);
    fillForm(v);
    setIsAdding(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditingId(null);
    resetForm();
  };

  const renderForm = (onSubmit) => (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h3 style={{ fontSize: '20px', color: 'var(--text-primary)', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
        {editingId ? 'Edit Vehicle' : 'Register New Vehicle'}
      </h3>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>MAKE</label>
            <input type="text" className="form-input"
            placeholder="e.g. Toyota" value={make} onChange={e => setMake(e.target.value)} required />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>MODEL</label>
            <input type="text" className="form-input"
            placeholder="e.g. Corolla" value={model} onChange={e => setModel(e.target.value)} required />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>YEAR</label>
            <input type="number" className="form-input" placeholder="e.g. 2022" value={year} onChange={e => setYear(e.target.value)} required />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>COLOR</label>
            <input type="text" className="form-input" placeholder="e.g. White" value={color} onChange={e => setColor(e.target.value)} required />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>PLATE NUMBER</label>
            <input type="text" className="form-input" placeholder="e.g. AA-1234-XX" value={plateNumber} onChange={e => setPlateNumber(e.target.value)} required />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>VEHICLE TYPE</label>
            <select className="form-input form-select" value={vehicleType} onChange={e => setVehicleType(e.target.value)} style={{ appearance: 'none', background: 'var(--bg-input)' }}>
              <option value="SEDAN" >Sedan</option>
              <option value="SUV" >SUV</option>
              <option value="TRUCK" >Truck</option>
              <option value="MOTORCYCLE" >Motorcycle</option>
              <option value="VAN" >Van</option>
              <option value="OTHER" >Other</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
          <input type="checkbox" id="isDefault" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }} />
          <label htmlFor="isDefault" style={{ fontSize: '14px', color: 'var(--text-muted)', cursor: 'pointer' }}>Set as default vehicle</label>
        </div>

        <div style={{ marginTop: '8px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
            <Image size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            VEHICLE IMAGES (optional)
          </label>
          <input
            type="file"
            multiple
            accept="image/*"
            className="form-input"
            style={{ padding: '10px', fontSize: '13px' }}
            onChange={e => setImages(Array.from(e.target.files))}
          />
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Vehicle images (optional). Note: Image upload requires multipart/form-data. The backend endpoint must be called separately with FormData.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={formLoading}>
            {formLoading ? (editingId ? 'Updating...' : 'Registering...') : (editingId ? 'Update Vehicle' : 'Register Vehicle')}
          </button>
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={editingId ? handleCancel : () => setIsAdding(false)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );

  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];

  return (
    <div style={{ animation: 'slide-in 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>My Vehicles</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
            Manage your registered vehicles for car wash services.
          </p>
        </div>
        {!editingId && (
          <button className="btn btn-primary" onClick={() => { setIsAdding(!isAdding); setEditingId(null); resetForm(); }}>
            <Plus size={18} /> {isAdding ? 'View Catalog' : 'Add Vehicle'}
          </button>
        )}
      </div>

      {isAdding && renderForm(handleAddVehicle)}

      {editingId && renderForm(handleUpdateVehicle)}

      {!isAdding && !editingId && (
        <div>
          {loading ? (
            <div className="grid-cards">
              <div className="skeleton" style={{ height: '200px', borderRadius: '16px' }}></div>
              <div className="skeleton" style={{ height: '200px', borderRadius: '16px' }}></div>
            </div>
          ) : fetchError ? (
            <div className="card" style={{
              textAlign: 'center',
              padding: '60px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Car size={48} style={{ marginBottom: '16px', color: '#ef4444' }} />
              <h3 style={{ fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>Failed to load vehicles</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px', maxWidth: '400px' }}>
                {fetchError}
              </p>
              <button className="btn btn-primary" onClick={fetchVehicles}>
                Try Again
              </button>
            </div>
          ) : safeVehicles.length === 0 ? (
            <div className="card" style={{
              textAlign: 'center',
              padding: '60px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Car size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>No vehicles registered</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px', maxWidth: '400px' }}>
                You must add at least one vehicle to your account to schedule a car wash booking.
              </p>
              <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
                <Plus size={16} /> Add Your First Vehicle
              </button>
            </div>
          ) : (
            <div className="grid-cards">
              {safeVehicles.map((v) => (
                <div key={v.id} className="card" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: v.isDefault ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                  boxShadow: 'var(--shadow-card)'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div style={{
                        padding: '10px',
                        borderRadius: '10px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border)'
                      }}>
                        <Car size={24} style={{ color: v.isDefault ? 'var(--primary)' : 'var(--text-muted)' }} />
                      </div>
                      {v.isDefault && (
                        <span className="badge badge-confirmed" style={{ gap: '4px' }}>
                          <ShieldCheck size={12} /> Default
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '22px', color: 'var(--text-primary)', marginBottom: '4px' }}>{v.make} {v.model}</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      {v.color} &bull; {v.year} &bull; {v.vehicleType}
                    </p>

                    <div style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontFamily: 'var(--font-title)',
                      fontSize: '15px',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      color: 'var(--text-primary)',
                      display: 'inline-block'
                    }}>
                      {v.plateNumber}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    {!v.isDefault && (
                      <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => handleSetDefault(v.id)}>
                        <Star size={14} /> Set Default
                      </button>
                    )}
                    <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => handleEdit(v)}>
                      <Edit2 size={14} /> Edit
                    </button>
                    <button className="btn btn-danger" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => handleDelete(v.id)}>
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
