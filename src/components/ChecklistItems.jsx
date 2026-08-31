import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Plus, Edit2, Trash2, Check, ShieldAlert, X } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext.jsx';

const FREQUENCIES = [
  { value: 'daily', label: 'Harian (Setiap Hari)' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' }
];

const DAYS_OF_WEEK = [
  { value: 'Monday', label: 'Senin' },
  { value: 'Tuesday', label: 'Selasa' },
  { value: 'Wednesday', label: 'Rabu' },
  { value: 'Thursday', label: 'Kamis' },
  { value: 'Friday', label: 'Jumat' },
  { value: 'Saturday', label: 'Sabtu' },
  { value: 'Sunday', label: 'Minggu' }
];

export default function ChecklistItems() {
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [namaItem, setNamaItem] = useState('');
  const [kategori, setKategori] = useState('');

  // Cascading Select Building States
  const [selectedKategoriBuildingId, setSelectedKategoriBuildingId] = useState('');
  const [selectedAssignBuildingId, setSelectedAssignBuildingId] = useState('');

  // Direct Assignment State
  const [rooms, setRooms] = useState([]);
  const [allShifts, setAllShifts] = useState([]);
  const [assignDirectly, setAssignDirectly] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [availableShifts, setAvailableShifts] = useState([]);
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [dayOfWeek, setDayOfWeek] = useState('Monday');
  const [dayOfMonth, setDayOfMonth] = useState('1');

  // Derive unique buildings list from rooms data
  const buildingsList = React.useMemo(() => {
    const bMap = new Map();
    rooms.forEach(r => {
      if (r.building) {
        bMap.set(r.building.id, r.building);
      }
    });
    return Array.from(bMap.values());
  }, [rooms]);

  const fetchItems = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const response = await api.get('/checklist-items?per_page=1000');
      if (response.success) {
        setItems(response.data.data || response.data || []);
      }
    } catch (err) {
      if (showLoading) setError(err.message || 'Gagal memuat item checklist.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await api.get('/rooms?is_active=true&per_page=1000', { lookup: true });
      if (response.success) {
        setRooms(response.data.data || response.data || []);
      }
    } catch (err) {
      console.error('Gagal memuat daftar ruangan:', err);
    }
  };

  const fetchAllShifts = async () => {
    try {
      const response = await api.get('/shifts', { lookup: true });
      if (response.success) {
        const shifts = response.data.data || response.data || [];
        setAllShifts(shifts);
      }
    } catch (err) {
      console.error('Gagal memuat daftar shift:', err);
    }
  };

  useEffect(() => {
    fetchItems(true);
    fetchRooms();
    fetchAllShifts();
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

  // Sync category state when rooms array loads
  useEffect(() => {
    if (rooms.length > 0 && !editingItem) {
      const firstBuilding = buildingsList[0];
      if (firstBuilding && !selectedKategoriBuildingId) {
        setSelectedKategoriBuildingId(firstBuilding.id);
        const firstRoomOfBuilding = rooms.find(r => r.building?.id === firstBuilding.id);
        if (firstRoomOfBuilding && !kategori) {
          setKategori(firstRoomOfBuilding.name);
        }
      } else if (!kategori) {
        setKategori('Lainnya');
      }
    }
  }, [rooms, buildingsList, selectedKategoriBuildingId, kategori, editingItem]);

  // Filter shifts when room changes — fallback to all shifts if building has none assigned
  useEffect(() => {
    if (!selectedRoomId) {
      setAvailableShifts([]);
      setSelectedShiftId('');
      return;
    }

    const room = rooms.find(r => r.id === selectedRoomId);
    if (!room) {
      setAvailableShifts([]);
      setSelectedShiftId('');
      return;
    }

    const buildingShifts = room.building?.shifts || [];
    if (buildingShifts.length > 0) {
      setAvailableShifts(buildingShifts);
      setSelectedShiftId(buildingShifts[0]?.id || '');
    } else {
      setAvailableShifts(allShifts);
      setSelectedShiftId(allShifts[0]?.id || '');
    }
  }, [selectedRoomId, rooms, allShifts]);

  const handleOpenNewForm = () => {
    setEditingItem(null);
    setNamaItem('');
    
    // Auto-select first room from first building if available
    const firstBuilding = buildingsList[0];
    if (firstBuilding) {
      setSelectedKategoriBuildingId(firstBuilding.id);
      const firstRoomOfBuilding = rooms.find(r => r.building?.id === firstBuilding.id);
      setKategori(firstRoomOfBuilding ? firstRoomOfBuilding.name : (rooms[0]?.name || 'Lainnya'));
    } else {
      setSelectedKategoriBuildingId('Lainnya');
      setKategori(rooms[0]?.name || 'Lainnya');
    }

    setAssignDirectly(false);
    setSelectedAssignBuildingId(firstBuilding ? firstBuilding.id : '');
    setSelectedRoomId(rooms[0]?.id || '');
    setFrequency('daily');
    setDayOfWeek('Monday');
    setDayOfMonth('1');
    setShowForm(true);
  };

  const handleOpenEditForm = (item) => {
    setEditingItem(item);
    setNamaItem(item.nama_item);
    
    // Detect which building this category belongs to
    const matchingRoom = rooms.find(r => r.name === item.kategori);
    if (matchingRoom && matchingRoom.building) {
      setSelectedKategoriBuildingId(matchingRoom.building.id);
      setKategori(item.kategori);
    } else {
      setSelectedKategoriBuildingId('Lainnya');
      setKategori(item.kategori || 'Lainnya');
    }
    
    setAssignDirectly(false);
    setSelectedAssignBuildingId('');
    setSelectedRoomId('');
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const payload = {
      nama_item: namaItem,
      kategori: kategori
    };

    try {
      let response;
      if (editingItem) {
        response = await api.put(`/checklist-items/${editingItem.id}`, payload);
      } else {
        response = await api.post('/checklist-items', payload);
      }

      if (response.success) {
        const createdItem = response.data?.data || response.data;
        const itemId = createdItem?.id;

        if (createdItem && itemId) {
          if (editingItem) {
            setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...createdItem } : i));
          } else {
            setItems(prev => [createdItem, ...prev]);
          }
        }

        // Automatically assign checklist item to the room via a schedule if checked
        if (assignDirectly && itemId && !editingItem) {
          const frequencyMap = {
            daily: 'harian',
            weekly: 'mingguan',
            monthly: 'bulanan'
          };

          const schedulePayload = {
            room_id: selectedRoomId,
            checklist_item_id: itemId,
            shift_id: parseInt(selectedShiftId),
            frekuensi: frequencyMap[frequency] || frequency
          };

          if (frequency === 'weekly') {
            const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
            schedulePayload.hari_minggu = dayMap[dayOfWeek];
          } else if (frequency === 'monthly') {
            schedulePayload.tanggal_bulan = parseInt(dayOfMonth);
          }

          await api.post('/schedules', schedulePayload);
        }

        setSuccessMsg(editingItem ? 'Item checklist berhasil diperbarui.' : 'Item checklist baru berhasil ditambahkan.');
        setShowForm(false);
        setEditingItem(null);
        fetchItems(false);
      }
    } catch (err) {
      if (err.errors) {
        setError(Object.values(err.errors).flat().join(' '));
      } else {
        setError(err.message || 'Terjadi kesalahan saat menyimpan.');
      }
    }
  };

  const handleDelete = async (id) => {
    if (!(await confirm({
      title: 'Hapus Item Checklist Secara Permanen',
      message: 'Apakah Anda yakin ingin menghapus item checklist ini secara permanen? Semua jadwal (schedules), tugas (tasks), hasil checklist (results), dan verifikasi terkait juga akan ikut terhapus.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger'
    }))) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await api.delete(`/checklist-items/${id}`);
      if (response.success) {
        setItems(prev => prev.filter(i => i.id !== id));
        setSuccessMsg('Item checklist berhasil dihapus sepenuhnya.');
        fetchItems(false);
      }
    } catch (err) {
      setError(err.message || 'Gagal menghapus item checklist.');
    }
  };

  return (
    <div>
      <div className="flex-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>Kelola Item Checklist</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manajemen daftar standar pemeriksaan kebersihan ruangan</p>
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={handleOpenNewForm}>
            <Plus size={16} /> Tambah Item Checklist
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
            style={{ maxWidth: '680px', width: '92vw', maxHeight: '88vh', overflowY: 'auto', padding: '28px', borderRadius: 'var(--radius-2xl)', background: '#ffffff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {editingItem ? 'Edit Data Item' : 'Tambah Item Checklist'}
                </span>
                <h2 className="modal-title" style={{ marginTop: '2px' }}>
                  {editingItem ? 'Edit Item Checklist' : 'Tambah Item Checklist Baru'}
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
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Nama Item Checklist Kebersihan *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={namaItem} 
                    onChange={(e) => setNamaItem(e.target.value)} 
                    placeholder="Contoh: Bersihkan bak sampah & ganti plastik, Pel lantai koridor"
                    required 
                  />
                </div>
                
                <div className="grid-2-cols" style={{ gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Gedung Penempatan *</label>
                    <select
                      className="form-control form-select"
                      value={selectedKategoriBuildingId}
                      onChange={(e) => {
                        const bId = e.target.value;
                        setSelectedKategoriBuildingId(bId);
                        if (bId === 'Lainnya') {
                          setKategori('Lainnya');
                        } else {
                          const firstRoomOfB = rooms.find(r => r.building?.id === bId);
                          setKategori(firstRoomOfB?.name || '');
                        }
                      }}
                      required
                    >
                      <option value="" disabled>Pilih Gedung</option>
                      {buildingsList.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                      <option value="Lainnya">Lainnya / Umum</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Kategori Ruangan *</label>
                    <select 
                      className="form-control form-select"
                      value={kategori}
                      onChange={(e) => setKategori(e.target.value)}
                      required
                      disabled={selectedKategoriBuildingId === 'Lainnya'}
                    >
                      <option value="" disabled>Pilih Ruangan</option>
                      {selectedKategoriBuildingId === 'Lainnya' ? (
                        <option value="Lainnya">Lainnya / Umum</option>
                      ) : (
                        rooms
                          .filter(r => r.building?.id === selectedKategoriBuildingId)
                          .map(r => (
                            <option key={r.id} value={r.name}>{r.name} ({r.code})</option>
                          ))
                      )}
                      {selectedKategoriBuildingId === 'Lainnya' && kategori && kategori !== 'Lainnya' && (
                        <option value={kategori}>{kategori}</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* DIRECT ROOM ASSIGNMENT SECTION (Only for New Items) */}
                {!editingItem && (
                  <div style={{ marginTop: '6px', background: 'rgba(14, 49, 146, 0.02)', border: '1px solid rgba(14, 49, 146, 0.1)', padding: '16px', borderRadius: 'var(--radius-xl)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, color: 'var(--primary)' }}>
                      <input 
                        type="checkbox" 
                        checked={assignDirectly} 
                        onChange={(e) => setAssignDirectly(e.target.checked)} 
                        style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                      />
                      <span>Tugaskan langsung ke ruangan (Buat Jadwal Rutin)</span>
                    </label>

                    {assignDirectly && (
                      <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="grid-3-cols" style={{ gap: '10px' }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Gedung</label>
                            <select 
                              className="form-control form-select"
                              value={selectedAssignBuildingId}
                              onChange={(e) => {
                                setSelectedAssignBuildingId(e.target.value);
                                setSelectedRoomId('');
                              }}
                              required={assignDirectly}
                            >
                              <option value="" disabled>Pilih Gedung</option>
                              {buildingsList.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Ruangan</label>
                            <select 
                              className="form-control form-select"
                              value={selectedRoomId}
                              onChange={(e) => setSelectedRoomId(e.target.value)}
                              required={assignDirectly}
                              disabled={!selectedAssignBuildingId}
                            >
                              <option value="" disabled>{selectedAssignBuildingId ? 'Pilih Ruangan' : 'Pilih gedung dulu'}</option>
                              {rooms
                                .filter(r => r.building?.id === selectedAssignBuildingId)
                                .map(r => (
                                  <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                                ))}
                            </select>
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Shift Kerja</label>
                            <select 
                              className="form-control form-select"
                              value={selectedShiftId}
                              onChange={(e) => setSelectedShiftId(e.target.value)}
                              required={assignDirectly}
                              disabled={!selectedRoomId || availableShifts.length === 0}
                            >
                              {!selectedRoomId ? (
                                <option value="">Pilih ruangan dulu</option>
                              ) : availableShifts.length === 0 ? (
                                <option value="">Tidak ada shift</option>
                              ) : (
                                availableShifts.map(s => (
                                  <option key={s.id} value={s.id}>{s.name} ({s.start_time.substring(0,5)} - {s.end_time.substring(0,5)})</option>
                                ))
                              )}
                            </select>
                          </div>
                        </div>

                        <div className="grid-2-cols" style={{ gap: '10px' }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Frekuensi Pengerjaan</label>
                            <select 
                              className="form-control form-select"
                              value={frequency}
                              onChange={(e) => setFrequency(e.target.value)}
                              required={assignDirectly}
                            >
                              {FREQUENCIES.map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                              ))}
                            </select>
                          </div>

                          {frequency === 'weekly' && (
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Hari Kerja</label>
                              <select 
                                className="form-control form-select"
                                value={dayOfWeek}
                                onChange={(e) => setDayOfWeek(e.target.value)}
                                required={assignDirectly}
                              >
                                {DAYS_OF_WEEK.map(d => (
                                  <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {frequency === 'monthly' && (
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Tanggal Bulanan (1-31)</label>
                              <input 
                                type="number" 
                                className="form-control" 
                                value={dayOfMonth}
                                onChange={(e) => setDayOfMonth(e.target.value)}
                                min="1"
                                max="31"
                                required={assignDirectly}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={assignDirectly && (!selectedRoomId || !selectedShiftId)} style={{ fontWeight: 700 }}>
                  ✓ Simpan Item Checklist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIST ITEMS */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Checklist</th>
                <th>Kategori</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600, maxWidth: '240px' }}>{item.nama_item}</td>
                  <td>
                    <span className="role-badge role-cs" style={{ textTransform: 'capitalize' }}>
                      {item.kategori?.replace('_', ' ') || '-'}
                    </span>
                  </td>
                  <td>
                    <span className={`role-badge ${item.is_active ? 'role-pic' : 'role-admin'}`}>
                      {item.is_active ? 'Aktif' : 'Non-aktif'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleOpenEditForm(item)}
                        style={{ padding: '6px' }}
                        title="Edit Item"
                        aria-label={`Edit item ${item.name}`}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleDelete(item.id)}
                        style={{ padding: '6px', color: 'var(--danger)' }}
                        title="Hapus Permanen"
                        aria-label={`Hapus permanen item ${item.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada item checklist tersedia.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
