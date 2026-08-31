import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { Check, X, ShieldAlert, AlertCircle, MessageSquare, Eye, ArrowLeft } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext.jsx';

// Reusable component to render images protected by Sanctum token authentication
function SecureImage({ src, alt, className, style }) {
  const [imgUrl, setImgUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchImg = async () => {
      try {
        const blob = await api.get(src);
        const url = URL.createObjectURL(blob);
        if (active) {
          setImgUrl(url);
          setError(false);
        }
      } catch (err) {
        console.error('Error loading secure image:', err);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchImg();

    return () => {
      active = false;
      if (imgUrl) {
        URL.revokeObjectURL(imgUrl);
      }
    };
  }, [src]);

  // Kunci scroll halaman saat foto di-zoom
  useEffect(() => {
    if (isZoomed) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isZoomed]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: 'rgba(0,0,0,0.1)', borderRadius: 'var(--radius-md)' }}>
        <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
      </div>
    );
  }

  if (error || !imgUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', background: 'rgba(0,0,0,0.2)', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '10px', borderRadius: 'var(--radius-md)' }}>
        <AlertCircle size={16} style={{ marginBottom: '4px' }} />
        <span>Gagal memuat foto</span>
      </div>
    );
  }

  return (
    <>
      <img 
        src={imgUrl} 
        alt={alt} 
        className={`${className || ''} secure-image-thumb`}
        onClick={() => setIsZoomed(true)}
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover', 
          borderRadius: 'var(--radius-md)', 
          ...style 
        }} 
      />

      {isZoomed && createPortal(
        <div 
          onClick={() => setIsZoomed(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(10, 10, 15, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999999,
            cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
            <img 
              src={imgUrl} 
              alt={alt} 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100%', 
                objectFit: 'contain', 
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                animation: 'scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }} 
            />
            <button
              onClick={() => setIsZoomed(false)}
              style={{
                position: 'absolute',
                top: '-45px',
                right: '0',
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: 'white',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 'normal',
                backdropFilter: 'blur(5px)',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
            >
              &times;
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default function Verifications() {
  const confirm = useConfirm();
  const [submissions, setSubmissions] = useState([]);
  const [slaParams, setSlaParams] = useState([]);
  const [slaRatings, setSlaRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Active Verification/Detail state
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchPendingSubmissions = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [subsRes, slaRes] = await Promise.all([
        api.get('/verifications/pending'),
        api.get('/sla-parameters?is_active=true&per_page=100', { lookup: true })
      ]);

      if (subsRes.success) {
        setSubmissions(subsRes.data.data || subsRes.data || []);
      }
      if (slaRes.success) {
        const params = slaRes.data.data || slaRes.data || [];
        setSlaParams(params);
        const initialRatings = {};
        params.forEach(p => {
          initialRatings[p.id] = p.tipe_penilaian === 'scale_1_5' ? '5' : 'yes';
        });
        setSlaRatings(initialRatings);
      }
    } catch (err) {
      if (showLoading) setError(err.message || 'Gagal memuat antrean verifikasi.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingSubmissions(true);
  }, []);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleApprove = async () => {
    if (!(await confirm({
      title: 'Setujui Laporan Kebersihan',
      message: 'Apakah Anda yakin ingin menyetujui laporan kebersihan ini beserta penilaian skor SLA?',
      confirmText: 'Ya, Setujui',
      cancelText: 'Batal',
      type: 'info'
    }))) {
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccessMsg(null);

    const subId = selectedSubmission.id;

    try {
      const payload = {
        notes: feedback || 'Laporan disetujui.',
        sla_ratings: Object.entries(slaRatings).map(([id, val]) => ({
          sla_parameter_id: id,
          nilai: String(val)
        }))
      };

      const response = await api.post(`/verifications/${subId}/approve`, payload);

      if (response.success) {
        setSubmissions(prev => prev.filter(s => s.id !== subId));
        setSuccessMsg('Laporan kebersihan berhasil disetujui. Skor SLA tersimpan.');
        setSelectedSubmission(null);
        setFeedback('');
        fetchPendingSubmissions(false);
      }
    } catch (err) {
      setError(err.message || 'Gagal menyetujui laporan.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!feedback || !feedback.trim()) {
      setError('Untuk penolakan laporan, Anda wajib mengisi catatan perbaikan.');
      return;
    }

    if (!(await confirm({
      title: 'Tolak Laporan Kebersihan',
      message: 'Apakah Anda yakin ingin menolak laporan ini dan meminta CS melakukan perbaikan ulang?',
      confirmText: 'Ya, Tolak',
      cancelText: 'Batal',
      type: 'warning'
    }))) {
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccessMsg(null);

    const subId = selectedSubmission.id;

    try {
      const response = await api.post(`/verifications/${subId}/reject`, {
        catatan_perbaikan: feedback
      });

      if (response.success) {
        setSubmissions(prev => prev.filter(s => s.id !== subId));
        setSuccessMsg('Laporan ditolak. Notifikasi perbaikan telah diteruskan ke petugas CS terkait.');
        setSelectedSubmission(null);
        setFeedback('');
        fetchPendingSubmissions(false);
      }
    } catch (err) {
      setError(err.message || 'Gagal menolak laporan.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <div className="flex-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 800 }}>Verifikasi Laporan Kebersihan</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Periksa hasil kerja petugas CS melalui 4 sudut foto ruangan sebelum menyetujui laporan
          </p>
        </div>
        {selectedSubmission && (
          <button 
            className="btn btn-secondary" 
            onClick={() => { setSelectedSubmission(null); setFeedback(''); setError(null); }} 
            disabled={processing}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontWeight: 700
            }}
          >
            <ArrowLeft size={16} /> Kembali ke Daftar Antrean
          </button>
        )}
      </div>

      {successMsg && (
        <div className="alert alert-success">
          <Check size={18} />
          <span style={{ fontWeight: 700 }}>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* DETAIL MODAL / PANEL */}
      {selectedSubmission && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-xl)', marginBottom: '30px' }}>

          <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
            <span className="status-badge status-waiting_verification" style={{ marginBottom: '6px' }}>🟡 Menunggu Verifikasi Anda</span>
            <h2 style={{ margin: 0, fontSize: '1.35rem', marginTop: '4px', fontWeight: 800 }}>
              Ruang: {selectedSubmission.task?.room?.name} ({selectedSubmission.task?.room?.code})
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
              Gedung: <strong>{selectedSubmission.task?.room?.building?.name}</strong> | Petugas CS: <strong>{selectedSubmission.user?.name}</strong> | Waktu Serah: <strong>{selectedSubmission.submission_time ? selectedSubmission.submission_time.replace('T', ' ').substring(0, 16) : '-'}</strong>
            </p>
          </div>

          {/* FOTO BUKTI 4 SUDUT */}
          <div className="glass-card" style={{ padding: '20px', marginBottom: '24px', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>
                📷 Foto Bukti 4 Sudut Ruangan
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ketuk foto untuk memperbesar (zoom)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {[
                { label: 'Foto Sudut 1 (Depan)', src: `/submissions/${selectedSubmission.id}/foto-after-1` },
                { label: 'Foto Sudut 2 (Belakang)', src: `/submissions/${selectedSubmission.id}/foto-after-2` },
                { label: 'Foto Sudut 3 (Kiri)', src: `/submissions/${selectedSubmission.id}/foto-after-3` },
                { label: 'Foto Sudut 4 (Kanan / Detail)', src: `/submissions/${selectedSubmission.id}/foto-after-4` },
              ].map((photo) => (
                <div key={photo.label} style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'white' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', background: 'rgba(14, 49, 146, 0.03)' }}>
                    <strong style={{ fontSize: '0.85rem' }}>{photo.label}</strong>
                  </div>
                  <div style={{ width: '100%', height: '180px', overflow: 'hidden', background: '#f8fbff' }}>
                    <SecureImage src={photo.src} alt={`Foto ${photo.label}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CHECKLIST ITEM HASIL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>
              Checklist Pengerjaan Item Ruangan
            </h3>
            {selectedSubmission.results && selectedSubmission.results.map((result, idx) => (
              <div key={result.id} className="glass-card" style={{ padding: '14px 18px', margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>
                    #{idx + 1} - {result.checklist_item?.name || 'Item Checklist'}
                  </h4>
                  {result.status ? (
                    <span className="status-badge status-completed">✅ Dibersihkan</span>
                  ) : (
                    <span className="status-badge status-pending">⚪ Belum/Tidak</span>
                  )}
                </div>

                {result.notes && (
                  <div style={{ marginTop: '8px', background: 'rgba(14, 49, 146, 0.04)', padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', display: 'flex', gap: '8px' }}>
                    <MessageSquare size={14} style={{ color: 'var(--secondary)', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ color: 'var(--text-secondary)' }}>Catatan CS: </strong>
                      <span>{result.notes}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bahan & Alat yang Digunakan CS */}
          {selectedSubmission.materials && selectedSubmission.materials.length > 0 && (
            <div style={{ marginBottom: '20px', background: 'rgba(15, 118, 110, 0.04)', border: '1px solid rgba(15, 118, 110, 0.15)', padding: '14px 18px', borderRadius: 'var(--radius-xl)' }}>
              <label className="form-label" style={{ fontWeight: 700, color: 'var(--success)' }}>
                Bahan Pembersih &amp; Alat yang Digunakan CS (Kepatuhan GMP / HACCP):
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                {selectedSubmission.materials.map((m) => (
                  <span key={m.id} className="status-badge status-completed" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                    ✓ {m.nama_material} ({m.jenis})
                  </span>
                ))}
              </div>
            </div>
          )}

          {selectedSubmission.notes && (
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Catatan Petugas CS saat Menyerahkan:</label>
              <div style={{ background: 'rgba(0,0,0,0.03)', padding: '12px 14px', borderRadius: 'var(--radius-lg)', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {selectedSubmission.notes}
              </div>
            </div>
          )}

          {/* SLA Scorecard Quantitative Grading */}
          {slaParams.length > 0 && (
            <div style={{ marginBottom: '24px', background: 'rgba(14, 49, 146, 0.03)', border: '1px solid rgba(14, 49, 146, 0.12)', padding: '18px 20px', borderRadius: 'var(--radius-xl)' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: 'var(--primary)', fontWeight: 700 }}>
                Scorecard Penilaian Mutu SLA Kebersihan
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>
                Berikan skor standar kebersihan ruangan ini sebelum menyetujui laporan:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {slaParams.map((param) => (
                  <div
                    key={param.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                      background: 'white',
                      padding: '10px 16px',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid rgba(14, 49, 146, 0.08)'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{param.nama_parameter}</strong>
                      {param.deskripsi && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{param.deskripsi}</div>
                      )}
                    </div>

                    <div>
                      {param.tipe_penilaian === 'scale_1_5' ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {['1', '2', '3', '4', '5'].map((val) => {
                            const isSelected = (slaRatings[param.id] || '5') === val;
                            return (
                              <button
                                type="button"
                                key={val}
                                onClick={() => setSlaRatings({ ...slaRatings, [param.id]: val })}
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '8px',
                                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                                  background: isSelected ? 'var(--primary)' : 'white',
                                  color: isSelected ? 'white' : 'var(--text-secondary)',
                                  fontWeight: 800,
                                  fontSize: '0.9rem',
                                  cursor: 'pointer',
                                }}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setSlaRatings({ ...slaRatings, [param.id]: 'yes' })}
                            className={`btn btn-sm ${slaRatings[param.id] === 'yes' ? 'btn-success' : 'btn-secondary'}`}
                            style={{ fontWeight: 700 }}
                          >
                            ✓ Ya (Sesuai SOP)
                          </button>
                          <button
                            type="button"
                            onClick={() => setSlaRatings({ ...slaRatings, [param.id]: 'no' })}
                            className={`btn btn-sm ${slaRatings[param.id] === 'no' ? 'btn-danger' : 'btn-secondary'}`}
                            style={{ fontWeight: 700 }}
                          >
                            ✕ Tidak Sesuai
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback Form */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              Catatan Verifikasi / Alasan Penolakan <span style={{ color: 'var(--danger)', fontWeight: 400 }}>(Wajib diisi jika Anda menolak laporan)</span>
            </label>
            <textarea 
              className="form-control" 
              rows="3" 
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Contoh jika disetujui: Hasil bersih dan rapi. Contoh jika ditolak: Sudut kiri masih kotor, tolong dipel ulang..."
              disabled={processing}
            />
          </div>

          {/* ACTION BUTTONS — BESAR & JELAS */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
              KEPUTUSAN VERIFIKASI ANDA:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <button 
                type="button" 
                className="btn btn-success btn-lg"
                onClick={handleApprove}
                disabled={processing}
                style={{ fontWeight: 800, fontSize: '1rem', boxShadow: '0 4px 16px rgba(15, 118, 110, 0.25)' }}
              >
                {processing ? 'Memproses...' : '✅ Setujui Laporan Ini (Approve)'}
              </button>
              <button 
                type="button" 
                className="btn btn-danger btn-lg"
                onClick={handleReject}
                disabled={processing || feedback.trim().length < 5}
                style={{ fontWeight: 800, fontSize: '1rem' }}
                title={feedback.trim().length < 5 ? "Harap tulis catatan alasan penolakan di atas terlebih dahulu" : "Tolak laporan ini"}
              >
                {processing ? 'Memproses...' : '❌ Tolak & Minta Perbaikan Ulang'}
              </button>
            </div>
            {feedback.trim().length < 5 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                * Tombol Tolak akan aktif otomatis setelah Anda mengetik alasan penolakan di kotak catatan di atas.
              </p>
            )}
          </div>
        </div>
      )}

      {/* LIST PENDING SUBMISSIONS */}
      {!selectedSubmission && (
        <div>
          {loading ? (
            <div className="loading-state">
              <div className="spinner" style={{ width: '36px', height: '36px' }}></div>
              <div className="loading-state-text">⏳ Memuat antrean verifikasi laporan...</div>
            </div>
          ) : (
            <>
              {/* Tampilan Desktop (Tabel) */}
              <div className="desktop-view">
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Gedung &amp; Ruangan</th>
                        <th>Petugas CS</th>
                        <th className="col-hide-mobile">Shift Kerja</th>
                        <th>Waktu Penyerahan</th>
                        <th className="col-hide-mobile">Catatan CS</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map(sub => {
                        const roomName = sub.task?.room?.name || sub.task?.nama_ruangan || '-';
                        const roomCode = sub.task?.room?.code || sub.task?.kode_ruangan || '-';
                        const buildingName = sub.task?.room?.building?.name || '-';
                        const csName = sub.user?.name || sub.cs_name || '-';
                        const csInitial = csName !== '-' ? csName.charAt(0).toUpperCase() : '?';
                        const shiftName = sub.task?.shift?.name || sub.task?.nama_shift || 'Shift 1';
                        const submittedAt = sub.submission_time || sub.submitted_at || null;
                        const dateStr = submittedAt ? submittedAt.split('T')[0].split(' ')[0] : '-';
                        const timeStr = submittedAt ? (submittedAt.includes('T') ? submittedAt.split('T')[1]?.substring(0,5) : submittedAt.split(' ')[1]?.substring(0,5) || '-') : '-';

                        return (
                        <tr key={sub.id}>
                          <td style={{ fontWeight: 700 }}>
                            <div style={{ fontSize: '0.95rem' }}>{roomName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>Kode: {roomCode} | Gedung: {buildingName}</div>
                          </td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <span className="user-avatar" style={{ width: '28px', height: '28px', fontSize: '0.75rem', flexShrink: 0 }}>{csInitial}</span>
                              <strong style={{ fontSize: '0.9rem' }}>{csName}</strong>
                            </span>
                          </td>
                          <td className="col-hide-mobile">
                            <span className="status-badge status-in_progress">{shiftName}</span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{dateStr}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pukul {timeStr}</div>
                          </td>
                          <td className="col-hide-mobile" style={{ color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sub.notes || sub.catatan_cs || '-'}
                          </td>
                          <td>
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => setSelectedSubmission(sub)}
                              style={{ display: 'inline-flex', gap: '6px', fontWeight: 700 }}
                            >
                              <Eye size={14} /> Tinjau &amp; Verifikasi
                            </button>
                          </td>
                        </tr>
                        );
                      })}
                      {submissions.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                            <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🎉</div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Semua Laporan Sudah Terverifikasi</h3>
                            <p style={{ margin: 0, fontSize: '0.85rem' }}>Tidak ada antrean laporan yang menunggu persetujuan Anda saat ini.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tampilan Mobile (Kartu / Cards) */}
              <div className="mobile-view">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {submissions.map(sub => {
                    const roomName = sub.task?.room?.name || sub.task?.nama_ruangan || '-';
                    const roomCode = sub.task?.room?.code || sub.task?.kode_ruangan || '-';
                    const buildingName = sub.task?.room?.building?.name || '-';
                    const csName = sub.user?.name || sub.cs_name || '-';
                    const csInitial = csName !== '-' ? csName.charAt(0).toUpperCase() : '?';
                    const shiftName = sub.task?.shift?.name || sub.task?.nama_shift || 'Shift 1';
                    const submittedAt = sub.submission_time || sub.submitted_at || null;
                    const dateStr = submittedAt ? submittedAt.split('T')[0].split(' ')[0] : '-';
                    const timeStr = submittedAt ? (submittedAt.includes('T') ? submittedAt.split('T')[1]?.substring(0,5) : submittedAt.split(' ')[1]?.substring(0,5) || '-') : '-';

                    return (
                      <div 
                        key={sub.id} 
                        className="task-card-mobile"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div>
                            <div className="task-card-title">{roomName}</div>
                            <div className="task-card-sub">{buildingName} • Kode: {roomCode}</div>
                          </div>
                          <span className="status-badge status-in_progress" style={{ fontSize: '0.72rem' }}>{shiftName}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', padding: '8px 0', borderTop: '1px dashed var(--border-color)', borderBottom: '1px dashed var(--border-color)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span className="user-avatar" style={{ width: '22px', height: '22px', fontSize: '0.65rem', flexShrink: 0 }}>{csInitial}</span>
                            <strong>{csName}</strong>
                          </span>
                          <span style={{ color: 'var(--text-secondary)' }}>{dateStr} ({timeStr})</span>
                        </div>

                        {sub.notes && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.03)', padding: '8px 12px', borderRadius: 'var(--radius-md)', lineHeight: '1.4' }}>
                            <strong>Catatan CS:</strong> {sub.notes}
                          </div>
                        )}

                        <button 
                          className="btn btn-primary"
                          onClick={() => setSelectedSubmission(sub)}
                          style={{ width: '100%', fontWeight: 700, marginTop: '4px' }}
                        >
                          <Eye size={16} /> Tinjau &amp; Verifikasi Laporan
                        </button>
                      </div>
                    );
                  })}
                  {submissions.length === 0 && (
                    <div className="glass-panel" style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🎉</div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Semua Laporan Terverifikasi</h3>
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>Tidak ada antrean laporan kebersihan saat ini.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
