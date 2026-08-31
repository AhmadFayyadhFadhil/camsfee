import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { Zap, Play, Camera, CheckCircle, ShieldAlert, X, Upload, Sparkles, ArrowRight } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

export default function CsAdhocTasks({ onResumeDailyTasks }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Submit Modal State
  const [activeTask, setActiveTask] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const fetchMyAdhocTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/adhoc-tasks?per_page=30');
      if (res.success) {
        setTasks(res.data.data || res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat tugas mendadak.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyAdhocTasks();
  }, []);

  const handleStartTask = async (taskId) => {
    setError(null);
    try {
      const res = await api.post(`/adhoc-tasks/${taskId}/start`);
      if (res.success) {
        setSuccessMsg('Tugas berhasil dimulai. Silakan kerjakan dan ambil foto setelah selesai.');
        fetchMyAdhocTasks();
      }
    } catch (err) {
      setError(err.message || 'Gagal memulai tugas.');
    }
  };

  const handleOpenSubmitModal = (task) => {
    setActiveTask(task);
    setProofFile(null);
    setProofPreview(null);
  };

  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Kompres otomatis ke format JPEG < 1MB
      const compressedBlob = await compressImage(file, 1600, 1000 * 1024);
      setProofFile(compressedBlob);
      setProofPreview(URL.createObjectURL(compressedBlob));
    } catch (err) {
      console.error('Compression error:', err);
      setError('Gagal mengompresi foto. Silakan coba lagi.');
    }
  };

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!proofFile) {
      setError('Wajib melampirkan 1 foto bukti penyelesaian.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append('foto_bukti', proofFile, 'bukti_adhoc.jpg');

    try {
      const res = await api.post(`/adhoc-tasks/${activeTask.id}/submit`, formData);
      if (res.success) {
        setSuccessMsg('Tugas mendadak berhasil diserahkan! Sistem secara otomatis mengembalikan Anda ke tugas rutin harian.');
        setActiveTask(null);
        setProofFile(null);
        setProofPreview(null);
        fetchMyAdhocTasks();

        // Auto-Resume: setelah 1.5 detik panggil onResumeDailyTasks jika tersedia
        if (onResumeDailyTasks) {
          setTimeout(() => {
            onResumeDailyTasks();
          }, 1500);
        }
      }
    } catch (err) {
      setError(err.message || 'Gagal menyerahkan bukti tugas mendadak.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="flex-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap color="#eab308" fill="#eab308" size={28} /> Tugas Mendadak (Ad-hoc)
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Instruksi insidental langsung dari Supervisor (misal: tumpahan cairan, permintaan cepat)
          </p>
        </div>
        {onResumeDailyTasks && (
          <button className="btn btn-secondary" onClick={onResumeDailyTasks} style={{ display: 'inline-flex', gap: '8px', fontWeight: 600 }}>
            <span>← Kembali ke Tugas Harian</span>
          </button>
        )}
      </div>

      {/* PANDUAN ALUR TUGAS MENDADAK */}
      <div className="instruction-banner" style={{ background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.08) 0%, rgba(249, 115, 22, 0.08) 100%)', borderColor: 'rgba(234, 179, 8, 0.3)' }}>
        <div className="instruction-banner-title" style={{ color: '#b45309' }}>
          ⚡ Alur Pengerjaan Tugas Mendadak:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '8px' }}>
          <div style={{ background: 'white', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
            <strong style={{ fontSize: '0.82rem', color: '#b45309' }}>1. Tekan "Mulai Tugas"</strong>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Status tugas berubah jadi dikerjakan</div>
          </div>
          <div style={{ background: 'white', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
            <strong style={{ fontSize: '0.82rem', color: '#b45309' }}>2. Bersihkan di Lokasi</strong>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Selesaikan permintaan supervisor</div>
          </div>
          <div style={{ background: 'white', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
            <strong style={{ fontSize: '0.82rem', color: '#b45309' }}>3. Ambil 1 Foto Bukti</strong>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Foto kondisi setelah bersih</div>
          </div>
          <div style={{ background: 'white', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
            <strong style={{ fontSize: '0.82rem', color: 'var(--success)' }}>4. Otomatis Lanjut Harian</strong>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Kembali ke checklist rutin</div>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle size={20} />
          <span style={{ fontWeight: 700 }}>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Task List */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner" style={{ width: '36px', height: '36px' }}></div>
          <div className="loading-state-text">⏳ Memuat daftar tugas mendadak...</div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
          <Sparkles size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Tidak Ada Tugas Mendadak</h3>
          <p style={{ margin: 0, fontSize: '0.88rem' }}>Semua aman! Anda dapat fokus mengerjakan checklist tugas rutin harian.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {tasks.map((task) => (
            <div
              key={task.id}
              className="adhoc-task-card"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <span 
                      className="status-badge"
                      style={{
                        background: task.priority === 'high' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                        color: task.priority === 'high' ? '#b91c1c' : '#b45309',
                        border: task.priority === 'high' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(234, 179, 8, 0.3)'
                      }}
                    >
                      {task.priority === 'high' ? '🚨 Prioritas Tinggi' : '⚠️ Prioritas Normal'}
                    </span>
                    
                    {task.status === 'pending' && <span className="status-badge status-pending">⏳ Belum Dimulai</span>}
                    {task.status === 'in_progress' && <span className="status-badge status-in_progress">🔵 Sedang Dikerjakan</span>}
                    {task.status === 'submitted' && <span className="status-badge status-waiting_verification">🟡 Menunggu Verifikasi</span>}
                    {task.status === 'verified' && <span className="status-badge status-completed">✅ Selesai</span>}
                    {task.status === 'rejected' && <span className="status-badge status-rejected">❌ Perlu Diulang</span>}
                  </div>
                  
                  <h3 style={{ margin: '4px 0', fontSize: '1.25rem', fontWeight: 800 }}>{task.judul}</h3>
                  <p style={{ color: 'var(--text-secondary)', margin: '6px 0 12px 0', fontSize: '0.92rem', lineHeight: 1.5 }}>
                    {task.deskripsi}
                  </p>
                  {task.room_name && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, background: 'rgba(14, 49, 146, 0.05)', padding: '6px 12px', borderRadius: 'var(--radius-md)', width: 'fit-content' }}>
                      📍 Lokasi: {task.room_name} ({task.building_name})
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px', width: '100%', maxWidth: '240px' }}>
                  {task.status === 'pending' && (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleStartTask(task.id)}
                      style={{ width: '100%', fontWeight: 700 }}
                    >
                      <Play size={16} /> Mulai Tugas Ini
                    </button>
                  )}

                  {(task.status === 'in_progress' || task.status === 'rejected') && (
                    <button
                      className="btn btn-success"
                      onClick={() => handleOpenSubmitModal(task)}
                      style={{ width: '100%', fontWeight: 700 }}
                    >
                      <Camera size={18} /> 📷 Ambil Foto &amp; Kirim
                    </button>
                  )}

                  {task.status === 'submitted' && (
                    <div style={{ color: '#b45309', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', background: 'white', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                      <CheckCircle size={18} /> Menunggu Supervisor
                    </div>
                  )}

                  {task.status === 'verified' && (
                    <div style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', background: 'white', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(15, 118, 110, 0.3)' }}>
                      <CheckCircle size={18} /> Tugas Terverifikasi Selesai
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Ambil Foto Bukti */}
      {activeTask && (
        <div className="confirm-backdrop" onClick={() => setActiveTask(null)}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '92vw', padding: '24px', borderRadius: 'var(--radius-xl)', background: 'white' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>BUKTI PENYELESAIAN</span>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{activeTask.judul}</h2>
              </div>
              <button onClick={() => setActiveTask(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmitProof}>
              <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handlePhotoCapture}
                  style={{ display: 'none' }}
                />

                {proofPreview ? (
                  <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <img
                      src={proofPreview}
                      alt="Bukti Foto"
                      style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', borderRadius: 'var(--radius-lg)', border: '2px solid var(--success)' }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ position: 'absolute', bottom: '10px', right: '10px', fontWeight: 700 }}
                    >
                      📷 Foto Ulang
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--primary)',
                      borderRadius: 'var(--radius-xl)',
                      padding: '36px 16px',
                      cursor: 'pointer',
                      background: 'rgba(14, 49, 146, 0.02)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Camera size={44} color="var(--primary)" style={{ marginBottom: '10px' }} />
                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>Ketuk untuk Buka Kamera HP</p>
                    <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Ambil foto kondisi yang sudah bersih / diperbaiki
                    </p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveTask(null)} disabled={submitting} style={{ flex: 1 }}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !proofFile} style={{ flex: 2, fontWeight: 700 }}>
                  {submitting ? 'Mengirim...' : '🚀 Kirim & Selesai'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
