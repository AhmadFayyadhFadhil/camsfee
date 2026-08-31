import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { 
  Play, 
  Camera, 
  CheckCircle, 
  ShieldAlert, 
  X, 
  ListTodo,
  CalendarDays,
  Clock,
  Home,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

export default function CsAdhocTasks({ onResumeDailyTasks }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'upcoming' | 'all'

  // Submit Modal & Live Camera States
  const [activeTask, setActiveTask] = useState(null);
  const [modalChecklist, setModalChecklist] = useState([]);
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
    ctx.fillText('CAMS Verification', canvas.width - paddingX, canvas.height - paddingY - fontSize);
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
      const res = await api.get('/adhoc-tasks?per_page=50');
      if (res.success) {
        setTasks(res.data.data || res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat tugas khusus.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyAdhocTasks();
  }, []);

  useEffect(() => {
    let timer;
    if (cameraActive) {
      timer = setInterval(() => {
        setLiveTime(getFormattedDateTime());
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cameraActive]);

  const handleStartTask = async (taskId) => {
    setError(null);
    try {
      const res = await api.post(`/adhoc-tasks/${taskId}/start`);
      if (res.success) {
        setSuccessMsg('Tugas dimulai. Silakan persiapkan kebutuhan ruangan dan ambil foto bukti setelah selesai.');
        fetchMyAdhocTasks();
      }
    } catch (err) {
      setError(err.message || 'Gagal memulai tugas.');
    }
  };

  const handleOpenSubmitModal = async (task) => {
    setActiveTask(task);
    setModalChecklist(
      task.checklist_items && task.checklist_items.length > 0
        ? JSON.parse(JSON.stringify(task.checklist_items))
        : []
    );
    setProofFile(null);
    setProofPreview(null);
    setCameraError(null);

    // Get GPS
    const gps = await getGeolocation();
    setGpsState(gps);

    startLiveCamera();
  };

  const startLiveCamera = async () => {
    try {
      setCameraError(null);
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setCameraStream(stream);
      setCameraActive(true);

      setTimeout(() => {
        const videoElem = document.getElementById('adhoc-camera-video');
        if (videoElem) {
          videoElem.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error('Error starting live camera:', err);
      setCameraError('Gagal mengakses kamera. Pastikan izin kamera aktif pada browser.');
      setCameraActive(false);
    }
  };

  const stopLiveCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const handleCloseModal = () => {
    stopLiveCamera();
    setActiveTask(null);
    setModalChecklist([]);
    setProofFile(null);
    setProofPreview(null);
  };

  const handleToggleChecklist = (index) => {
    const updated = [...modalChecklist];
    updated[index].is_done = !updated[index].is_done;
    updated[index].done_at = updated[index].is_done ? new Date().toISOString() : null;
    setModalChecklist(updated);
  };

  const handleCaptureSnapshot = async () => {
    const videoElem = document.getElementById('adhoc-camera-video');
    if (!videoElem) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElem.videoWidth || 640;
      canvas.height = videoElem.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoElem, 0, 0, canvas.width, canvas.height);

      const rawBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!rawBlob) throw new Error('Gagal mengambil gambar dari kamera.');

      // Watermark
      const imgObj = new Image();
      imgObj.src = URL.createObjectURL(rawBlob);
      await new Promise((resolve) => {
        imgObj.onload = resolve;
      });

      const watermarkedBlob = await drawWatermark(imgObj, gpsState);
      const watermarkedFile = new File([watermarkedBlob], `adhoc_proof_${Date.now()}.jpg`, { type: 'image/jpeg' });

      setProofFile(watermarkedFile);
      setProofPreview(URL.createObjectURL(watermarkedBlob));
      stopLiveCamera();
    } catch (err) {
      console.error('Error capturing snapshot:', err);
      setCameraError(err.message || 'Gagal memproses foto bukti.');
    }
  };

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!proofFile || !activeTask) {
      setError('Foto bukti pekerjaan wajib diambil.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('foto_bukti', proofFile);

      if (modalChecklist.length > 0) {
        modalChecklist.forEach((item, idx) => {
          formData.append(`checklist_items[${idx}][id]`, item.id);
          formData.append(`checklist_items[${idx}][task]`, item.task);
          formData.append(`checklist_items[${idx}][is_done]`, item.is_done ? '1' : '0');
          if (item.done_at) {
            formData.append(`checklist_items[${idx}][done_at]`, item.done_at);
          }
        });
      }

      const res = await api.postFormData(`/adhoc-tasks/${activeTask.id}/submit`, formData);
      if (res.success) {
        setSuccessMsg('Laporan tugas berhasil diserahkan ke Supervisor untuk diverifikasi.');
        handleCloseModal();
        fetchMyAdhocTasks();
        if (onResumeDailyTasks) onResumeDailyTasks();
      }
    } catch (err) {
      setError(err.message || 'Gagal mengirim laporan tugas.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter tasks by tab
  const todayStr = new Date().toISOString().slice(0, 10);
  const filteredTasks = tasks.filter((task) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'upcoming') {
      return task.task_type === 'scheduled_event' && task.due_datetime && task.due_datetime.slice(0, 10) > todayStr;
    }
    // today
    if (task.task_type === 'immediate') return true;
    if (task.task_type === 'scheduled_event') {
      return !task.due_datetime || task.due_datetime.slice(0, 10) <= todayStr;
    }
    return true;
  });

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="flex-header" style={{ marginBottom: '18px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>Tugas Khusus & Acara</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Daftar tugas insidental dan persiapan ruang meeting khusus yang ditugaskan kepada Anda
          </p>
        </div>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="alert alert-danger">
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border-color)', marginBottom: '18px', overflowX: 'auto' }}>
        <button
          className="tab-button"
          onClick={() => setActiveTab('today')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'today' ? 700 : 500,
            color: activeTab === 'today' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'today' ? '3px solid var(--primary)' : '3px solid transparent',
          }}
        >
          Tugas Aktif Hari Ini ({tasks.filter(t => t.task_type === 'immediate' || !t.due_datetime || t.due_datetime.slice(0, 10) <= todayStr).length})
        </button>
        <button
          className="tab-button"
          onClick={() => setActiveTab('upcoming')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'upcoming' ? 700 : 500,
            color: activeTab === 'upcoming' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'upcoming' ? '3px solid var(--primary)' : '3px solid transparent',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <CalendarDays size={16} /> Jadwal Acara / Meeting Mendatang ({tasks.filter(t => t.task_type === 'scheduled_event' && t.due_datetime && t.due_datetime.slice(0, 10) > todayStr).length})
        </button>
        <button
          className="tab-button"
          onClick={() => setActiveTab('all')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'all' ? 700 : 500,
            color: activeTab === 'all' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'all' ? '3px solid var(--primary)' : '3px solid transparent',
          }}
        >
          Semua Riwayat ({tasks.length})
        </button>
      </div>

      {/* Task List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner"></div></div>
      ) : filteredTasks.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
          <ListTodo size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Tidak Ada Tugas Khusus</h3>
          <p style={{ margin: 0, fontSize: '0.88rem' }}>Semua aman! Anda dapat fokus mengerjakan checklist tugas rutin harian.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredTasks.map((task) => {
            const total = task.checklist_items?.length || 0;
            const done = task.checklist_items?.filter((i) => i.is_done).length || 0;

            return (
              <div
                key={task.id}
                className="glass-panel"
                style={{
                  padding: '20px',
                  borderRadius: 'var(--radius-lg)',
                  border: task.priority === 'high' ? '1.5px solid #fca5a5' : '1px solid var(--border-color)',
                  background: '#ffffff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span
                        className="status-badge"
                        style={{
                          background: task.task_type === 'scheduled_event' ? '#eff6ff' : '#f1f5f9',
                          color: task.task_type === 'scheduled_event' ? '#1d4ed8' : '#334155',
                          fontWeight: 700,
                        }}
                      >
                        {task.task_type === 'scheduled_event' ? 'Persiapan Meeting / Acara' : 'Tugas Mendadak'}
                      </span>

                      {task.status === 'pending' && <span className="status-badge status-pending">Belum Dimulai</span>}
                      {task.status === 'in_progress' && <span className="status-badge status-in_progress">Sedang Dikerjakan</span>}
                      {task.status === 'submitted' && <span className="status-badge status-waiting_verification">Menunggu Verifikasi</span>}
                      {task.status === 'verified' && <span className="status-badge status-completed">Disetujui / Selesai</span>}
                      {task.status === 'rejected' && <span className="status-badge status-rejected">Perlu Perbaikan</span>}
                    </div>

                    <h3 style={{ margin: '4px 0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {task.judul}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', margin: '6px 0 12px 0', fontSize: '0.92rem', lineHeight: 1.5 }}>
                      {task.deskripsi}
                    </p>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.84rem' }}>
                      {task.room_name && (
                        <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: 'var(--radius-sm)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Home size={14} color="var(--primary)" />
                          <span><strong>{task.room_name}</strong> ({task.building_name})</span>
                        </div>
                      )}
                      {task.due_datetime && (
                        <div style={{ background: '#fef3c7', color: '#92400e', padding: '6px 10px', borderRadius: 'var(--radius-sm)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                          <Clock size={14} />
                          <span>Target Selesai: {task.due_datetime}</span>
                        </div>
                      )}
                      {total > 0 && (
                        <div style={{ background: '#f0fdf4', color: '#166534', padding: '6px 10px', borderRadius: 'var(--radius-sm)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                          <CheckCircle2 size={14} />
                          <span>{done}/{total} Kebutuhan Siap</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
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
                        style={{ width: '100%', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Camera size={16} /> {task.checklist_items?.length > 0 ? 'Checklist & Kirim Foto' : 'Ambil Foto Bukti'}
                      </button>
                    )}

                    {task.status === 'submitted' && (
                      <div style={{ color: '#b45309', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', background: '#fefce8', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid #fef08a' }}>
                        <CheckCircle size={16} /> Menunggu Verifikasi
                      </div>
                    )}

                    {task.status === 'verified' && (
                      <div style={{ color: '#15803d', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0' }}>
                        <CheckCircle size={16} /> Disetujui / Ruangan Siap
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CHECKLIST KEBUTUHAN & AMBIL FOTO BUKTI */}
      {/* ========================================================================= */}
      {activeTask && (
        <div className="confirm-backdrop" onClick={handleCloseModal}>
          <div 
            className="glass-panel" 
            style={{ maxWidth: '560px', width: '92vw', maxHeight: '92vh', overflowY: 'auto', padding: '24px', borderRadius: 'var(--radius-xl)', background: 'white' }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Pelaksanaan Penugasan
                </span>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{activeTask.judul}</h2>
              </div>
              <button onClick={handleCloseModal} className="modal-close-btn"><X size={20} /></button>
            </div>

            {/* Checklist Persiapan Ruangan jika ada */}
            {modalChecklist.length > 0 && (
              <div style={{ marginBottom: '18px', background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '0.88rem' }}>Centang Kebutuhan yang Sudah Disiapkan:</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700 }}>
                    {modalChecklist.filter(i => i.is_done).length} / {modalChecklist.length} Selesai
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {modalChecklist.map((item, idx) => (
                    <label
                      key={item.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 12px',
                        background: item.is_done ? '#f0fdf4' : '#ffffff',
                        border: item.is_done ? '1px solid #bbf7d0' : '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: '0.88rem',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={item.is_done}
                        onChange={() => handleToggleChecklist(idx)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                      />
                      <span style={{ color: item.is_done ? '#166534' : 'var(--text-primary)', textDecoration: item.is_done ? 'line-through' : 'none', fontWeight: item.is_done ? 600 : 400 }}>
                        {item.task}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {cameraError && (
              <div className="alert alert-danger" style={{ marginBottom: '14px', padding: '10px 14px', fontSize: '0.82rem' }}>
                <ShieldAlert size={16} />
                <span>{cameraError}</span>
              </div>
            )}

            {!proofPreview ? (
              <div>
                <strong style={{ display: 'block', marginBottom: '8px', fontSize: '0.88rem' }}>
                  Ambil Foto Bukti Kondisi Ruangan:
                </strong>
                <div style={{ 
                  background: '#0a0e17', 
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  position: 'relative',
                  aspectRatio: '4/3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px'
                }}>
                  <video id="adhoc-camera-video" autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }}></video>
                  <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.65)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', color: 'white', zIndex: 20 }}>
                    <div>GPS: {gpsState.ready ? `${gpsState.latitude?.toFixed(4)}, ${gpsState.longitude?.toFixed(4)}` : 'Mencari GPS...'}</div>
                    <div style={{ color: '#10b981', fontWeight: 600 }}>{liveTime}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal} style={{ flex: 1 }}>Batal</button>
                  <button type="button" className="btn btn-primary" onClick={handleCaptureSnapshot} style={{ flex: 2, height: '44px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Camera size={18} /> Ambil Foto Bukti
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitProof}>
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                  <img src={proofPreview} alt="Bukti Foto" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: 'var(--radius-lg)', border: '2px solid var(--success)' }} />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={startLiveCamera} style={{ position: 'absolute', bottom: '10px', right: '10px', fontWeight: 700 }}>
                    Foto Ulang
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal} disabled={submitting} style={{ flex: 1 }}>Batal</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 2, height: '44px', fontWeight: 700 }}>
                    {submitting ? 'Mengirim...' : 'Kirim Laporan Persiapan'}
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
