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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Active Verification/Detail state
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchPendingSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/verifications/pending');
      if (response.success) {
        setSubmissions(response.data.data || response.data || []);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat antrean verifikasi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingSubmissions();
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
      message: 'Apakah Anda yakin ingin menyetujui laporan kebersihan ini?',
      confirmText: 'Ya, Setujui',
      cancelText: 'Batal',
      type: 'info'
    }))) {
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await api.post(`/verifications/${selectedSubmission.id}/approve`, {
        notes: feedback || 'Laporan disetujui oleh PIC.'
      });

      if (response.success) {
        setSuccessMsg('Laporan kebersihan berhasil disetujui. Tugas selesai.');
        setSelectedSubmission(null);
        setFeedback('');
        fetchPendingSubmissions();
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

    try {
      const response = await api.post(`/verifications/${selectedSubmission.id}/reject`, {
        catatan_perbaikan: feedback
      });

      if (response.success) {
        setSuccessMsg('Laporan ditolak. Notifikasi perbaikan telah diteruskan ke petugas CS terkait.');
        setSelectedSubmission(null);
        setFeedback('');
        fetchPendingSubmissions();
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
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>Persetujuan Laporan (Verification)</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Memvalidasi hasil pengerjaan petugas CS melalui bukti 4 foto setelah pembersihan (after)</p>
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
              padding: '10px 20px', 
              fontSize: '0.88rem', 
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <ArrowLeft size={16} /> Kembali ke Daftar
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

      {/* DETAIL MODAL / PANEL */}
      {selectedSubmission && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-md)', marginBottom: '30px', border: '1px solid var(--secondary)' }}>

          <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <span className="role-badge role-supervisor">Detail Verifikasi</span>
            <h2 style={{ margin: 0, fontSize: '1.35rem', marginTop: '6px', fontWeight: 700 }}>Ruangan: {selectedSubmission.task?.room?.name} ({selectedSubmission.task?.room?.code})</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>Gedung: {selectedSubmission.task?.room?.building?.name} | Petugas CS: {selectedSubmission.user?.name}</p>
          </div>

          <div className="glass-card" style={{ padding: '20px', marginBottom: '24px', background: 'rgba(255,255,255,0.02)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>Foto Bukti Pekerjaan</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              {[
                { label: 'After 1', src: `/submissions/${selectedSubmission.id}/foto-after-1` },
                { label: 'After 2', src: `/submissions/${selectedSubmission.id}/foto-after-2` },
                { label: 'After 3', src: `/submissions/${selectedSubmission.id}/foto-after-3` },
                { label: 'After 4', src: `/submissions/${selectedSubmission.id}/foto-after-4` },
              ].map((photo) => (
                <div key={photo.label} style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.015)' }}>
                  <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.04)' }}>
                    <strong style={{ fontSize: '0.95rem' }}>{photo.label}</strong>
                  </div>
                  <div style={{ width: '100%', minHeight: '180px', maxHeight: '240px', overflow: 'hidden' }}>
                    <SecureImage src={photo.src} alt={`Foto ${photo.label}`} />
                  </div>
                </div>
              ))}
            </div>

          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>Checklist Hasil Pekerjaan</h3>
            {selectedSubmission.results && selectedSubmission.results.map((result, idx) => (
              <div key={result.id} className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>
                    #{idx + 1} - {result.checklist_item?.name || 'Item Checklist'}
                  </h4>
                  <span className={`role-badge ${result.status ? 'role-cs' : 'role-admin'}`} style={{ textTransform: 'capitalize' }}>
                    {result.status ? 'Bersih' : 'Kotor'}
                  </span>
                </div>

                {result.notes && (
                  <div style={{ marginTop: '10px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', display: 'flex', gap: '8px' }}>
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

          {selectedSubmission.notes && (
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Catatan Umum Pengiriman (Staf CS)</label>
              <textarea className="form-control" rows="2" value={selectedSubmission.notes} disabled />
            </div>
          )}

          {/* Feedback Form */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">
              Catatan Verifikasi / Alasan Penolakan <span style={{ color: 'var(--text-muted)' }}>(Wajib jika menolak, min. 10 karakter)</span>
            </label>
            <textarea 
              className="form-control" 
              rows="3" 
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Berikan feedback atau alasan jika laporan ditolak..."
              disabled={processing}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleApprove}
              disabled={processing}
              style={{ flex: 1, height: '44px' }}
            >
              {processing ? 'Memproses...' : 'Setujui (Approve)'}
            </button>
            <button 
              type="button" 
              className="btn btn-danger"
              onClick={handleReject}
              disabled={processing || feedback.trim().length < 10}
              style={{ flex: 1, height: '44px' }}
            >
              {processing ? 'Memproses...' : 'Tolak (Reject)'}
            </button>
          </div>
        </div>
      )}

      {/* LIST PENDING SUBMISSIONS */}
      {!selectedSubmission && (
        <div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              {/* Tampilan Desktop (Tabel) */}
              <div className="desktop-view">
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Gedung & Ruangan</th>
                        <th>Pengirim (CS)</th>
                        <th className="col-hide-mobile">Shift Kerja</th>
                        <th>Waktu Serah Laporan</th>
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
                        const shiftName = sub.task?.shift?.name || sub.task?.nama_shift || 'Shift';
                        const submittedAt = sub.submission_time || sub.submitted_at || null;
                        const dateStr = submittedAt ? submittedAt.split('T')[0].split(' ')[0] : '-';
                        const timeStr = submittedAt ? (submittedAt.includes('T') ? submittedAt.split('T')[1]?.substring(0,8) : submittedAt.split(' ')[1] || '-') : '-';

                        return (
                        <tr key={sub.id}>
                          <td style={{ fontWeight: 600 }}>
                            <div>{roomName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>Kode: {roomCode} | Gedung: {buildingName}</div>
                          </td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span className="user-avatar" style={{ width: '24px', height: '24px', fontSize: '0.65rem', flexShrink: 0 }}>{csInitial}</span>
                              <strong>{csName}</strong>
                            </span>
                          </td>
                          <td className="col-hide-mobile">
                            <span className="role-badge role-supervisor">{shiftName}</span>
                          </td>
                          <td>
                            <div>{dateStr}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pukul {timeStr}</div>
                          </td>
                          <td className="col-hide-mobile" style={{ color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sub.notes || sub.catatan_cs || '-'}
                          </td>
                          <td>
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => setSelectedSubmission(sub)}
                              style={{ display: 'inline-flex', gap: '4px' }}
                            >
                              <Eye size={14} /> Tinjau Laporan
                            </button>
                          </td>
                        </tr>
                        );
                      })}
                      {submissions.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                            Tidak ada laporan kebersihan yang menunggu verifikasi saat ini. Mantap!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tampilan Mobile (Kartu / Cards) */}
              <div className="mobile-view">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {submissions.map(sub => {
                    const roomName = sub.task?.room?.name || sub.task?.nama_ruangan || '-';
                    const roomCode = sub.task?.room?.code || sub.task?.kode_ruangan || '-';
                    const buildingName = sub.task?.room?.building?.name || '-';
                    const csName = sub.user?.name || sub.cs_name || '-';
                    const csInitial = csName !== '-' ? csName.charAt(0).toUpperCase() : '?';
                    const shiftName = sub.task?.shift?.name || sub.task?.nama_shift || 'Shift';
                    const submittedAt = sub.submission_time || sub.submitted_at || null;
                    const dateStr = submittedAt ? submittedAt.split('T')[0].split(' ')[0] : '-';
                    const timeStr = submittedAt ? (submittedAt.includes('T') ? submittedAt.split('T')[1]?.substring(0,8) : submittedAt.split(' ')[1] || '-') : '-';

                    return (
                      <div 
                        key={sub.id} 
                        className="glass-panel" 
                        style={{ 
                          padding: '16px', 
                          borderRadius: 'var(--radius-md)', 
                          border: '1px solid var(--border-color)', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '10px' 
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{roomName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{buildingName} • Kode: {roomCode}</div>
                          </div>
                          <span className="role-badge role-supervisor" style={{ fontSize: '0.7rem' }}>{shiftName}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '8px 0', borderTop: '1px dashed var(--border-color)', borderBottom: '1px dashed var(--border-color)', margin: '4px 0' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span className="user-avatar" style={{ width: '20px', height: '20px', fontSize: '0.65rem', flexShrink: 0 }}>{csInitial}</span>
                            <strong>{csName}</strong>
                          </span>
                          <span style={{ color: 'var(--text-secondary)' }}>Pukul {timeStr} ({dateStr})</span>
                        </div>

                        {sub.notes && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.15)', padding: '8px', borderRadius: 'var(--radius-sm)', lineHeight: '1.4' }}>
                            <strong>Catatan:</strong> {sub.notes}
                          </div>
                        )}

                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedSubmission(sub)}
                          style={{ width: '100%', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '6px', height: '36px', marginTop: '4px' }}
                        >
                          <Eye size={14} /> Tinjau Laporan
                        </button>
                      </div>
                    );
                  })}
                  {submissions.length === 0 && (
                    <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Tidak ada laporan kebersihan yang menunggu verifikasi saat ini. Mantap!
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
