import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { FREQUENCIES, DAYS_OF_WEEK } from '../utils/constants';
import { Calendar, Plus, Trash2, Check, X, ShieldAlert, Clock, User, Clipboard, Sliders } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext.jsx';

export default function Schedules() {
  const confirm = useConfirm();
  const [activeSubTab, setActiveSubTab] = useState('schedules'); // 'schedules' or 'assignments'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Lookups
  const [rooms, setRooms] = useState([]);
  const [csUsers, setCsUsers] = useState([]);
  const [schedulesList, setSchedulesList] = useState([]);
  const [assignmentsList, setAssignmentsList] = useState([]);
  const [checklistItems, setChecklistItems] = useState([]);
  const [allShifts, setAllShifts] = useState([]);

  // Form Schedules State
  const [selectedChecklistItemId, setSelectedChecklistItemId] = useState('');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [availableShifts, setAvailableShifts] = useState([]); // Filtered by building
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('');

  // Form Assignments State
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [selectedCsId, setSelectedCsId] = useState('');
  const [buildings, setBuildings] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedAssignmentShiftId, setSelectedAssignmentShiftId] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState(new Date().toISOString().split('T')[0]);
  const [tanggalSelesai, setTanggalSelesai] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [roomsRes, usersRes, schedsRes, assignsRes, checklistItemsRes, shiftsRes, buildingsRes] = await Promise.all([
        api.get('/rooms?is_active=true&per_page=1000'),
        api.get('/users?per_page=1000'),
        api.get('/schedules?is_active=true&per_page=1000'),
        api.get('/cs-assignments?per_page=1000'),
        api.get('/checklist-items?is_active=true&per_page=1000'),
        api.get('/shifts?per_page=1000'),
        api.get('/buildings?is_active=true&per_page=1000')
      ]);

      if (roomsRes.success) setRooms(roomsRes.data.data || roomsRes.data || []);
      if (schedsRes.success) setSchedulesList(schedsRes.data.data || schedsRes.data || []);
      if (assignsRes.success) setAssignmentsList(assignsRes.data.data || assignsRes.data || []);
      if (checklistItemsRes.success) setChecklistItems(checklistItemsRes.data.data || checklistItemsRes.data || []);
      if (shiftsRes.success) setAllShifts(shiftsRes.data.data || shiftsRes.data || []);
      if (buildingsRes.success) setBuildings(buildingsRes.data.data || buildingsRes.data || []);

      if (usersRes.success) {
        const allUsers = usersRes.data.data || usersRes.data || [];
        const csList = allUsers.filter(u => u.roles && u.roles.includes('cleaning_service'));
        setCsUsers(csList);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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

  // When room is selected in Schedule form, filter shifts allocated to its building
  // Fallback to all active shifts if building has no shifts assigned
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
      // Fallback: use all shifts
      setAvailableShifts(allShifts);
      setSelectedShiftId(allShifts[0]?.id || '');
    }
  }, [selectedRoomId, rooms, allShifts]);

  const handleOpenScheduleForm = () => {
    setSelectedRoomId(rooms[0]?.id || '');
    setSelectedChecklistItemId(checklistItems[0]?.id || '');
    setFrequency('daily');
    setDayOfWeek('Monday');
    setDayOfMonth('1');
    setShowScheduleForm(true);
    setShowAssignmentForm(false);
  };

  const handleOpenAssignmentForm = () => {
    setSelectedCsId(csUsers[0]?.id || '');
    setSelectedBuildingId(buildings[0]?.id || '');
    setSelectedAssignmentShiftId('');
    setTanggalMulai(new Date().toISOString().split('T')[0]);
    setTanggalSelesai('');
    setShowAssignmentForm(true);
    setShowScheduleForm(false);
  };
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const frequencyMap = {
      daily: 'harian',
      weekly: 'mingguan',
      monthly: 'bulanan'
    };

    const payload = {
      room_id: selectedRoomId,
      checklist_item_id: selectedChecklistItemId,
      shift_id: parseInt(selectedShiftId),
      frekuensi: frequencyMap[frequency] || frequency
    };

    if (frequency === 'weekly') {
      const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
      payload.hari_minggu = dayMap[dayOfWeek];
    } else if (frequency === 'monthly') {
      payload.tanggal_bulan = parseInt(dayOfMonth);
    }

    try {
      const response = await api.post('/schedules', payload);
      if (response.success) {
        setSuccessMsg('Jadwal pembersihan baru berhasil dibuat.');
        setShowScheduleForm(false);
        fetchData();
      }
    } catch (err) {
      if (err.errors) {
        setError(Object.values(err.errors).flat().join(' '));
      } else {
        setError(err.message || 'Gagal menyimpan jadwal.');
      }
    }
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const payload = {
      cs_user_id: selectedCsId,
      building_id: selectedBuildingId,
      shift_id: selectedAssignmentShiftId ? parseInt(selectedAssignmentShiftId) : null,
      tanggal_mulai: tanggalMulai,
      tanggal_selesai: tanggalSelesai || null
    };

    try {
      const response = await api.post('/cs-assignments', payload);
      if (response.success) {
        setSuccessMsg('Petugas CS berhasil ditugaskan ke gedung.');
        setShowAssignmentForm(false);
        fetchData();
      }
    } catch (err) {
      if (err.errors) {
        setError(Object.values(err.errors).flat().join(' '));
      } else {
        setError(err.message || 'Gagal menyimpan penugasan.');
      }
    }
  };

  const handleDeactivateSchedule = async (id) => {
    if (!(await confirm({
      title: 'Nonaktifkan Jadwal',
      message: 'Apakah Anda yakin ingin menonaktifkan jadwal ini?',
      confirmText: 'Ya, Nonaktifkan',
      cancelText: 'Batal',
      type: 'warning'
    }))) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await api.delete(`/schedules/${id}`);
      if (response.success) {
        setSuccessMsg('Jadwal berhasil dinonaktifkan.');
        fetchData();
      }
    } catch (err) {
      setError(err.message || 'Gagal menonaktifkan jadwal.');
    }
  };

  const handleDeleteAssignment = async (id) => {
    if (!(await confirm({
      title: 'Hapus Penugasan CS',
      message: 'Apakah Anda yakin ingin menghapus penugasan CS ini?',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger'
    }))) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await api.delete(`/cs-assignments/${id}`);
      if (response.success) {
        setSuccessMsg('Penugasan CS berhasil dihapus.');
        fetchData();
      }
    } catch (err) {
      setError(err.message || 'Gagal menghapus penugasan.');
    }
  };

  return (
    <div>
      <div className="flex-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>Jadwal & Penugasan CS</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manajemen frekuensi pembersihan ruangan dan pembagian tugas harian staf CS</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <button 
          className={`btn ${activeSubTab === 'schedules' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveSubTab('schedules'); setShowScheduleForm(false); setShowAssignmentForm(false); setError(null); setSuccessMsg(null); }}
        >
          <Clock size={16} /> Master Jadwal
        </button>
        <button 
          className={`btn ${activeSubTab === 'assignments' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveSubTab('assignments'); setShowScheduleForm(false); setShowAssignmentForm(false); setError(null); setSuccessMsg(null); }}
        >
          <Calendar size={16} /> Penugasan Harian CS
        </button>
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

      {/* CREATE SCHEDULE FORM */}
      {showScheduleForm && activeSubTab === 'schedules' && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-md)', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Buat Jadwal Pembersihan Baru</h2>
          <form onSubmit={handleSaveSchedule}>
            <div className="grid-2-cols">
              <div className="form-group">
                <label className="form-label">Pilih Ruangan</label>
                <select 
                  className="form-control form-select"
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  required
                >
                  <option value="" disabled>Pilih Ruangan</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.code}) - Gedung {r.building?.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Pilih Shift Kerja</label>
                <select 
                  className="form-control form-select"
                  value={selectedShiftId}
                  onChange={(e) => setSelectedShiftId(e.target.value)}
                  required
                  disabled={availableShifts.length === 0}
                >
                  {availableShifts.length === 0 ? (
                    <option value="">Pilih ruangan terlebih dahulu</option>
                  ) : (
                    availableShifts.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.start_time.substring(0,5)} - {s.end_time.substring(0,5)})</option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Pilih Item Checklist</label>
              <select 
                className="form-control form-select"
                value={selectedChecklistItemId}
                onChange={(e) => setSelectedChecklistItemId(e.target.value)}
                required
              >
                <option value="" disabled>Pilih Item Checklist</option>
                {checklistItems.map(item => (
                  <option key={item.id} value={item.id}>{item.nama_item} ({item.kategori})</option>
                ))}
              </select>
            </div>

            <div className="grid-2-cols">
              <div className="form-group">
                <label className="form-label">Frekuensi Pembersihan</label>
                <select 
                  className="form-control form-select"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  required
                >
                  {FREQUENCIES.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              {frequency === 'weekly' && (
                <div className="form-group">
                  <label className="form-label">Hari dalam Seminggu</label>
                  <select 
                    className="form-control form-select"
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value)}
                    required
                  >
                    {DAYS_OF_WEEK.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {frequency === 'monthly' && (
                <div className="form-group">
                  <label className="form-label">Tanggal dalam Sebulan (1-31)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    min="1"
                    max="31"
                    required
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button type="submit" className="btn btn-primary" disabled={availableShifts.length === 0 || !selectedChecklistItemId}>Simpan</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowScheduleForm(false)}>Batal</button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE ASSIGNMENT FORM */}
      {showAssignmentForm && activeSubTab === 'assignments' && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-md)', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Tugaskan Cleaning Service Baru</h2>
          <form onSubmit={handleSaveAssignment}>
            <div className="grid-3-cols" style={{ marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label">Petugas CS</label>
                <select 
                  className="form-control form-select"
                  value={selectedCsId}
                  onChange={(e) => setSelectedCsId(e.target.value)}
                  required
                >
                  <option value="" disabled>Pilih Petugas CS</option>
                  {csUsers.map(cs => (
                    <option key={cs.id} value={cs.id}>{cs.name} ({cs.email})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Pilih Gedung</label>
                <select 
                  className="form-control form-select"
                  value={selectedBuildingId}
                  onChange={(e) => setSelectedBuildingId(e.target.value)}
                  required
                >
                  <option value="" disabled>Pilih Gedung</option>
                  {buildings.map(b => (
                    <option key={b.id} value={b.id}>{b.nama_gedung} ({b.kode_gedung})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Pilih Shift Kerja (Opsional)</label>
                <select 
                  className="form-control form-select"
                  value={selectedAssignmentShiftId}
                  onChange={(e) => setSelectedAssignmentShiftId(e.target.value)}
                >
                  <option value="">Semua Shift (Otomatis)</option>
                  {allShifts.map(s => (
                    <option key={s.id} value={s.id}>{s.nama_shift || s.name} ({s.jam_mulai ? s.jam_mulai.substring(0, 5) : s.start_time.substring(0, 5)} - {s.jam_selesai ? s.jam_selesai.substring(0, 5) : s.end_time.substring(0, 5)})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-2-cols" style={{ marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label">Tanggal Mulai</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={tanggalMulai}
                  onChange={(e) => setTanggalMulai(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tanggal Selesai (Opsional)</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={tanggalSelesai}
                  onChange={(e) => setTanggalSelesai(e.target.value)}
                  min={tanggalMulai}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button type="submit" className="btn btn-primary" disabled={buildings.length === 0 || csUsers.length === 0}>Simpan</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAssignmentForm(false)}>Batal</button>
            </div>
          </form>
        </div>
      )}

      {/* MASTER SCHEDULES VIEW */}
      {activeSubTab === 'schedules' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Daftar Jadwal Induk (Schedules)</h2>
            {!showScheduleForm && (
              <button className="btn btn-primary btn-sm" onClick={handleOpenScheduleForm}>
                <Plus size={14} /> Buat Jadwal Baru
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <div className="spinner"></div>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ruangan</th>
                    <th>Item Checklist</th>
                    <th>Gedung</th>
                    <th>Shift Kerja</th>
                    <th>Frekuensi</th>
                    <th>Rincian Jadwal</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {schedulesList.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.room?.name || '-'}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{s.nama_item || '-'}</td>
                      <td>{s.room?.building?.name || '-'}</td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong>{s.shift?.name || s.nama_shift}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {s.shift ? `(${s.shift.start_time.substring(0,5)} - ${s.shift.end_time.substring(0,5)})` : ''}
                          </span>
                        </span>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{s.frequency}</td>
                      <td>
                        {s.frequency === 'daily' && 'Setiap Hari'}
                        {s.frequency === 'weekly' && `Hari ${s.day_of_week}`}
                        {s.frequency === 'monthly' && `Tanggal ${s.day_of_month} bulanan`}
                      </td>
                      <td>
                        <span className={`role-badge ${s.is_active ? 'role-cs' : 'role-admin'}`}>
                          {s.is_active ? 'Aktif' : 'Non-aktif'}
                        </span>
                      </td>
                      <td>
                        {s.is_active && (
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleDeactivateSchedule(s.id)}
                            style={{ color: 'var(--danger)', padding: '6px' }}
                            title="Nonaktifkan Jadwal"
                            aria-label={`Nonaktifkan jadwal untuk ruangan ${s.room_name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {schedulesList.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada jadwal pembersihan. Buat jadwal di atas.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DAILY CS ASSIGNMENTS VIEW */}
      {activeSubTab === 'assignments' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Tugas Cleaning Service Harian</h2>
            {!showAssignmentForm && (
              <button className="btn btn-primary btn-sm" onClick={handleOpenAssignmentForm}>
                <Plus size={14} /> Tugaskan CS
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <div className="spinner"></div>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tanggal Kerja</th>
                    <th>Nama Petugas CS</th>
                    <th>Gedung</th>
                    <th>Shift Kerja</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {assignmentsList.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>
                        {a.tanggal_mulai} {a.tanggal_selesai ? `s/d ${a.tanggal_selesai}` : '(Seterusnya)'}
                      </td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="user-avatar" style={{ width: '24px', height: '24px', fontSize: '0.7rem' }}>
                            {a.cs_name ? a.cs_name[0] : 'U'}
                          </span>
                          <strong>{a.cs_name}</strong>
                        </span>
                      </td>
                      <td>{a.nama_gedung || '-'}</td>
                      <td>
                        <span style={{ display: 'inline-flex', background: a.nama_shift ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: a.nama_shift ? '#3b82f6' : '#10b981', border: a.nama_shift ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                          {a.nama_shift || 'Semua Shift (Otomatis)'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDeleteAssignment(a.id)}
                          style={{ color: 'var(--danger)', padding: '6px' }}
                          title="Hapus Penugasan"
                          aria-label={`Hapus penugasan CS ${a.cs_name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {assignmentsList.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada penugasan CS aktif. Hubungkan petugas CS dengan gedung di atas.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
