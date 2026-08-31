import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { 
  Plus, 
  Check, 
  X, 
  ShieldAlert, 
  Clock, 
  Eye, 
  User, 
  Search,
  CalendarDays,
  ListTodo,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext.jsx';

function SecureAdhocPhoto({ src, alt }) {
  const [imgUrl, setImgUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchImg = async () => {
      try {
        const blob = await api.get(src);
        const url = URL.createObjectURL(blob);
        if (active) {
          setImgUrl(url);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading adhoc photo:', err);
        if (active) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchImg();

    return () => {
      active = false;
      if (imgUrl) URL.revokeObjectURL(imgUrl);
    };
  }, [src]);

  if (loading) {
    return <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: '8px' }}>Memuat foto bukti...</div>;
  }
  if (error || !imgUrl) {
    return <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8', borderRadius: '8px' }}>Gagal memuat foto bukti</div>;
  }

  return <img src={imgUrl} alt={alt} style={{ width: '100%', maxHeight: '380px', objectFit: 'contain', borderRadius: '8px' }} />;
}

export default function AdhocTaskSupervisor() {
  const confirm = useConfirm();
  const [tasks, setTasks] = useState([]);
  const [csUsers, setCsUsers] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [activeTabFilter, setActiveTabFilter] = useState('all'); // 'all' | 'scheduled_event' | 'immediate'
  const [statusFilter, setStatusFilter] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [search, setSearch] = useState('');

  // Create / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskType, setTaskType] = useState('immediate');
  const [modalBuildingId, setModalBuildingId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [csUserId, setCsUserId] = useState('');
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDatetime, setDueDatetime] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [checklistItems, setChecklistItems] = useState([
    { id: 1, task: '', is_done: false }
  ]);
  const [saving, setSaving] = useState(false);

  // Review & Verify Modal State
  const [reviewingTask, setReviewingTask] = useState(null);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifying, setVerifying] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/adhoc-tasks?per_page=60';
      if (activeTabFilter !== 'all') url += `&task_type=${encodeURIComponent(activeTabFilter)}`;
      if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
      if (buildingFilter) url += `&building_id=${encodeURIComponent(buildingFilter)}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const [tasksRes, usersRes, buildingsRes, roomsRes] = await Promise.all([
        api.get(url),
        api.get('/users/assignable'),
        api.get('/buildings?is_active=true&per_page=200'),
        api.get('/rooms?is_active=true&per_page=500'),
      ]);

      if (tasksRes.success) setTasks(tasksRes.data.data || tasksRes.data || []);
      if (usersRes.success) setCsUsers(usersRes.data.data || usersRes.data || []);
      if (buildingsRes.success) setBuildings(buildingsRes.data.data || buildingsRes.data || []);
      if (roomsRes.success) setRooms(roomsRes.data.data || roomsRes.data || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat data penugasan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTabFilter, statusFilter, buildingFilter, search]);

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

  const handleOpenCreate = (type = 'immediate') => {
    setEditingTask(null);
    setTaskType(type);
    const initialBId = buildings[0]?.id || '';
    setModalBuildingId(initialBId);
    const availRooms = rooms.filter((r) => r.building_id === initialBId || r.building?.id === initialBId);
    setRoomId(availRooms[0]?.id || '');
    setCsUserId(csUsers[0]?.id || '');
    setJudul(type === 'scheduled_event' ? 'Persiapan Ruang Rapat' : '');
    setDeskripsi('');
    setPriority('medium');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    setDueDatetime(`${yyyy}-${mm}-${dd}T08:30`);
    setEventStartTime(`${yyyy}-${mm}-${dd}T09:00`);

    setChecklistItems(
      type === 'scheduled_event'
        ? [
            { id: 1, task: 'Susun meja rapat & kursi sesuai kapasitas', is_done: false },
            { id: 2, task: 'Sediakan air mineral botol & permen', is_done: false },
            { id: 3, task: 'Nyalakan AC & pastikan proyektor/mic siap', is_done: false },
            { id: 4, task: 'Pel lantai & semprot pengharum ruangan', is_done: false },
          ]
        : [{ id: 1, task: '', is_done: false }]
    );
    setShowModal(true);
  };

  const handleOpenEdit = (task) => {
    setEditingTask(task);
    setTaskType(task.task_type || 'immediate');
    const targetRoom = rooms.find((r) => r.id === task.room_id);
    const bId = targetRoom?.building_id || targetRoom?.building?.id || '';
    setModalBuildingId(bId);
    setRoomId(task.room_id || '');
    setCsUserId(task.cs_user_id || '');
    setJudul(task.judul || '');
    setDeskripsi(task.deskripsi || '');
    setPriority(task.priority || 'medium');
    setDueDatetime(task.due_datetime ? task.due_datetime.replace(' ', 'T') : '');
    setEventStartTime(task.event_start_time ? task.event_start_time.replace(' ', 'T') : '');
    setChecklistItems(
      task.checklist_items && task.checklist_items.length > 0
        ? task.checklist_items
        : [{ id: 1, task: '', is_done: false }]
    );
    setShowModal(true);
  };

  const handleAddChecklistRow = () => {
    setChecklistItems((prev) => [
      ...prev,
      { id: Date.now(), task: '', is_done: false }
    ]);
  };

  const handleRemoveChecklistRow = (index) => {
    setChecklistItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChecklistChange = (index, value) => {
    const updated = [...checklistItems];
    updated[index].task = value;
    setChecklistItems(updated);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!csUserId || !judul.trim() || !deskripsi.trim()) {
      setError('Staf CS, Judul Tugas, dan Deskripsi wajib diisi.');
      return;
    }

    setSaving(true);
    setError(null);

    const cleanChecklist = checklistItems
      .filter((item) => item.task && item.task.trim() !== '')
      .map((item, idx) => ({
        id: idx + 1,
        task: item.task.trim(),
        is_done: Boolean(item.is_done),
        done_at: item.done_at || null,
      }));

    const payload = {
      cs_user_id: csUserId,
      room_id: roomId || null,
      judul: judul.trim(),
      deskripsi: deskripsi.trim(),
      priority: priority,
      task_type: taskType,
      due_datetime: taskType === 'scheduled_event' && dueDatetime ? dueDatetime.replace('T', ' ') + ':00' : null,
      event_start_time: taskType === 'scheduled_event' && eventStartTime ? eventStartTime.replace('T', ' ') + ':00' : null,
      checklist_items: cleanChecklist,
    };

    try {
      let res;
      if (editingTask) {
        res = await api.put(`/adhoc-tasks/${editingTask.id}`, payload);
      } else {
        res = await api.post('/adhoc-tasks', payload);
      }

      if (res.success) {
        setSuccessMsg(
          editingTask
            ? 'Penugasan berhasil diperbarui.'
            : taskType === 'scheduled_event'
            ? 'Penugasan persiapan acara/meeting berhasil dijadwalkan!'
            : 'Tugas mendadak berhasil dikirim ke CS!'
        );
        setShowModal(false);
        fetchData();
      }
    } catch (err) {
      setError(err.message || 'Gagal menyimpan data penugasan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (task) => {
    if (!(await confirm({
      title: 'Hapus Penugasan',
      message: `Apakah Anda yakin ingin menghapus penugasan "${task.judul}"?`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger',
    }))) return;

    try {
      const res = await api.delete(`/adhoc-tasks/${task.id}`);
      if (res.success) {
        setSuccessMsg('Penugasan berhasil dihapus.');
        fetchData();
      }
    } catch (err) {
      setError(err.message || 'Gagal menghapus penugasan.');
    }
  };

  const handleOpenReview = (task) => {
    setReviewingTask(task);
    setVerifyNotes(task.verification_notes || '');
  };

  const handleVerifySubmit = async (status) => {
    if (!reviewingTask) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await api.post(`/adhoc-tasks/${reviewingTask.id}/verify`, {
        status: status,
        catatan: verifyNotes || null,
      });

      if (res.success) {
        setSuccessMsg(`Laporan tugas berhasil di-${status === 'verified' ? 'setujui' : 'tolak'}!`);
        setReviewingTask(null);
        fetchData();
      }
    } catch (err) {
      setError(err.message || 'Gagal memverifikasi tugas.');
    } finally {
      setVerifying(false);
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'pending': return <span className="status-badge status-pending">Belum Dimulai</span>;
      case 'in_progress': return <span className="status-badge status-in_progress">Sedang Dikerjakan</span>;
      case 'submitted': return <span className="status-badge status-waiting_verification">Menunggu Verifikasi</span>;
      case 'verified': return <span className="status-badge status-completed">Disetujui / Siap</span>;
      case 'rejected': return <span className="status-badge status-rejected">Perlu Perbaikan</span>;
      default: return <span>{st}</span>;
    }
  };

  const getPriorityBadge = (pr) => {
    switch (pr) {
      case 'high': return <span className="status-badge status-rejected">Tinggi</span>;
      case 'medium': return <span className="status-badge status-waiting_verification">Sedang</span>;
      case 'low': return <span className="status-badge status-completed">Normal</span>;
      default: return <span>{pr}</span>;
    }
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="flex-header" style={{ marginBottom: '18px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>Tugas Khusus & Acara</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Penugasan instan dan penjadwalan persiapan ruang meeting / acara khusus untuk tim Cleaning Service
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => handleOpenCreate('scheduled_event')} 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
          >
            <CalendarDays size={16} /> Booking Persiapan Meeting
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => handleOpenCreate('immediate')} 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
          >
            <Plus size={16} /> Buat Tugas Mendadak
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="alert alert-success">
          <Check size={18} /> <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="alert alert-danger">
          <ShieldAlert size={18} /> <span>{error}</span>
        </div>
      )}

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border-color)', marginBottom: '18px', overflowX: 'auto' }}>
        <button
          className="tab-button"
          onClick={() => setActiveTabFilter('all')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTabFilter === 'all' ? 700 : 500,
            color: activeTabFilter === 'all' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTabFilter === 'all' ? '3px solid var(--primary)' : '3px solid transparent',
          }}
        >
          Semua Penugasan ({tasks.length})
        </button>
        <button
          className="tab-button"
          onClick={() => setActiveTabFilter('scheduled_event')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTabFilter === 'scheduled_event' ? 700 : 500,
            color: activeTabFilter === 'scheduled_event' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTabFilter === 'scheduled_event' ? '3px solid var(--primary)' : '3px solid transparent',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <CalendarDays size={16} /> Persiapan Meeting & Acara
        </button>
        <button
          className="tab-button"
          onClick={() => setActiveTabFilter('immediate')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTabFilter === 'immediate' ? 700 : 500,
            color: activeTabFilter === 'immediate' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTabFilter === 'immediate' ? '3px solid var(--primary)' : '3px solid transparent',
          }}
        >
          Tugas Mendadak (Hari Ini)
        </button>
      </div>

      {/* Filter Row */}
      <div className="glass-panel" style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Cari judul, ruangan, atau CS..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            style={{ paddingLeft: '32px' }} 
          />
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>
        <select className="form-control" value={buildingFilter} onChange={(e) => setBuildingFilter(e.target.value)} style={{ maxWidth: '200px' }}>
          <option value="">Semua Gedung</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>{b.nama_gedung || b.name}</option>
          ))}
        </select>
        <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: '200px' }}>
          <option value="">Semua Status</option>
          <option value="pending">Belum Dimulai</option>
          <option value="in_progress">Sedang Dikerjakan</option>
          <option value="submitted">Menunggu Verifikasi</option>
          <option value="verified">Disetujui / Selesai</option>
          <option value="rejected">Perlu Perbaikan</option>
        </select>
        {(search || statusFilter || buildingFilter) && (
          <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setStatusFilter(''); setBuildingFilter(''); }}>
            Reset
          </button>
        )}
      </div>

      {/* Tasks Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner"></div></div>
      ) : tasks.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <ListTodo size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p>Tidak ada data penugasan.</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th>Judul & Tipe</th>
                <th>Target Waktu</th>
                <th>Ruangan & Gedung</th>
                <th>Petugas CS</th>
                <th>Kebutuhan</th>
                <th>Prioritas</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const total = task.checklist_items?.length || 0;
                const done = task.checklist_items?.filter((i) => i.is_done).length || 0;
                return (
                  <tr key={task.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{task.judul}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
                        {task.task_type === 'scheduled_event' ? 'Persiapan Meeting' : 'Tugas Mendadak'} • Dibuat: {task.creator_name}
                      </span>
                    </td>
                    <td>
                      {task.due_datetime ? (
                        <div>
                          <strong style={{ fontSize: '0.85rem' }}>{task.due_datetime}</strong>
                          {task.event_start_time && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                              Mulai: {task.event_start_time}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Langsung</span>
                      )}
                    </td>
                    <td>
                      {task.room_name ? (
                        <>
                          <span style={{ fontWeight: 600 }}>{task.room_name}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>
                            {task.building_name} ({task.room_code})
                          </span>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Semua Area</span>
                      )}
                    </td>
                    <td><span style={{ fontWeight: 600 }}>{task.cs_name || '-'}</span></td>
                    <td>
                      {total > 0 ? (
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: done === total ? '#166534' : 'var(--text-secondary)' }}>
                          {done}/{total} Siap
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                      )}
                    </td>
                    <td>{getPriorityBadge(task.priority)}</td>
                    <td>{getStatusBadge(task.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleOpenReview(task)} title="Detail / Review">
                          <Eye size={13} /> {task.status === 'submitted' ? 'Review' : 'Detail'}
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(task)} title="Edit">
                          <Edit2 size={13} />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTask(task)} title="Hapus">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: FORM BUAT / EDIT PENUGASAN */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div 
            className="glass-panel" 
            style={{ maxWidth: '720px', width: '94vw', maxHeight: '92vh', overflowY: 'auto', padding: '28px', borderRadius: 'var(--radius-2xl)', background: '#ffffff' }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                  {editingTask ? 'Edit Penugasan' : 'Form Penugasan Khusus'}
                </span>
                <h2 className="modal-title" style={{ marginTop: '2px' }}>
                  {editingTask
                    ? 'Edit Data Penugasan'
                    : taskType === 'scheduled_event'
                    ? 'Penugasan Persiapan Ruang Meeting / Acara'
                    : 'Penugasan Tugas Mendadak (Langsung)'}
                </h2>
              </div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveTask}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Tipe Tugas */}
                {!editingTask && (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <label style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius-lg)', border: taskType === 'scheduled_event' ? '2px solid var(--primary)' : '1px solid var(--border-color)', background: taskType === 'scheduled_event' ? '#eff6ff' : '#ffffff', cursor: 'pointer' }}>
                      <input type="radio" name="taskType" value="scheduled_event" checked={taskType === 'scheduled_event'} onChange={() => setTaskType('scheduled_event')} />
                      <strong style={{ color: 'var(--primary)', marginLeft: '6px' }}>Persiapan Meeting (Terjadwal)</strong>
                    </label>
                    <label style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius-lg)', border: taskType === 'immediate' ? '2px solid var(--primary)' : '1px solid var(--border-color)', background: taskType === 'immediate' ? '#eff6ff' : '#ffffff', cursor: 'pointer' }}>
                      <input type="radio" name="taskType" value="immediate" checked={taskType === 'immediate'} onChange={() => setTaskType('immediate')} />
                      <strong style={{ color: 'var(--primary)', marginLeft: '6px' }}>Tugas Mendadak (Langsung)</strong>
                    </label>
                  </div>
                )}

                {/* Jadwal jika scheduled */}
                {taskType === 'scheduled_event' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-lg)' }}>
                    <div>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Target Selesai Persiapan *</label>
                      <input type="datetime-local" className="form-control" value={dueDatetime} onChange={(e) => setDueDatetime(e.target.value)} required={taskType === 'scheduled_event'} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Waktu Mulai Acara (Opsional)</label>
                      <input type="datetime-local" className="form-control" value={eventStartTime} onChange={(e) => setEventStartTime(e.target.value)} />
                    </div>
                  </div>
                )}

                {/* Gedung, Ruangan, CS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Pilih Gedung</label>
                    <select className="form-control form-select" value={modalBuildingId} onChange={(e) => { setModalBuildingId(e.target.value); const avail = rooms.filter(r => r.building_id === e.target.value); setRoomId(avail[0]?.id || ''); }}>
                      <option value="">Semua Gedung...</option>
                      {buildings.map(b => <option key={b.id} value={b.id}>{b.nama_gedung || b.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Pilih Ruangan</label>
                    <select className="form-control form-select" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                      <option value="">Pilih Ruangan...</option>
                      {rooms.filter(r => !modalBuildingId || r.building_id === modalBuildingId).map(r => <option key={r.id} value={r.id}>{r.nama_ruangan} ({r.kode_ruangan})</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Petugas CS *</label>
                    <select className="form-control form-select" value={csUserId} onChange={(e) => setCsUserId(e.target.value)} required>
                      <option value="">Pilih Petugas CS...</option>
                      {csUsers.map(u => <option key={u.id} value={u.id}>{u.full_name || u.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Judul & Prioritas */}
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Judul Penugasan *</label>
                    <input type="text" className="form-control" placeholder="Contoh: Persiapan Ruang Meeting Direksi" value={judul} onChange={(e) => setJudul(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Prioritas *</label>
                    <select className="form-control form-select" value={priority} onChange={(e) => setPriority(e.target.value)} required>
                      <option value="low">Normal</option>
                      <option value="medium">Sedang</option>
                      <option value="high">Tinggi / Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Instruksi */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Instruksi / Catatan Detail *</label>
                  <textarea className="form-control" rows="2" placeholder="Catatan detail untuk petugas CS..." value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} required></textarea>
                </div>

                {/* Checklist Kebutuhan */}
                <div>
                  <label className="form-label" style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                    Checklist Kebutuhan Persiapan ({checklistItems.length} Poin)
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {checklistItems.map((item, index) => (
                      <div key={item.id || index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', width: '20px' }}>{index + 1}.</span>
                        <input type="text" className="form-control" placeholder="Misal: Siapkan 12 botol air mineral..." value={item.task} onChange={(e) => handleChecklistChange(index, e.target.value)} />
                        {checklistItems.length > 1 && (
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleRemoveChecklistRow(index)} style={{ color: '#dc2626' }} title="Hapus"><Trash2 size={14} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddChecklistRow} style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Plus size={14} /> Tambah Poin
                  </button>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ fontWeight: 700 }}>
                  {saving ? 'Menyimpan...' : editingTask ? 'Simpan Perubahan' : taskType === 'scheduled_event' ? 'Jadwalkan Persiapan Meeting' : 'Kirim Tugas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DETAIL & VERIFIKASI LAPORAN */}
      {/* ========================================================================= */}
      {reviewingTask && (
        <div className="modal-backdrop" onClick={() => setReviewingTask(null)}>
          <div 
            className="glass-panel" 
            style={{ maxWidth: '720px', width: '94vw', maxHeight: '92vh', overflowY: 'auto', padding: '28px', borderRadius: 'var(--radius-2xl)', background: '#ffffff' }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>Detail & Verifikasi Laporan</span>
                <h2 className="modal-title" style={{ marginTop: '2px' }}>{reviewingTask.judul}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setReviewingTask(null)}><X size={20} /></button>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-lg)', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '0.85rem' }}>
              <div><span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>RUANGAN</span><strong>{reviewingTask.room_name || 'Semua Area'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>PETUGAS CS</span><strong>{reviewingTask.cs_name}</strong></div>
              <div><span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>TARGET WAKTU</span><strong>{reviewingTask.due_datetime || 'Langsung'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>STATUS</span>{getStatusBadge(reviewingTask.status)}</div>
            </div>

            <div style={{ background: '#f9fafb', padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.88rem' }}>
              <strong>Instruksi:</strong> {reviewingTask.deskripsi}
            </div>

            {/* Checklist items review */}
            {reviewingTask.checklist_items && reviewingTask.checklist_items.length > 0 && (
              <div style={{ marginBottom: '18px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 10px 0' }}>Daftar Kebutuhan yang Disiapkan CS:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {reviewingTask.checklist_items.map((item, idx) => (
                    <div key={item.id || idx} style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: item.is_done ? '#f0fdf4' : '#fef2f2', border: item.is_done ? '1px solid #bbf7d0' : '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.is_done ? <CheckCircle2 size={16} color="#16a34a" /> : <AlertTriangle size={16} color="#dc2626" />}
                        <span style={{ fontWeight: 600, color: item.is_done ? '#166534' : '#991b1b', fontSize: '0.88rem' }}>{item.task}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: item.is_done ? '#15803d' : '#991b1b', fontWeight: 600 }}>{item.is_done ? 'Sudah Disiapkan' : 'Belum Dicentang'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Foto Bukti */}
            {reviewingTask.has_foto_bukti && (
              <div style={{ marginBottom: '18px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 10px 0' }}>Foto Bukti Hasil Kerja CS:</h4>
                <SecureAdhocPhoto src={reviewingTask.foto_bukti_url} alt="Foto Bukti" />
              </div>
            )}

            {/* Verifikasi Section */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 10px 0', color: 'var(--primary)' }}>Keputusan Verifikasi Supervisor</h4>
              <textarea className="form-control" rows="2" placeholder="Catatan verifikasi..." value={verifyNotes} onChange={(e) => setVerifyNotes(e.target.value)}></textarea>
              <div className="modal-footer" style={{ marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setReviewingTask(null)} disabled={verifying}>Tutup</button>
                <button type="button" className="btn btn-danger" onClick={() => handleVerifySubmit('rejected')} disabled={verifying} style={{ fontWeight: 600 }}>Tolak / Minta Perbaikan</button>
                <button type="button" className="btn btn-success" onClick={() => handleVerifySubmit('verified')} disabled={verifying} style={{ fontWeight: 700 }}>Setujui / Ruangan Siap</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
