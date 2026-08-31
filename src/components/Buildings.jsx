import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { SHIFTS } from '../utils/constants';
import { Building, Plus, Edit2, Trash2, Check, X, ShieldAlert, Layers } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext.jsx';

export default function Buildings() {
  const confirm = useConfirm();
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  
  // Form State
  const [editingBuilding, setEditingBuilding] = useState(null); // null for new, building object for edit
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  
  // Shift assignment state
  const [assigningShiftsBuilding, setAssigningShiftsBuilding] = useState(null);
  const [selectedShiftIds, setSelectedShiftIds] = useState([]);

  const fetchBuildings = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const response = await api.get('/buildings?per_page=1000');
      if (response.success) {
        setBuildings(response.data.data || response.data || []);
      }
    } catch (err) {
      if (showLoading) setError(err.message || 'Gagal memuat data gedung.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuildings(true);
  }, []);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleOpenNewForm = () => {
    setEditingBuilding(null);
    setName('');
    setCode('');
    setDescription('');
    setShowForm(true);
    setAssigningShiftsBuilding(null);
  };

  const handleOpenEditForm = (building) => {
    setEditingBuilding(building);
    setName(building.name);
    setCode(building.code);
    setDescription(building.description || '');
    setShowForm(true);
    setAssigningShiftsBuilding(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const payload = { name, code, description };
    try {
      let response;
      if (editingBuilding) {
        response = await api.put(`/buildings/${editingBuilding.id}`, payload);
      } else {
        response = await api.post('/buildings', payload);
      }

      if (response.success) {
        const savedBld = response.data;
        if (savedBld && savedBld.id) {
          if (editingBuilding) {
            setBuildings(prev => prev.map(b => b.id === editingBuilding.id ? { ...b, ...savedBld } : b));
          } else {
            setBuildings(prev => [savedBld, ...prev]);
          }
        }
        setSuccessMsg(editingBuilding ? 'Gedung berhasil diperbarui.' : 'Gedung baru berhasil ditambahkan.');
        setShowForm(false);
        setEditingBuilding(null);
        fetchBuildings(false);
      }
    } catch (err) {
      if (err.errors) {
        setError(Object.values(err.errors).flat().join(' '));
      } else {
        setError(err.message || 'Terjadi kesalahan saat menyimpan data.');
      }
    }
  };

  const handleDeactivate = async (id) => {
    if (!(await confirm({
      title: 'Hapus Gedung Secara Permanen',
      message: 'Apakah Anda yakin ingin menghapus gedung ini secara permanen? Semua data ruangan, jadwal, dan tugas terkait di dalam gedung ini juga akan ikut terhapus.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger'
    }))) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await api.delete(`/buildings/${id}`);
      if (response.success) {
        setBuildings(prev => prev.filter(b => b.id !== id));
        setSuccessMsg('Gedung berhasil dihapus sepenuhnya.');
        fetchBuildings(false);
      }
    } catch (err) {
      setError(err.message || 'Gagal menghapus gedung.');
    }
  };

  const handleOpenAssignShifts = (building) => {
    setAssigningShiftsBuilding(building);
    const activeShifts = building.shifts || [];
    setSelectedShiftIds(activeShifts.map(s => s.id));
    setShowForm(false);
  };

  const handleShiftCheckboxChange = (shiftId) => {
    if (selectedShiftIds.includes(shiftId)) {
      setSelectedShiftIds(selectedShiftIds.filter(id => id !== shiftId));
    } else {
      setSelectedShiftIds([...selectedShiftIds, shiftId]);
    }
  };

  const handleSaveShifts = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await api.post(`/buildings/${assigningShiftsBuilding.id}/shifts`, {
        shift_ids: selectedShiftIds
      });
      if (response.success) {
        setSuccessMsg('Shift berhasil dikaitkan dengan gedung.');
        setAssigningShiftsBuilding(null);
        fetchBuildings(false);
      }
    } catch (err) {
      setError(err.message || 'Gagal mengaitkan shift.');
    }
  };

  return (
    <div>
      <div className="flex-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>Kelola Gedung</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manajemen gedung operasional dan pengaturan shift aktif</p>
        </div>
        {!showForm && !assigningShiftsBuilding && (
          <button className="btn btn-primary" onClick={handleOpenNewForm}>
            <Plus size={16} /> Tambah Gedung
          </button>
        )}
      </div>

      {successMsg && (
        <div className="alert alert-success">
          <Check size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* CREATE/EDIT FORM (Floating Pop-up) */}
      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div 
            className="glass-panel" 
            style={{ maxWidth: '580px', width: '92vw', maxHeight: '88vh', overflowY: 'auto', padding: '28px', borderRadius: 'var(--radius-2xl)', background: '#ffffff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {editingBuilding ? 'Edit Data Gedung' : 'Tambah Gedung'}
                </span>
                <h2 className="modal-title" style={{ marginTop: '2px' }}>
                  {editingBuilding ? 'Edit Gedung' : 'Tambah Gedung Baru'}
                </h2>
              </div>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => setShowForm(false)}
                title="Tutup formulir"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="grid-2-cols" style={{ gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Nama Gedung *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="Contoh: Gedung Produksi Utama"
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Kode Gedung (Unik) *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={code} 
                      onChange={(e) => setCode(e.target.value)} 
                      placeholder="Contoh: GDU"
                      disabled={!!editingBuilding}
                      required 
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Deskripsi / Catatan Lokasi</label>
                  <textarea 
                    className="form-control" 
                    rows="3"
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Tulis detail gedung atau catatan khusus..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>
                  ✓ Simpan Gedung
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHIFT ALLOCATION FORM (Floating Pop-up) */}
      {assigningShiftsBuilding && (
        <div className="modal-backdrop" onClick={() => setAssigningShiftsBuilding(null)}>
          <div 
            className="glass-panel" 
            style={{ maxWidth: '520px', width: '92vw', maxHeight: '88vh', overflowY: 'auto', padding: '28px', borderRadius: 'var(--radius-2xl)', background: '#ffffff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Alokasi Shift Operasional
                </span>
                <h2 className="modal-title" style={{ marginTop: '2px' }}>
                  Gedung: {assigningShiftsBuilding.name}
                </h2>
              </div>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => setAssigningShiftsBuilding(null)}
                title="Tutup formulir"
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Pilih shift kerja yang berlaku aktif di dalam gedung ini:
            </p>
            <form onSubmit={handleSaveShifts}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {SHIFTS.map(shift => (
                  <label 
                    key={shift.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      padding: '12px 14px', 
                      background: selectedShiftIds.includes(shift.id) ? 'rgba(14, 49, 146, 0.05)' : 'rgba(0,0,0,0.02)', 
                      border: selectedShiftIds.includes(shift.id) ? '1.5px solid var(--primary)' : '1px solid var(--border-color)', 
                      borderRadius: 'var(--radius-lg)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={selectedShiftIds.includes(shift.id)} 
                      onChange={() => handleShiftCheckboxChange(shift.id)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: selectedShiftIds.includes(shift.id) ? 'var(--primary)' : 'var(--text-primary)' }}>{shift.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Jam Kerja: {shift.time}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAssigningShiftsBuilding(null)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>
                  ✓ Simpan Alokasi Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIST BUILDINGS */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Gedung</th>
                <th>Kode</th>
                <th>Deskripsi</th>
                <th>Shift Aktif</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {buildings.map(b => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 600 }}>{b.name}</td>
                  <td><code>{b.code}</code></td>
                  <td style={{ color: 'var(--text-secondary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.description || '-'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {b.shifts && b.shifts.length > 0 ? (
                        b.shifts.map(s => (
                          <span key={s.id} style={{ fontSize: '0.75rem', background: 'rgba(20, 184, 166, 0.1)', color: 'var(--secondary)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(20, 184, 166, 0.2)' }}>
                            {s.name}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', italic: 'true' }}>Belum ada shift</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge ${b.is_active ? 'role-cs' : 'role-admin'}`}>
                      {b.is_active ? 'Aktif' : 'Non-aktif'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleOpenEditForm(b)}
                        style={{ padding: '6px' }}
                        title="Edit Gedung"
                        aria-label={`Edit gedung ${b.name}`}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleOpenAssignShifts(b)}
                        style={{ padding: '6px', color: 'var(--secondary)' }}
                        title="Alokasikan Shift"
                        aria-label={`Alokasikan shift untuk gedung ${b.name}`}
                      >
                        <Layers size={14} />
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleDeactivate(b.id)}
                        style={{ padding: '6px', color: 'var(--danger)' }}
                        title="Hapus Permanen"
                        aria-label={`Hapus permanen gedung ${b.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {buildings.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada data gedung tersedia.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
