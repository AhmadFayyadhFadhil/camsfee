import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { 
  Check, 
  X, 
  ShieldAlert, 
  ShieldCheck,
  AlertCircle, 
  MessageSquare, 
  Eye, 
  ArrowLeft, 
  Camera, 
  CheckCircle2,
  Lock,
  Unlock,
  QrCode,
  MapPin,
  RefreshCw,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { Html5Qrcode } from 'html5-qrcode';
import { compressImage } from '../utils/imageCompressor';

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
          cursor: 'pointer',
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
            zIndex: 10000,
            cursor: 'zoom-out'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <img 
              src={imgUrl} 
              alt={alt} 
              style={{
                maxWidth: '100%',
                maxHeight: '90vh',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.1)'
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

  // On-Site Scan-to-Verify & Physical Inspection States
  const [isQrUnlocked, setIsQrUnlocked] = useState(false);
  const [scannedQrCode, setScannedQrCode] = useState(null);
  const [qrScannedAt, setQrScannedAt] = useState(null);
  const [inspectionPhotoBlob, setInspectionPhotoBlob] = useState(null);
  const [inspectionPhotoPreview, setInspectionPhotoPreview] = useState(null);
  const [supervisorGps, setSupervisorGps] = useState({ latitude: null, longitude: null, ready: false });

  // Live Camera Scanner States (Supervisor)
  const [showSupervisorScanner, setShowSupervisorScanner] = useState(false);
  const [html5QrCodeInstance, setHtml5QrCodeInstance] = useState(null);
  const [scannerError, setScannerError] = useState(null);

  // Live Physical Photo Capture States (Supervisor)
  const [showSupervisorCamera, setShowSupervisorCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [liveSupervisorTime, setLiveSupervisorTime] = useState('');

  const currentUser = api.getUser() || {};

  const fetchPendingSubmissions = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const subsRes = await api.get('/verifications/pending');
      if (subsRes.success) {
        setSubmissions(subsRes.data.data || subsRes.data || []);
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

  // Format submission time into accurate local Indonesian time (WIB)
  const formatSubmissionTime = (sub) => {
    if (!sub) return '-';
    const timeStr = sub.submitted_at || sub.submission_time;
    if (!timeStr) return '-';

    try {
      // Jika string waktu sudah memiliki WIB di ujungnya
      if (typeof timeStr === 'string' && timeStr.includes('WIB')) {
        return timeStr;
      }

      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const month = monthNames[d.getMonth()];
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day} ${month} ${year} • ${hours}:${minutes} WIB`;
      }
    } catch (e) {
      // ignore
    }

    return String(timeStr).replace('T', ' ').substring(0, 16);
  };

  // Reset On-Site Verification State when opening a new submission
  const handleSelectSubmission = (sub) => {
    setSelectedSubmission(sub);
    setFeedback('');
    setError(null);
    setIsQrUnlocked(false);
    setScannedQrCode(null);
    setQrScannedAt(null);
    setInspectionPhotoBlob(null);
    setInspectionPhotoPreview(null);
  };

  // Helper format datetime for watermark
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

  // Geolocation fetcher
  const getGeolocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ latitude: null, longitude: null, ready: false });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            ready: true,
          });
        },
        () => {
          resolve({ latitude: null, longitude: null, ready: false });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  };

  // --- SUPERVISOR QR SCANNER (SCAN-TO-VERIFY) ---
  const handleStartSupervisorScan = () => {
    setScannerError(null);
    setShowSupervisorScanner(true);
  };

  const handleStopSupervisorScan = async () => {
    if (html5QrCodeInstance && html5QrCodeInstance.isScanning) {
      try {
        await html5QrCodeInstance.stop();
      } catch (e) {
        console.error('Error stopping QR scanner:', e);
      }
    }
    setShowSupervisorScanner(false);
    setHtml5QrCodeInstance(null);
  };

  useEffect(() => {
    if (showSupervisorScanner) {
      const qrScannerId = 'supervisor-qr-reader';
      const html5QrCode = new Html5Qrcode(qrScannerId);
      setHtml5QrCodeInstance(html5QrCode);

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      html5QrCode.start(
        { facingMode: 'environment' },
        config,
        async (decodedText) => {
          // QR Decoded!
          const cleanText = decodedText.trim();
          const targetRoomCode = (selectedSubmission?.task?.room?.code || '').trim();
          const targetRoomId = (selectedSubmission?.task?.room?.id || '').trim();
          const targetRoomName = selectedSubmission?.task?.room?.name || 'Ruangan Terkait';

          if (cleanText === targetRoomCode || cleanText === targetRoomId) {
            // MATCH!
            await handleStopSupervisorScan();
            setIsQrUnlocked(true);
            setScannedQrCode(cleanText);
            setQrScannedAt(new Date().toISOString());

            const gps = await getGeolocation();
            setSupervisorGps(gps);

            setSuccessMsg(`Lokasi fisik terkonfirmasi: Ruang ${targetRoomName}! Kunci persetujuan dibuka.`);
          } else {
            setScannerError(`QR Code ruangan tidak cocok! Anda memindai '${cleanText}', sedangkan laporan ini adalah untuk ruang '${targetRoomName}' (${targetRoomCode}).`);
          }
        },
        (errorMessage) => {
          // Frame read fail (ignored)
        }
      ).catch((err) => {
        console.error('Camera QR start error:', err);
        setScannerError('Gagal mengakses kamera scanner. Pastikan izin kamera aktif.');
      });
    }

    return () => {
      if (html5QrCodeInstance && html5QrCodeInstance.isScanning) {
        html5QrCodeInstance.stop().catch((err) => console.error(err));
      }
    };
  }, [showSupervisorScanner]);

  // --- SUPERVISOR PHYSICAL INSPECTION PHOTO CAMERA ---
  const handleOpenSupervisorCamera = async () => {
    setError(null);
    setShowSupervisorCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      setCameraStream(stream);

      setTimeout(() => {
        const video = document.getElementById('supervisor-video');
        if (video) {
          video.srcObject = stream;
        }
      }, 300);
    } catch (err) {
      console.error('Error starting supervisor camera:', err);
      setError('Gagal mengakses kamera fisik. Silakan izinkan akses kamera pada browser Anda.');
      setShowSupervisorCamera(false);
    }
  };

  const handleCloseSupervisorCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    setCameraStream(null);
    setShowSupervisorCamera(false);
  };

  useEffect(() => {
    let timer;
    if (showSupervisorCamera) {
      setLiveSupervisorTime(getFormattedDateTime());
      timer = setInterval(() => {
        setLiveSupervisorTime(getFormattedDateTime());
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showSupervisorCamera]);

  const handleCaptureInspectionPhoto = async () => {
    const video = document.getElementById('supervisor-video');
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw Supervisor Watermark
    const overlayHeight = Math.max(64, canvas.height * 0.18);
    const paddingX = Math.max(14, canvas.width * 0.03);
    const paddingY = Math.max(12, canvas.height * 0.03);
    const fontSize = Math.max(12, canvas.height * 0.034);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, canvas.height - overlayHeight, canvas.width, overlayHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = `${fontSize}px Arial, sans-serif`;
    ctx.textBaseline = 'top';

    const roomName = selectedSubmission?.task?.room?.name || 'Ruangan';
    const verifierName = currentUser.full_name || currentUser.name || 'Supervisor';

    ctx.fillText(`Inspeksi Fisik: ${roomName} (${selectedSubmission?.task?.room?.code || ''})`, paddingX, canvas.height - overlayHeight + paddingY);
    ctx.fillText(`Supervisor: ${verifierName}`, paddingX, canvas.height - overlayHeight + paddingY + fontSize * 1.3);
    ctx.fillText(`Waktu Cek: ${getFormattedDateTime()}`, paddingX, canvas.height - overlayHeight + paddingY + fontSize * 2.6);

    ctx.fillStyle = '#22c55e';
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText('CAMS On-Site Verified', canvas.width - paddingX, canvas.height - paddingY - fontSize);
    ctx.textAlign = 'left';

    canvas.toBlob(async (blob) => {
      try {
        const compressed = await compressImage(blob, 1600, 1000 * 1024);
        setInspectionPhotoBlob(compressed || blob);
        setInspectionPhotoPreview(URL.createObjectURL(compressed || blob));
        handleCloseSupervisorCamera();
        setSuccessMsg('Foto bukti inspeksi fisik di lokasi berhasil diambil!');
      } catch (e) {
        setInspectionPhotoBlob(blob);
        setInspectionPhotoPreview(URL.createObjectURL(blob));
        handleCloseSupervisorCamera();
      }
    }, 'image/jpeg', 0.85);
  };

  // --- APPROVE SUBMISSION ---
  const handleApprove = async () => {
    if (!isQrUnlocked) {
      setError('Persetujuan ditolak! Anda wajib melakukan scan QR Code ruangan di lokasi terlebih dahulu untuk membuktikan kehadiran fisik Anda.');
      return;
    }

    if (!(await confirm({
      title: 'Setujui Laporan Kebersihan (Verifikasi On-Site)',
      message: `Apakah Anda menyatakan telah memeriksa fisik ruang ${selectedSubmission.task?.room?.name} secara langsung dan menyetujui hasil kebersihannya?`,
      confirmText: 'Ya, Setujui Laporan',
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
      const formData = new FormData();
      formData.append('notes', feedback || 'Laporan disetujui setelah cek fisik di lokasi.');
      if (scannedQrCode) formData.append('room_qr_code', scannedQrCode);
      if (qrScannedAt) formData.append('qr_scanned_at', qrScannedAt);
      if (supervisorGps.latitude) formData.append('latitude', supervisorGps.latitude);
      if (supervisorGps.longitude) formData.append('longitude', supervisorGps.longitude);
      formData.append('is_onsite_verified', '1');

      if (inspectionPhotoBlob) {
        formData.append('foto_inspeksi', inspectionPhotoBlob, 'inspeksi_supervisor.jpg');
      }

      const response = await api.post(`/verifications/${subId}/approve`, formData);

      if (response.success) {
        setSubmissions(prev => prev.filter(s => s.id !== subId));
        setSuccessMsg(`Laporan kebersihan ruang ${selectedSubmission.task?.room?.name} berhasil diverifikasi & disetujui di lokasi!`);
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

  // --- REJECT SUBMISSION ---
  const handleReject = async () => {
    if (!feedback || !feedback.trim()) {
      setError('Untuk penolakan laporan, Anda wajib mengisi catatan perbaikan.');
      return;
    }

    if (!(await confirm({
      title: 'Tolak Laporan Kebersihan',
      message: 'Apakah Anda yakin ingin menolak laporan ini dan meminta CS melakukan perbaikan ulang?',
      confirmText: 'Ya, Tolak & Minta Perbaikan',
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
      <div className="flex-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 800 }}>Verifikasi Laporan Kebersihan</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Pemeriksaan hasil kerja petugas CS &amp; verifikasi fisik langsung di lokasi ruangan (*Scan-to-Verify*).
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
        <div className="alert alert-success" style={{ marginBottom: '20px' }}>
          <Check size={18} />
          <span style={{ fontWeight: 700 }}>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* DETAIL MODAL / PANEL */}
      {selectedSubmission && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-xl)', marginBottom: '30px' }}>

          <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
            <span className="status-badge status-waiting_verification" style={{ marginBottom: '6px' }}>Menunggu Verifikasi On-Site</span>
            <h2 style={{ margin: 0, fontSize: '1.35rem', marginTop: '4px', fontWeight: 800 }}>
              Ruang: {selectedSubmission.task?.room?.name} ({selectedSubmission.task?.room?.code})
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
              Gedung: <strong>{selectedSubmission.task?.room?.building?.name}</strong> | Petugas CS: <strong>{selectedSubmission.user?.name}</strong> | Waktu Serah: <strong>{formatSubmissionTime(selectedSubmission)}</strong>
            </p>
          </div>

          {/* ========================================================================= */}
          {/* BANNER 1: STATUS VERIFIKASI FISIK ON-SITE (SCAN-TO-VERIFY) */}
          {/* ========================================================================= */}
          <div 
            style={{ 
              padding: '18px 20px', 
              borderRadius: 'var(--radius-xl)', 
              marginBottom: '24px',
              background: isQrUnlocked ? 'rgba(15, 118, 110, 0.06)' : 'rgba(234, 179, 8, 0.08)',
              border: isQrUnlocked ? '1.5px solid var(--success)' : '1.5px solid #eab308',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div 
                style={{ 
                  width: '46px', 
                  height: '46px', 
                  borderRadius: '50%', 
                  background: isQrUnlocked ? 'var(--success)' : '#eab308', 
                  color: 'white', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {isQrUnlocked ? <ShieldCheck size={26} /> : <Lock size={24} />}
              </div>
              <div>
                <strong style={{ fontSize: '1rem', color: isQrUnlocked ? 'var(--success)' : '#92400e', display: 'block' }}>
                  {isQrUnlocked 
                    ? `Lokasi Fisik Terkonfirmasi: Ruang ${selectedSubmission.task?.room?.name}` 
                    : 'Pemeriksaan Lapangan Wajib Dilakukan'}
                </strong>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {isQrUnlocked 
                    ? `Kunci persetujuan terbuka. QR dipindai pada ${new Date(qrScannedAt).toLocaleTimeString('id-ID')}` 
                    : `Anda wajib mendatangi Ruang ${selectedSubmission.task?.room?.name} dan memindai QR Code fisiknya untuk membuka persetujuan.`}
                </span>
              </div>
            </div>

            {!isQrUnlocked && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStartSupervisorScan}
                style={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(14, 49, 146, 0.25)' }}
              >
                <QrCode size={18} />
                Scan QR Ruangan di Lokasi
              </button>
            )}
          </div>

          {/* FOTO BUKTI 4 SUDUT DARI PETUGAS CS */}
          <div className="glass-card" style={{ padding: '20px', marginBottom: '24px', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={18} /> Foto Bukti Pengerjaan Petugas CS (4 Sudut)
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
                    <span className="status-badge status-completed">Dibersihkan</span>
                  ) : (
                    <span className="status-badge status-pending">Belum / Tidak</span>
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

          {selectedSubmission.notes && (
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Catatan Petugas CS saat Menyerahkan:</label>
              <div style={{ background: 'rgba(0,0,0,0.03)', padding: '12px 14px', borderRadius: 'var(--radius-lg)', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {selectedSubmission.notes}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: BUKTI INSPEKSI FISIK SUPERVISOR (ON-THE-SPOT PHOTO) */}
          {/* ========================================================================= */}
          {isQrUnlocked && (
            <div className="glass-card" style={{ padding: '20px', marginBottom: '24px', background: 'rgba(15, 118, 110, 0.03)', border: '1.5px solid rgba(15, 118, 110, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <Camera size={18} /> Foto Bukti Inspeksi Fisik Supervisor (On-The-Spot)
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Ambil 1 foto kondisi fisik ruangan saat ini sebagai bukti sah inspeksi langsung di lokasi.
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleOpenSupervisorCamera}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <Camera size={15} />
                  {inspectionPhotoPreview ? 'Ambil Ulang Foto' : '📸 Ambil Foto Inspeksi Lapangan'}
                </button>
              </div>

              {inspectionPhotoPreview ? (
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <img
                    src={inspectionPhotoPreview}
                    alt="Bukti Inspeksi Fisik"
                    style={{ width: '180px', height: '120px', objectFit: 'cover', borderRadius: 'var(--radius-lg)', border: '2px solid var(--success)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <div style={{ fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={16} /> Foto Inspeksi Berhasil Ditambahkan
                    </div>
                    <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Foto telah dibubuhi watermark digital waktu &amp; nama supervisor.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', background: 'white', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Tekan tombol <strong>"Ambil Foto Inspeksi Lapangan"</strong> di atas untuk mengambil foto fisik ruangan saat Anda berada di lokasi.
                </div>
              )}
            </div>
          )}

          {/* Feedback Form */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              Catatan Verifikasi Supervisor <span style={{ color: 'var(--danger)', fontWeight: 400 }}>(Wajib diisi jika menolak laporan)</span>
            </label>
            <textarea 
              className="form-control" 
              rows="3" 
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Contoh jika disetujui: Hasil bersih, wangi, dan rapi sesuai SOP. Contoh jika ditolak: Sudut kiri masih kotor, tolong dipel ulang..."
              disabled={processing}
            />
          </div>

          {/* ACTION BUTTONS — BESAR & JELAS */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
              KEPUTUSAN VERIFIKASI SUPERVISOR:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              
              {/* TOMBOL APPROVE (TERKUNCI JIKA BELUM SCAN QR) */}
              <button 
                type="button" 
                className={`btn ${isQrUnlocked ? 'btn-success' : 'btn-secondary'} btn-lg`}
                onClick={handleApprove}
                disabled={processing || !isQrUnlocked}
                style={{ 
                  fontWeight: 800, 
                  fontSize: '1rem', 
                  boxShadow: isQrUnlocked ? '0 4px 16px rgba(15, 118, 110, 0.25)' : 'none', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px',
                  opacity: isQrUnlocked ? 1 : 0.6,
                  cursor: isQrUnlocked ? 'pointer' : 'not-allowed'
                }}
                title={isQrUnlocked ? 'Setujui laporan kebersihan ini' : 'Anda wajib scan QR ruangan di lokasi terlebih dahulu'}
              >
                {isQrUnlocked ? <Check size={18} /> : <Lock size={18} />}
                {processing ? 'Memproses...' : isQrUnlocked ? 'Setujui Laporan Ini (Approve)' : 'Setujui (Terkunci - Wajib Scan QR)'}
              </button>

              {/* TOMBOL REJECT */}
              <button 
                type="button" 
                className="btn btn-danger btn-lg"
                onClick={handleReject}
                disabled={processing}
                style={{ fontWeight: 800, fontSize: '1rem', boxShadow: '0 4px 16px rgba(225, 29, 72, 0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <X size={18} /> Tolak &amp; Minta CS Perbaiki
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* DAFTAR ANTREAN VERIFIKASI (TABEL) */}
      {/* ========================================================================= */}
      {!selectedSubmission && (
        <div>
          {loading ? (
            <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div className="spinner" style={{ width: '36px', height: '36px', margin: '0 auto 14px' }}></div>
              <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Memuat antrean verifikasi kebersihan...</div>
            </div>
          ) : (
            <div className="table-responsive glass-panel" style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ruangan &amp; Gedung</th>
                    <th>Petugas CS</th>
                    <th>Waktu Serah Laporan</th>
                    <th>Status Verifikasi Fisik</th>
                    <th style={{ textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub.id}>
                      <td>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          {sub.task?.room?.name || 'Ruangan'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Kode: {sub.task?.room?.code || '-'} • Gedung: {sub.task?.room?.building?.name || '-'}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{sub.user?.name || sub.cs_name || 'Petugas CS'}</div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                          {formatSubmissionTime(sub)}
                        </div>
                      </td>

                      <td>
                        <span className="status-badge status-waiting_verification" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Lock size={12} />
                          Wajib Cek On-Site
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleSelectSubmission(sub)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                        >
                          <Eye size={14} />
                          Tinjau &amp; Cek Fisik
                        </button>
                      </td>
                    </tr>
                  ))}

                  {submissions.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                        <CheckCircle2 size={40} style={{ margin: '0 auto 12px', color: 'var(--success)', opacity: 0.8 }} />
                        <h4 style={{ margin: '0 0 4px', color: 'var(--text-primary)' }}>Tidak Ada Antrean Verifikasi</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>Seluruh laporan kebersihan telah diverifikasi atau belum ada laporan baru yang diserahkan CS.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: SUPERVISOR QR SCANNER DI LOKASI (PORTAL) */}
      {/* ========================================================================= */}
      {showSupervisorScanner && createPortal(
        <div className="modal-backdrop" onClick={handleStopSupervisorScan}>
          <div 
            className="glass-panel" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '520px', width: '92vw', padding: 0, overflow: 'hidden' }}
          >
            <div className="modal-header" style={{ padding: '18px 24px', margin: 0 }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Verifikasi Kehadiran Fisik
                </span>
                <h2 className="modal-title" style={{ marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <QrCode className="text-primary" size={22} />
                  Scan QR Ruangan di Lokasi
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Arahkan kamera ke QR Code di pintu ruang: <strong>{selectedSubmission?.task?.room?.name}</strong>
                </div>
              </div>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={handleStopSupervisorScan}
                title="Tutup Scanner"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px', textAlign: 'center' }}>
              {scannerError && (
                <div className="alert alert-danger" style={{ marginBottom: '16px', textAlign: 'left' }}>
                  <AlertCircle size={18} />
                  <span style={{ fontSize: '0.85rem' }}>{scannerError}</span>
                </div>
              )}

              <div 
                id="supervisor-qr-reader" 
                style={{ 
                  width: '100%', 
                  maxWidth: '360px', 
                  margin: '0 auto', 
                  borderRadius: 'var(--radius-xl)', 
                  overflow: 'hidden',
                  border: '2px solid var(--primary)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                }}
              ></div>

              <p style={{ margin: '14px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Pastikan Anda berdiri tepat di depan QR Code fisik ruangan.
              </p>
            </div>

            <div className="modal-footer" style={{ margin: 0, padding: '14px 24px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleStopSupervisorScan}
              >
                Batal
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SUPERVISOR LIVE PHYSICAL INSPECTION CAMERA (PORTAL) */}
      {/* ========================================================================= */}
      {showSupervisorCamera && createPortal(
        <div className="modal-backdrop" onClick={handleCloseSupervisorCamera}>
          <div 
            className="glass-panel" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '640px', width: '92vw', padding: 0, overflow: 'hidden' }}
          >
            <div className="modal-header" style={{ padding: '18px 24px', margin: 0 }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Bukti Fisik Lapangan
                </span>
                <h2 className="modal-title" style={{ marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Camera className="text-primary" size={22} />
                  Foto Inspeksi: {selectedSubmission?.task?.room?.name}
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Ambil foto kondisi nyata ruangan saat ini
                </div>
              </div>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={handleCloseSupervisorCamera}
                title="Tutup Kamera"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '16px', position: 'relative', background: '#000000', textAlign: 'center' }}>
              <div style={{ position: 'relative', width: '100%', maxHeight: '60vh', overflow: 'hidden', borderRadius: 'var(--radius-lg)' }}>
                <video 
                  id="supervisor-video" 
                  autoPlay 
                  playsInline 
                  muted 
                  style={{ width: '100%', height: 'auto', maxHeight: '55vh', objectFit: 'cover' }}
                />

                {/* Overlay live clock & info */}
                <div style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px', background: 'rgba(0,0,0,0.65)', color: 'white', padding: '6px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', textAlign: 'left' }}>
                  <div><strong>Lokasi:</strong> {selectedSubmission?.task?.room?.name} ({selectedSubmission?.task?.room?.code})</div>
                  <div><strong>Waktu Real-time:</strong> {liveSupervisorTime}</div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ margin: 0, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseSupervisorCamera}
              >
                Batal
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCaptureInspectionPhoto}
                style={{ fontWeight: 800, padding: '10px 24px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Camera size={18} />
                Jepret &amp; Simpan Foto
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
