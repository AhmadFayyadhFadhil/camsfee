import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { Play, Camera, CheckCircle, ShieldAlert, X, Sparkles } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

export default function CsAdhocTasks({ onResumeDailyTasks }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Submit Modal & Live Camera States
  const [activeTask, setActiveTask] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [liveTime, setLiveTime] = useState('');
  const [gpsState, setGpsState] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    ready: false,
    error: null,
  });

  const getGeolocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({
          latitude: null,
          longitude: null,
          accuracy: null,
          ready: false,
          error: 'Geolocation tidak didukung browser.',
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            ready: true,
            error: null,
          });
        },
        (err) => {
          console.error('Error getting geolocation:', err);
          resolve({
            latitude: null,
            longitude: null,
            accuracy: null,
            ready: false,
            error: err.message || 'Gagal mendapatkan lokasi GPS.',
          });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  };

  const getFormattedDateTime = () => {
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const day = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${minutes}:${seconds} WIB`;
  };

  const drawWatermark = (imageElement, gps) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = imageElement.naturalWidth || imageElement.width;
    canvas.height = imageElement.naturalHeight || imageElement.height;
    
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    
    const overlayHeight = Math.max(64, canvas.height * 0.18);
    const paddingX = Math.max(14, canvas.width * 0.03);
    const paddingY = Math.max(12, canvas.height * 0.03);
    const fontSize = Math.max(12, canvas.height * 0.034);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, canvas.height - overlayHeight, canvas.width, overlayHeight);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = `${fontSize}px Arial, sans-serif`;
    ctx.textBaseline = 'top';
    
    const dateText = `Waktu: ${getFormattedDateTime()}`;
    const latText = gps.ready && gps.latitude !== null ? `Lat: ${gps.latitude.toFixed(7)}` : 'Lat: -';
    const lngText = gps.ready && gps.longitude !== null ? `Lng: ${gps.longitude.toFixed(7)}` : 'Lng: -';
    const accuracyText = gps.ready && gps.accuracy !== null ? `Akurasi: ${gps.accuracy.toFixed(1)} m` : 'Akurasi: -';
    const lineHeight = fontSize * 1.3;
    
    ctx.fillText(dateText, paddingX, canvas.height - overlayHeight + paddingY);
    ctx.fillText(latText, paddingX, canvas.height - overlayHeight + paddingY + lineHeight);
    ctx.fillText(lngText, paddingX, canvas.height - overlayHeight + paddingY + lineHeight * 2);
    ctx.fillText(accuracyText, paddingX, canvas.height - overlayHeight + paddingY + lineHeight * 3);
    
    ctx.fillStyle = '#22c55e';
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText('CAMS GPS Proof', canvas.width - paddingX, canvas.height - paddingY - fontSize);
    ctx.textAlign = 'left';
    
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        try {
          const compressed = await compressImage(blob, 1600, 1000 * 1024);
          resolve(compressed || blob);
        } catch (e) {
          resolve(blob);
        }
      }, 'image/jpeg', 0.85);
    });
  };

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

  const startLiveCamera = async () => {
    setCameraError(null);
    setProofFile(null);
    setProofPreview(null);
    setCameraActive(true);

    const gps = await getGeolocation();
    setGpsState(gps);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      setCameraStream(stream);

      setTimeout(() => {
        const videoElement = document.getElementById('adhoc-camera-video');
        if (videoElement) {
          videoElement.srcObject = stream;
        }
      }, 300);
    } catch (err) {
      console.error('Error opening live camera:', err);
      setCameraError('Gagal mengakses kamera. Pastikan izin kamera aktif pada browser Anda.');
    }
  };

  const stopLiveCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const handleOpenSubmitModal = (task) => {
    setActiveTask(task);
    setProofFile(null);
    setProofPreview(null);
    setCameraError(null);
    startLiveCamera();
  };

  const handleCloseModal = () => {
    stopLiveCamera();
    setActiveTask(null);
    setProofFile(null);
    setProofPreview(null);
    setCameraError(null);
  };

  const handleCaptureSnapshot = async () => {
    const videoElement = document.getElementById('adhoc-camera-video');
    if (!videoElement) {
      setCameraError('Kamera tidak aktif.');
      return;
    }

    try {
      const gps = gpsState.ready ? gpsState : await getGeolocation();
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      const img = new Image();
      img.src = canvas.toDataURL('image/jpeg');
      await new Promise(resolve => img.onload = resolve);

      const watermarkedBlob = await drawWatermark(img, gps);
      setProofFile(watermarkedBlob);
      setProofPreview(URL.createObjectURL(watermarkedBlob));

      stopLiveCamera();
    } catch (err) {
      console.error('Error capturing snapshot:', err);
      setCameraError('Gagal mengambil foto dari kamera.');
    }
  };

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!proofFile) {
      setCameraError('Wajib mengambil 1 foto bukti langsung dari kamera.');
      return;
    }

    setSubmitting(true);
    setCameraError(null);

    const formData = new FormData();
    formData.append('foto_bukti', proofFile, 'bukti_adhoc.jpg');

    try {
      const res = await api.post(`/adhoc-tasks/${activeTask.id}/submit`, formData);
      if (res.success) {
        setSuccessMsg('Tugas mendadak berhasil diserahkan! Sistem secara otomatis mengembalikan Anda ke tugas rutin harian.');
        handleCloseModal();
        fetchMyAdhocTasks();

        // Auto-Resume: setelah 1.5 detik panggil onResumeDailyTasks jika tersedia
        if (onResumeDailyTasks) {
          setTimeout(() => {
            onResumeDailyTasks();
          }, 1500);
        }
      }
    } catch (err) {
      setCameraError(err.message || 'Gagal menyerahkan bukti tugas mendadak.');
    } finally {
      setSubmitting(false);
    }
  };

  // Live timer ticker saat kamera aktif
  useEffect(() => {
    let intervalId;
    if (activeTask && cameraActive) {
      setLiveTime(getFormattedDateTime());
      intervalId = setInterval(() => {
        setLiveTime(getFormattedDateTime());
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeTask, cameraActive]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  return (
    <div className="container-fluid">
      <div className="flex-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 800 }}>
            Tugas Mendadak
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
          Alur Pengerjaan Tugas Mendadak:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '8px' }}>
          <div style={{ background: 'white', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
            <strong style={{ fontSize: '0.82rem', color: '#b45309' }}>1. Tekan "Mulai Tugas"</strong>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Status tugas berubah jadi dikerjakan</div>
          </div>
          <div style={{ background: 'white', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
            <strong style={{ fontSize: '0.82rem', color: '#b45309' }}>2. Ambil 1 Foto Bukti</strong>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Foto kondisi setelah bersih</div>
          </div>
          <div style={{ background: 'white', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
            <strong style={{ fontSize: '0.82rem', color: 'var(--success)' }}>3. Otomatis Lanjut Harian</strong>
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
                      {task.priority === 'high' ? 'Prioritas Tinggi' : 'Prioritas Normal'}
                    </span>
                    
                    {task.status === 'pending' && <span className="status-badge status-pending">Belum Dimulai</span>}
                    {task.status === 'in_progress' && <span className="status-badge status-in_progress">Sedang Dikerjakan</span>}
                    {task.status === 'submitted' && <span className="status-badge status-waiting_verification">Menunggu Verifikasi</span>}
                    {task.status === 'verified' && <span className="status-badge status-completed">Selesai</span>}
                    {task.status === 'rejected' && <span className="status-badge status-rejected">Perlu Diulang</span>}
                  </div>
                  
                  <h3 style={{ margin: '4px 0', fontSize: '1.25rem', fontWeight: 800 }}>{task.judul}</h3>
                  <p style={{ color: 'var(--text-secondary)', margin: '6px 0 12px 0', fontSize: '0.92rem', lineHeight: 1.5 }}>
                    {task.deskripsi}
                  </p>
                  {task.room_name && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, background: 'rgba(14, 49, 146, 0.05)', padding: '6px 12px', borderRadius: 'var(--radius-md)', width: 'fit-content' }}>
                      Lokasi: {task.room_name} ({task.building_name})
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
                      style={{ width: '100%', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Camera size={18} /> Ambil Foto &amp; Kirim
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

      {/* Modal Ambil Foto Bukti Langsung dari Live Camera */}
      {activeTask && (
        <div className="confirm-backdrop" onClick={handleCloseModal}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '92vw', padding: '20px', borderRadius: 'var(--radius-xl)', background: 'white' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>BUKTI PENYELESAIAN LANGSUNG</span>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>{activeTask.judul}</h2>
              </div>
              <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {cameraError && (
              <div className="alert alert-danger" style={{ marginBottom: '14px', padding: '10px 14px', fontSize: '0.82rem' }}>
                <ShieldAlert size={16} />
                <span>{cameraError}</span>
              </div>
            )}

            {!proofPreview ? (
              <div>
                {/* LIVE CAMERA VIEWPORT */}
                <div style={{ 
                  background: '#0a0e17', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  position: 'relative',
                  aspectRatio: '4/3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px'
                }}>
                  <video 
                    id="adhoc-camera-video" 
                    autoPlay 
                    playsInline 
                    style={{ 
                      width: '100%', 
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  ></video>
                  
                  {/* Floating Overlay GPS & Time */}
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: 'rgba(0,0,0,0.65)',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.72rem',
                    color: 'white',
                    zIndex: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    lineHeight: '1.2'
                  }}>
                    <div>GPS: {gpsState.ready ? `${gpsState.latitude?.toFixed(4)}, ${gpsState.longitude?.toFixed(4)}` : 'Mencari GPS...'}</div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '3px', marginTop: '2px', fontSize: '0.68rem', color: '#10b981', fontWeight: 600 }}>
                      {liveTime}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={handleCloseModal}
                    style={{ flex: 1 }}
                  >
                    Batal
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={handleCaptureSnapshot}
                    style={{ flex: 2, height: '44px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <Camera size={18} /> Ambil Foto
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitProof}>
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                  <img
                    src={proofPreview}
                    alt="Bukti Foto"
                    style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: 'var(--radius-lg)', border: '2px solid var(--success)' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={startLiveCamera}
                    style={{ position: 'absolute', bottom: '10px', right: '10px', fontWeight: 700 }}
                  >
                    Foto Ulang
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal} disabled={submitting} style={{ flex: 1 }}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 2, height: '44px', fontWeight: 700 }}>
                    {submitting ? 'Mengirim...' : 'Kirim & Selesai'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
