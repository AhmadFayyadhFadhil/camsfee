import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Plus, Check, X, ShieldAlert, Zap, Clock, CheckCircle, AlertCircle, Eye, User, Home, MessageSquare } from 'lucide-react';
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
    return <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>Memuat foto...</div>;
  }
  if (error || !imgUrl) {
    return <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8' }}>Gagal memuat foto bukti</div>;
  }

  return <img src={imgUrl} alt={alt} style={{ width: '100%', maxHeight: '350px', objectFit: 'contain', borderRadius: '8px' }} />;
}

export default function AdhocTaskSupervisor() {
  const confirm = useConfirm();
  const [tasks, setTasks] = useState([]);
  const [csUsers, setCsUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [csUserId, setCsUserId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [priority, setPriority] = useState('medium');
  const [saving, setSaving] = useState(false);

  // Review & Verify Modal State
  const [reviewingTask, setReviewingTask] = useState(null);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifying, setVerifying] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/adhoc-tasks?per_page=50';
      if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;

      const [tasksRes, usersRes, roomsRes] = await Promise.all([
        api.get(url),
        api.get('/users/assignable'),
        api.get('/rooms?is_active=true&per_page=500'),
      ]);

      if (tasksRes.success) {
        setTasks(tasksRes.data.data || tasksRes.data || []);
      }
      if (usersRes.success) {
        setCsUsers(usersRes.data.data || usersRes.data || []);
      }
      if (roomsRes.success) {
        setRooms(roomsRes.data.data || roomsRes.data || []);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat data tugas ad-hoc.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

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

  const handleOpenCreate = () => {
    setCsUserId(csUsers[0]?.id || '');
    setRoomId('');
    setJudul('');
    setDeskripsi('');
    setPriority('medium');
    setShowCreateModal(true);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!csUserId || !judul.trim() || !deskripsi.trim()) {
      setError('Staf CS, Judul Tugas, dan Deskripsi wajib diisi.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        cs_user_id: csUserId,
        room_id: roomId || null,
        judul: judul,
        deskripsi: deskripsi,
        priority: priority,
      };

      const res = await api.post('/adhoc-tasks', payload);
      if (res.success) {
        setSuccessMsg('Tugas mendadak berhasil dikirim ke CS secara instan.');
        setShowCreateModal(false);
        fetchData();
      }
    } catch (err) {
      setError(err.message || 'Gagal membuat tugas mendadak.');
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (action) => {
    if (!reviewingTask) return;
    setVerifying(true);
    setError(null);

    try {
      const res = await api.post(`/adhoc-tasks/${reviewingTask.id}/verify`, {
        status: action === 'approve' ? 'verified' : 'rejected',
        catatan: verifyNotes,
      });

      if (res.success) {
        setSuccessMsg(`Laporan tugas mendadak berhasil di-${action === 'approve' ? 'setujui' : 'tolak'}.`);
        setReviewingTask(null);
        setVerifyNotes('');
        fetchData();
      }
    } catch (err) {
      setError(err.message || 'Gagal memverifikasi tugas mendadak.');
    } finally {
      setVerifying(false);
    }
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'high':
        return <span className="badge badge-danger" style={{ fontSize: '0.72rem' }}>Tinggi (High)</span>;
      case 'medium':
        return <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>Sedang (Med)</span>;
      case 'low':
        return <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>Rendah (Low)</span>;
      default:
        return <span className="badge">{p}</span>;
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'pending':
        return <span className="role-badge role-supervisor" style={{ fontSize: '0.75rem' }}>Menunggu CS</span>;
      case 'in_progress':
        return <span className="role-badge role-cs" style={{ fontSize: '0.75rem' }}>Sedang Dikerjakan</span>;
      case 'submitted':
        return <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>Menunggu Verifikasi</span>;
      case 'verified':
        return <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>Selesai / Terverifikasi</span>;
      case 'rejected':
        return <span className="badge badge-danger" style={{ fontSize: '0.75rem' }}>Perlu Perbaikan</span>;
      default:
        return <span>{st}</span>;
    }
  };

  return (
    <div className="container-fluid">
      <div className="flex-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>Tugas Ad-hoc & Insidental</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Instruksi penugasan pembersihan mendadak langsung ke staf CS dengan bukti foto & persetujuan mandiri
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate} style={{ display: 'inline-flex', gap: '6px' }}>
          <Zap size={16} /> Buat Tugas Mendadak
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

      {/* Status Filter */}
      <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <select
          className="form-control"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ maxWidth: '240px' }}
        >
          <option value="">Semua Status</option>
          <option value="pending">Menunggu CS (Pending)</option>
          <option value="in_progress">Sedang Dikerjakan (In Progress)</option>
          <option value="submitted">Menunggu Verifikasi (Submitted)</option>
          <option value="verified">Selesai (Verified)</option>
          <option value="rejected">Ditolak (Rejected)</option>
        </select>

        {statusFilter && (
          <button className="btn btn-secondary btn-sm" onClick={() => setStatusFilter('')}>
            Reset Filter
          </button>
        )}
      </div>

      {/* Task List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner"></div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <Zap size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p>Belum ada tugas ad-hoc yang tercatat.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {tasks.map((task) => (
            <div
              key={task.id}
              className="glass-panel"
              style={{
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    {getPriorityBadge(task.priority)}
                    <h3 style={{ margin: '8px 0 0 0', fontSize: '1.15rem' }}>{task.judul}</h3>
                  </div>
                  <div>{getStatusBadge(task.status)}</div>
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.4, margin: '8px 0 14px 0' }}>
                  {task.deskripsi}
                </p>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={14} color="var(--primary)" />
                    <span>Ditugaskan ke: <strong>{task.cs_name || 'CS'}</strong></span>
                  </div>
                  {task.room_name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Home size={14} color="var(--primary)" />
                      <span>Lokasi: {task.room_name} ({task.building_name || '-'})</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} />
                    <span>Dibuat: {task.created_at ? new Date(task.created_at).toLocaleString('id-ID') : '-'}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                {task.status === 'submitted' ? (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setReviewingTask(task)}
                    style={{ display: 'inline-flex', gap: '6px' }}
                  >
                    <Eye size={14} /> Tinjau & Verifikasi
                  </button>
                ) : (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setReviewingTask(task)}
                    style={{ display: 'inline-flex', gap: '6px' }}
                  >
                    <Eye size={14} /> Lihat Detail
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Buat Tugas Mendadak */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={20} color="var(--primary)" /> Buat Tugas Ad-hoc Mendadak
              </h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTask}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Tugaskan kepada Staf CS *</label>
                <select
                  className="form-control"
                  value={csUserId}
                  onChange={(e) => setCsUserId(e.target.value)}
                  required
                >
                  <option value="">Pilih Staf CS...</option>
                  {csUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.name} ({u.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Lokasi Ruangan (Opsional)</label>
                <select
                  className="form-control"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                >
                  <option value="">Pilih Ruangan (Jika spesifik)...</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nama_ruangan || r.name} ({r.building?.nama_gedung || ''})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Tingkat Prioritas *</label>
                <select
                  className="form-control"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  required
                >
                  <option value="high">Tinggi / Urgent (High - Segera Kerjakan)</option>
                  <option value="medium">Sedang (Medium)</option>
                  <option value="low">Rendah (Low - Bisa ditunda)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Judul Instruksi Tugas *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: Tumpahan Oli di Koridor Line B, Pembersihan Kaca Lobi Utama"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Detail Deskripsi & Instruksi *</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Jelaskan apa yang harus dibersihkan, bahan/alat yang harus dibawa..."
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)} disabled={saving}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Mengirim...' : 'Kirim Tugas ke CS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Review & Verifikasi */}
      {reviewingTask && (
        <div className="modal-backdrop">
          <div className="glass-panel" style={{ maxWidth: '580px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Detail Tugas Ad-hoc</span>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '1.25rem' }}>{reviewingTask.judul}</h2>
              </div>
              <button onClick={() => setReviewingTask(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem' }}>
              <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>{reviewingTask.deskripsi}</p>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>Staf CS: <strong>{reviewingTask.cs_name}</strong></span>
                <span>Prioritas: <strong>{reviewingTask.priority}</strong></span>
                <span>Status: <strong>{reviewingTask.status}</strong></span>
              </div>
            </div>

            {/* Foto Bukti jika ada */}
            {reviewingTask.has_foto_bukti && reviewingTask.foto_bukti_url && (
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Bukti Foto Pekerjaan dari CS:</label>
                <SecureAdhocPhoto src={`/adhoc-tasks/${reviewingTask.id}/foto-bukti`} alt="Bukti Foto Ad-hoc" />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Diserahkan pada: {reviewingTask.submitted_at ? new Date(reviewingTask.submitted_at).toLocaleString('id-ID') : '-'}
                </div>
              </div>
            )}

            {/* Aksi Verifikasi jika status SUBMITTED */}
            {reviewingTask.status === 'submitted' && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Catatan Verifikasi (Opsional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Catatan persetujuan atau alasan penolakan..."
                    value={verifyNotes}
                    onChange={(e) => setVerifyNotes(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleVerify('reject')}
                    disabled={verifying}
                  >
                    Tolak / Minta Ulang
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => handleVerify('approve')}
                    disabled={verifying}
                  >
                    Setujui Pekerjaan
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
