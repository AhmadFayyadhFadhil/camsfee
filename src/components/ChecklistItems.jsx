import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Plus, Edit2, Trash2, Check, ShieldAlert } from 'lucide-react';
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

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/checklist-items?per_page=1000');
      if (response.success) {
        setItems(response.data.data || response.data || []);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat item checklist.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await api.get('/rooms?is_active=true&per_page=1000');
      if (response.success) {
        setRooms(response.data.data || response.data || []);
      }
    } catch (err) {
      console.error('Gagal memuat daftar ruangan:', err);
    }
  };

  const fetchAllShifts = async () => {
    try {
      const response = await api.get('/shifts');
      if (response.success) {
        const shifts = response.data.data || response.data || [];
        setAllShifts(shifts);
      }
    } catch (err) {
      console.error('Gagal memuat daftar shift:', err);
    }
  };

  useEffect(() => {
    fetchItems();
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
    const selectedRoom = rooms.find(r => r.id === selectedRoomId);
    const buildingShifts = selectedRoom?.building?.shifts;
    
    if (buildingShifts && buildingShifts.length > 0) {
      setAvailableShifts(buildingShifts);
      setSelectedShiftId(buildingShifts[0]?.id || '');
    } else {
      // Fallback: use all active shifts if building has none specifically assigned
      setAvailableShifts(allShifts);
      setSelectedShiftId(allShifts[0]?.id || '');
    }
  }, [selectedRoomId, rooms, allShifts]);

  const handleOpenNewForm = () => {
    setEditingItem(null);
    setNamaItem('');
    
    const firstBuilding = buildingsList[0];
    if (firstBuilding) {
      setSelectedKategoriBuildingId(firstBuilding.id);
      const firstRoomOfBuilding = rooms.find(r => r.building?.id === firstBuilding.id);
      setKategori(firstRoomOfBuilding?.name || 'Lainnya');
    } else {
      setSelectedKategoriBuildingId('');
      setKategori('Lainnya');
    }
    
    setAssignDirectly(false);
    setSelectedAssignBuildingId('');
    setSelectedRoomId('');
    setShowForm(true);
  };

  const handleOpenEditForm = (item) => {
    setEditingItem(item);
    setNamaItem(item.nama_item);
    
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
        fetchItems();
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
        setSuccessMsg('Item checklist berhasil dihapus sepenuhnya beserta seluruh data terkait.');
        fetchItems();
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

      {/* CREATE/EDIT FORM */}
      {showForm && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-md)', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>
            {editingItem ? 'Edit Item Checklist' : 'Tambah Item Checklist Baru'}
          </h2>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nama Item Checklist</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={namaItem} 
                  onChange={(e) => setNamaItem(e.target.value)} 
                  placeholder="Contoh: Bersihkan bak sampah & ganti plastik"
                  required 
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Pilih Gedung</label>
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

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Kategori (Ruangan)</label>
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
              <div style={{ marginTop: '10px', marginBottom: '20px', borderTop: '1px dashed var(--border-color)', paddingTop: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                  <input 
                    type="checkbox" 
                    checked={assignDirectly} 
                    onChange={(e) => setAssignDirectly(e.target.checked)} 
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Tugaskan langsung ke ruangan (Buat Jadwal Master)</span>
                </label>

                {assignDirectly && (
                  <div className="glass-panel" style={{ marginTop: '12px', padding: '16px', background: 'rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Pilih Gedung</label>
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

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Pilih Ruangan</label>
                        <select 
                          className="form-control form-select"
                          value={selectedRoomId}
                          onChange={(e) => setSelectedRoomId(e.target.value)}
                          required={assignDirectly}
                          disabled={!selectedAssignBuildingId}
                        >
                          <option value="" disabled>{selectedAssignBuildingId ? 'Pilih Ruangan' : 'Pilih gedung terlebih dahulu'}</option>
                          {rooms
                            .filter(r => r.building?.id === selectedAssignBuildingId)
                            .map(r => (
                              <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                            ))}
                        </select>
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Pilih Shift Kerja</label>
                        <select 
                          className="form-control form-select"
                          value={selectedShiftId}
                          onChange={(e) => setSelectedShiftId(e.target.value)}
                          required={assignDirectly}
                          disabled={!selectedRoomId || availableShifts.length === 0}
                        >
                          {!selectedRoomId ? (
                            <option value="">Pilih ruangan terlebih dahulu</option>
                          ) : availableShifts.length === 0 ? (
                            <option value="">Tidak ada shift tersedia</option>
                          ) : (
                            availableShifts.map(s => (
                              <option key={s.id} value={s.id}>{s.name} ({s.start_time.substring(0,5)} - {s.end_time.substring(0,5)})</option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="grid-2-cols" style={{ gap: '15px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Frekuensi</label>
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
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Hari Kerja</label>
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
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Tanggal Bulanan (1-31)</label>
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

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="submit" className="btn btn-primary" disabled={assignDirectly && (!selectedRoomId || !selectedShiftId)}>Simpan</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
            </div>
          </form>
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
