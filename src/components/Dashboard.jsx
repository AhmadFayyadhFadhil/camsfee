import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { 
  Building, 
  Home, 
  CheckSquare, 
  Clock, 
  AlertOctagon, 
  FileText, 
  RefreshCw,
  Search,
  Eye,
  QrCode,
  ThumbsUp,
  AlertTriangle,
  Image as ImageIcon,
  MapPin,
  Navigation,
  ShieldCheck,
  ExternalLink,
  Camera,
  CameraOff
} from 'lucide-react';
import InspectionMapTrail from './InspectionMapTrail.jsx';

export default function Dashboard({ user, setCurrentTab, setOpenScanModalOnMount, onScanSuccess }) {
  const activeUser = user || api.getUser() || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [buildingGrid, setBuildingGrid] = useState(null);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [period, setPeriod] = useState('today');

  // CS Inline Scanner states on Dashboard
  const [inlineScannerActive, setInlineScannerActive] = useState(false);
  const [inlineScannerLoading, setInlineScannerLoading] = useState(true);
  const [inlineScannerError, setInlineScannerError] = useState(null); // Khusus kegagalan hardware/izin kamera
  const [scanErrorMsg, setScanErrorMsg] = useState(null); // Notifikasi jika QR salah / ditolak backend
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [scanSuccessMsg, setScanSuccessMsg] = useState(null);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const inlineQrCodeRef = useRef(null);
  const isProcessingScanRef = useRef(false);

  // Greeting Banner visibility (auto-dismiss after 10 seconds across all roles)
  const [showGreeting, setShowGreeting] = useState(true);
  const [isGreetingFading, setIsGreetingFading] = useState(false);

  useEffect(() => {
    setShowGreeting(true);
    setIsGreetingFading(false);

    const fadeTimer = setTimeout(() => {
      setIsGreetingFading(true);
    }, 9500);

    const removeTimer = setTimeout(() => {
      setShowGreeting(false);
    }, 10000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [user?.id]);

  useEffect(() => {
    if (scanErrorMsg) {
      const timer = setTimeout(() => setScanErrorMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [scanErrorMsg]);

  useEffect(() => {
    if (scanSuccessMsg) {
      const timer = setTimeout(() => setScanSuccessMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [scanSuccessMsg]);

  const todayFormatted = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const userRoles = activeUser.roles || [];
  const isAdminOrSupervisor = userRoles.includes('admin') || userRoles.includes('supervisor');
  const isPic = userRoles.includes('pic');
  const isCs = userRoles.includes('cleaning_service') || userRoles.includes('cs');
  const isOb = userRoles.includes('ob');

  const getDateParams = (p) => {
    const today = new Date();
    // Offset local timezone to get correct YYYY-MM-DD
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    let dateFrom = localToday.toISOString().split('T')[0];
    let dateTo = localToday.toISOString().split('T')[0];

    if (p === 'week') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(today.setDate(diff));
      const startLocal = new Date(startOfWeek.getTime() - (offset * 60 * 1000));
      dateFrom = startLocal.toISOString().split('T')[0];
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      const endLocal = new Date(endOfWeek.getTime() - (offset * 60 * 1000));
      dateTo = endLocal.toISOString().split('T')[0];
    } else if (p === 'month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startLocal = new Date(startOfMonth.getTime() - (offset * 60 * 1000));
      dateFrom = startLocal.toISOString().split('T')[0];
      
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const endLocal = new Date(endOfMonth.getTime() - (offset * 60 * 1000));
      dateTo = endLocal.toISOString().split('T')[0];
    }

    return `?date_from=${dateFrom}&date_to=${dateTo}`;
  };

  const fetchDashboardData = async (activePeriod = period, silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      let endpoint = '';
      if (isAdminOrSupervisor) {
        endpoint = '/dashboard/supervisor';
      } else if (isPic) {
        endpoint = '/dashboard/pic';
      } else if (isCs) {
        endpoint = '/dashboard/cs';
      } else if (isOb) {
        endpoint = '/dashboard/ob';
      }

      if (endpoint) {
        const queryParams = (isAdminOrSupervisor || isPic) ? getDateParams(activePeriod) : '';
        const response = await api.get(`${endpoint}${queryParams}`);
        if (response.success) {
          setData(response.data);
        }
      }
    } catch (err) {
      if (!silent) {
        setError(err.message || 'Gagal memuat data dashboard.');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchDashboardData(period);

    // Auto-refresh data secara berkala (setiap 30 detik) untuk sinkronisasi jejak inspeksi real-time
    const refreshInterval = setInterval(() => {
      fetchDashboardData(period, true);
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [user, period]);

  const viewBuildingDetails = async (buildingId) => {
    setLoadingGrid(true);
    setSelectedBuilding(buildingId);
    setBuildingGrid(null);
    try {
      const response = await api.get(`/dashboard/buildings/${buildingId}`);
      if (response.success) {
        setBuildingGrid(response.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGrid(false);
    }
  };

  const stopInlineScanner = async () => {
    if (inlineQrCodeRef.current && inlineQrCodeRef.current.isScanning) {
      try {
        await inlineQrCodeRef.current.stop();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
    }
    setInlineScannerActive(false);
  };

  const handleStopCamera = async () => {
    setIsCameraOff(true);
    setInlineScannerLoading(false);
    await stopInlineScanner();
  };

  const handleStartCamera = async () => {
    setIsCameraOff(false);
    setTimeout(() => {
      startInlineScanner();
    }, 100);
  };

  const startInlineScanner = async (cameraId = null) => {
    if (!isCs) return;
    setInlineScannerLoading(true);
    setInlineScannerError(null);
    setScanErrorMsg(null);
    isProcessingScanRef.current = false;

    try {
      if (inlineQrCodeRef.current && inlineQrCodeRef.current.isScanning) {
        try {
          await inlineQrCodeRef.current.stop();
        } catch (e) {}
      }

      const readerElement = document.getElementById("dashboard-qr-reader");
      if (!readerElement) {
        setInlineScannerLoading(false);
        return;
      }

      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      // Aktifkan Native BarcodeDetector (C++/GPU Engine) dan fokuskan pencarian hanya ke format QR Code untuk efisiensi CPU 100%
      const qrCode = new Html5Qrcode("dashboard-qr-reader", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        verbose: false
      });
      inlineQrCodeRef.current = qrCode;

      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setAvailableCameras(devices);
          if (!selectedCameraId && !cameraId) {
            const backCam = devices.find(d => 
              d.label.toLowerCase().includes('back') || 
              d.label.toLowerCase().includes('environment') || 
              d.label.toLowerCase().includes('belakang')
            );
            setSelectedCameraId(backCam ? backCam.id : devices[0].id);
          }
        }
      } catch (camErr) {
        console.warn("Could not enumerate cameras:", camErr);
      }

      const activeCamConfig = cameraId || (selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode: "environment" });

      await qrCode.start(
        activeCamConfig,
        {
          fps: 30, // Kecepatan scan 30 frame/detik (ultra-cepat)
          aspectRatio: 1.0,
          videoConstraints: {
            facingMode: { ideal: "environment" },
            focusMode: "continuous",
            width: { min: 640, ideal: 1280 },
            height: { min: 480, ideal: 720 }
          }
        },
        async (decodedText) => {
          await handleDashboardQrDetected(decodedText);
        },
        () => {} // Abaikan frame scan kosong
      );

      setInlineScannerActive(true);
      setInlineScannerLoading(false);
    } catch (err) {
      console.error("Failed to start inline camera scanner on dashboard:", err);
      setInlineScannerError(err.message || "Gagal membuka akses kamera. Harap izinkan akses kamera di browser Anda.");
      setInlineScannerLoading(false);
      setInlineScannerActive(false);
    }
  };

  const handleDashboardQrDetected = async (decodedText) => {
    if (isProcessingScanRef.current) return;
    isProcessingScanRef.current = true;
    setScanErrorMsg(null);

    try {
      const cleanText = (decodedText || '').trim();
      let scannedRoomId = '';
      let scannedToken = '';
      
      try {
        const parsed = JSON.parse(cleanText);
        scannedRoomId = parsed.room_id || '';
        scannedToken = parsed.token || '';
      } catch (e) {
        if (cleanText.includes('token=')) {
          const urlParams = new URLSearchParams(cleanText.split('?')[1] || cleanText);
          scannedRoomId = urlParams.get('room_id') || '';
          scannedToken = urlParams.get('token') || '';
        } else {
          scannedToken = cleanText;
        }
      }

      if (!scannedToken && !scannedRoomId) {
        throw new Error("QR Code tidak dikenali sebagai format CAMS. Pastikan scan stiker QR resmi di ruangan.");
      }

      // Ambil GPS dengan High Accuracy untuk verifikasi geofencing
      let currentGps = { latitude: null, longitude: null, accuracy: null };
      try {
        if (navigator.geolocation) {
          currentGps = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
              () => resolve({ latitude: null, longitude: null, accuracy: null }),
              { enableHighAccuracy: true, timeout: 3500, maximumAge: 0 }
            );
          });
        }
      } catch (e) {}

      let capturedBlob = null;
      try {
        const readerElement = document.getElementById("dashboard-qr-reader");
        const videoElement = readerElement?.querySelector("video");
        if (videoElement) {
          const canvas = document.createElement("canvas");
          canvas.width = videoElement.videoWidth || 640;
          canvas.height = videoElement.videoHeight || 480;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          capturedBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
        }
      } catch (capErr) {
        console.error("Failed to capture video frame:", capErr);
      }

      const payload = {
        room_id: scannedRoomId || undefined,
        qr_code_token: scannedToken || cleanText,
        latitude: currentGps.latitude,
        longitude: currentGps.longitude,
        accuracy: currentGps.accuracy
      };

      const response = await api.post('/submissions/scan', payload);
      if (response.success) {
        setScanSuccessMsg(`Berhasil memindai QR Ruangan: ${response.data.task?.room?.name || 'Ruangan'}. Mengalihkan ke lembar checklist...`);

        await stopInlineScanner();

        if (onScanSuccess) {
          onScanSuccess({
            task: response.data.task,
            checklist_items: response.data.checklist_items,
            barcodePhoto: capturedBlob,
            barcodePhotoName: `scanned-barcode-${(response.data.task?.id || '').substring(0, 8)}.jpg`
          });
        } else if (setCurrentTab) {
          setCurrentTab('tasks');
        }
      }
    } catch (err) {
      console.error('Error during dashboard QR decode:', err);
      setScanErrorMsg(err.message || 'QR Code tidak valid atau berada di luar jangkauan lokasi.');
      // Beri jeda 2.5 detik sebelum scan berikutnya agar tidak spam dan user bisa membaca pesan error
      setTimeout(() => {
        isProcessingScanRef.current = false;
      }, 2500);
      return;
    }
    isProcessingScanRef.current = false;
  };

  // Lifecycle Inline Scanner di Dashboard CS (hanya jalan saat mount atau toggle kamera, tidak terpengaruh auto-refresh data)
  useEffect(() => {
    let mounted = true;
    if (isCs && !loading && !isCameraOff) {
      const timer = setTimeout(() => {
        if (mounted) {
          startInlineScanner();
        }
      }, 350);

      return () => {
        mounted = false;
        clearTimeout(timer);
        stopInlineScanner();
      };
    } else {
      stopInlineScanner();
    }
  }, [isCs, loading, selectedCameraId, isCameraOff]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <AlertOctagon size={18} />
        <span>{error}</span>
        <button className="btn btn-secondary btn-sm" onClick={fetchDashboardData} style={{ marginLeft: 'auto' }}>
          Coba Lagi
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="alert alert-danger">
        <AlertOctagon size={18} />
        <span>Tidak ada data dashboard yang dapat dimuat. Pastikan Anda memiliki jadwal kerja hari ini (jika CS) atau otorisasi wilayah PIC yang tepat.</span>
      </div>
    );
  }

  // RENDER CLEANING SERVICE DASHBOARD
  if (isCs && data) {
    const summary = data.tasks_summary || {};
    const urgent = data.urgent_tasks || [];
    const todayFormatted = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
      <div>
        {/* GREETING BANNER (Auto-dismiss in 3s) */}
        {showGreeting && (
          <div className={`greeting-banner ${isGreetingFading ? 'fade-out' : ''}`}>
            <div className="greeting-name">Halo, {user?.name || 'Petugas CS'}!</div>
            <div className="greeting-date">Hari ini {todayFormatted} • Semangat bekerja dan jaga kebersihan fasilitas!</div>
          </div>
        )}

        {/* EMBEDDED INLINE QR SCANNER SECTION FOR CS DASHBOARD (MATCHING IMAGE 3) */}
        <div 
          className="glass-panel" 
          style={{ 
            padding: '32px 20px', 
            borderRadius: 'var(--radius-2xl)', 
            marginBottom: '28px', 
            textAlign: 'center',
            background: 'linear-gradient(180deg, #ffffff 0%, rgba(14, 49, 146, 0.02) 100%)',
            border: '1.5px solid rgba(14, 49, 146, 0.12)',
            boxShadow: '0 8px 30px rgba(14, 49, 146, 0.06)'
          }}
        >
          {/* Top Icon Decoration */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'rgba(14, 49, 146, 0.08)',
            color: 'var(--primary)',
            marginBottom: '12px'
          }}>
            <QrCode size={26} />
          </div>

          <h2 style={{ 
            fontSize: '1.65rem', 
            fontWeight: 900, 
            letterSpacing: '1px', 
            margin: '0 0 6px 0', 
            color: 'var(--text-primary)',
            textTransform: 'uppercase'
          }}>
            SCAN QR DISINI
          </h2>

          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '0.92rem', 
            maxWidth: '520px', 
            margin: '0 auto 22px auto',
            lineHeight: 1.5
          }}>
            Pindai stiker kode QR yang tertempel di pintu ruangan menggunakan kamera untuk langsung membuka lembar checklist kebersihan.
          </p>

          {scanSuccessMsg && (
            <div className="alert alert-success" style={{ maxWidth: '420px', margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{scanSuccessMsg}</span>
            </div>
          )}

          {scanErrorMsg && (
            <div className="alert alert-danger" style={{ maxWidth: '420px', margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', animation: 'fadeIn 0.25s ease' }}>
              <AlertTriangle size={20} style={{ flexShrink: 0, color: '#ef4444' }} />
              <span style={{ fontSize: '0.85rem' }}>{scanErrorMsg}</span>
            </div>
          )}

          {/* Camera Viewport Container with HUD Corners */}
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '360px',
            margin: '0 auto',
            borderRadius: '24px',
            overflow: 'hidden',
            background: '#070a13',
            boxShadow: isCameraOff ? '0 8px 24px rgba(7, 10, 19, 0.2)' : '0 12px 36px rgba(7, 10, 19, 0.35)',
            border: isCameraOff ? '2px solid rgba(148, 163, 184, 0.25)' : '2px solid rgba(16, 185, 129, 0.35)',
            minHeight: '300px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Viewport HUD Corner Brackets */}
            <div style={{ position: 'absolute', top: '14px', left: '14px', width: '26px', height: '26px', borderTop: isCameraOff ? '3px solid #64748b' : '3.5px solid #10b981', borderLeft: isCameraOff ? '3px solid #64748b' : '3.5px solid #10b981', borderTopLeftRadius: '8px', zIndex: 10, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: '14px', right: '14px', width: '26px', height: '26px', borderTop: isCameraOff ? '3px solid #64748b' : '3.5px solid #10b981', borderRight: isCameraOff ? '3px solid #64748b' : '3.5px solid #10b981', borderTopRightRadius: '8px', zIndex: 10, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '14px', left: '14px', width: '26px', height: '26px', borderBottom: isCameraOff ? '3px solid #64748b' : '3.5px solid #10b981', borderLeft: isCameraOff ? '3px solid #64748b' : '3.5px solid #10b981', borderBottomLeftRadius: '8px', zIndex: 10, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '14px', right: '14px', width: '26px', height: '26px', borderBottom: isCameraOff ? '3px solid #64748b' : '3.5px solid #10b981', borderRight: isCameraOff ? '3px solid #64748b' : '3.5px solid #10b981', borderBottomRightRadius: '8px', zIndex: 10, pointerEvents: 'none' }} />

            {/* Laser scanning beam */}
            {inlineScannerActive && !isCameraOff && (
              <div className="scanning-laser-line" />
            )}

            {/* Live Camera Scanner DOM element */}
            <div 
              id="dashboard-qr-reader" 
              style={{ width: '100%', minHeight: '300px', display: (inlineScannerActive && !isCameraOff) ? 'block' : 'none' }} 
            />

            {/* Initializing / Waiting for Camera State */}
            {inlineScannerLoading && !inlineScannerError && !isCameraOff && (
              <div style={{ padding: '30px 20px', color: '#ffffff', textAlign: 'center', zIndex: 5 }}>
                <div className="spinner" style={{ borderColor: 'rgba(16, 185, 129, 0.3)', borderTopColor: '#10b981', margin: '0 auto 16px auto', width: '38px', height: '38px' }} />
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#10b981' }}>Menginisialisasi Kamera...</div>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '6px' }}>Harap izinkan akses kamera di browser Anda</div>
              </div>
            )}

            {/* Hardware/Permission Camera Access Error State */}
            {inlineScannerError && !inlineScannerActive && !inlineScannerLoading && !isCameraOff && (
              <div style={{ padding: '30px 20px', color: '#ffffff', textAlign: 'center', zIndex: 5 }}>
                <AlertTriangle size={34} color="#ef4444" style={{ marginBottom: '12px' }} />
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ef4444' }}>Akses Kamera Terkendala</div>
                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '6px', marginBottom: '16px' }}>
                  {inlineScannerError}
                </div>
                <button 
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => startInlineScanner()}
                  style={{ fontWeight: 700 }}
                >
                  <RefreshCw size={14} /> Coba Akses Kamera Lagi
                </button>
              </div>
            )}

            {/* Standby / Camera Turned Off State */}
            {isCameraOff && (
              <div style={{ padding: '36px 20px', color: '#ffffff', textAlign: 'center', zIndex: 5 }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px',
                  border: '1.5px solid rgba(239, 68, 68, 0.3)'
                }}>
                  <CameraOff size={26} />
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>Kamera Dinonaktifkan</div>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '6px', marginBottom: '18px', maxWidth: '240px', lineHeight: 1.4 }}>
                  Kamera pemindai dimatikan. Tekan tombol di bawah untuk mengaktifkan kembali.
                </div>
                <button 
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleStartCamera}
                  style={{ 
                    fontWeight: 700, 
                    padding: '8px 18px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                    cursor: 'pointer'
                  }}
                >
                  <Camera size={16} /> Nyalakan Kamera
                </button>
              </div>
            )}
          </div>

          {/* Action options under camera: Matikan Kamera button & Device selector */}
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            {!isCameraOff && (
              <button 
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleStopCamera}
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  fontSize: '0.84rem',
                  padding: '7px 15px',
                  borderRadius: '10px',
                  color: '#ef4444',
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                  background: 'rgba(239, 68, 68, 0.06)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
                title="Matikan kamera pemindai"
              >
                <CameraOff size={15} /> Matikan Kamera
              </button>
            )}

            {availableCameras.length > 1 && !isCameraOff && (
              <select 
                className="form-control form-select"
                value={selectedCameraId}
                onChange={(e) => {
                  setSelectedCameraId(e.target.value);
                  startInlineScanner(e.target.value);
                }}
                style={{ maxWidth: '230px', fontSize: '0.84rem', height: '36px' }}
              >
                {availableCameras.map(cam => (
                  <option key={cam.id} value={cam.id}>{cam.label || `Kamera ${cam.id.substring(0, 6)}`}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* SECTION HEADER: RINGKASAN AREA TUGAS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 800 }}>Ringkasan Area Tugas</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '2px', fontSize: '0.9rem' }}>Status penugasan kebersihan area / ruangan Anda hari ini</p>
          </div>
          <button className="btn btn-secondary" onClick={fetchDashboardData} title="Perbarui data ringkasan">
            <RefreshCw size={16} /> Segarkan
          </button>
        </div>

        <div className="dashboard-grid">
          <div className="glass-card stats-card" style={{ borderLeft: '4px solid var(--primary)', background: 'rgba(14, 49, 146, 0.02)', cursor: 'pointer' }} onClick={() => setCurrentTab && setCurrentTab('tasks')} title="Klik untuk melihat semua area tugas">
            <div className="stats-icon" style={{ background: 'rgba(14, 49, 146, 0.08)', color: 'var(--primary)' }}>
              <Building size={24} />
            </div>
            <div className="stats-details">
              <span className="stats-number">{summary.total || 0}</span>
              <span className="stats-label">Total Area</span>
            </div>
          </div>

          <div className="glass-card stats-card" style={{ borderLeft: '4px solid var(--warning)', background: 'rgba(180, 83, 9, 0.03)', cursor: 'pointer' }} onClick={() => setCurrentTab && setCurrentTab('tasks')} title="Tugas yang belum Anda mulai">
            <div className="stats-icon" style={{ background: 'rgba(180, 83, 9, 0.08)', color: 'var(--warning)' }}>
              <Clock size={24} />
            </div>
            <div className="stats-details">
              <span className="stats-number">{summary.pending || 0}</span>
              <span className="stats-label">Belum Dimulai</span>
            </div>
          </div>

          <div className="glass-card stats-card" style={{ borderLeft: '4px solid #3b82f6', background: 'rgba(59, 130, 246, 0.03)', cursor: 'pointer' }} onClick={() => setCurrentTab && setCurrentTab('tasks')} title="Tugas yang sedang Anda kerjakan">
            <div className="stats-icon" style={{ background: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6' }}>
              <RefreshCw size={24} className="spinner" style={{ animationDuration: '3s' }} />
            </div>
            <div className="stats-details">
              <span className="stats-number">{summary.in_progress || 0}</span>
              <span className="stats-label">Sedang Dikerjakan</span>
            </div>
          </div>

          <div className="glass-card stats-card" style={{ borderLeft: '4px solid var(--info)', background: 'rgba(26, 75, 196, 0.03)', cursor: 'pointer' }} onClick={() => setCurrentTab && setCurrentTab('tasks')} title="Menunggu verifikasi dari PIC">
            <div className="stats-icon" style={{ background: 'rgba(26, 75, 196, 0.08)', color: 'var(--info)' }}>
              <Eye size={24} />
            </div>
            <div className="stats-details">
              <span className="stats-number">{summary.waiting_verification || 0}</span>
              <span className="stats-label">Tunggu Verifikasi</span>
            </div>
          </div>

          <div className="glass-card stats-card" style={{ borderLeft: '4px solid var(--success)', background: 'rgba(15, 118, 110, 0.03)', cursor: 'pointer' }} onClick={() => setCurrentTab && setCurrentTab('tasks')} title="Tugas yang sudah disetujui">
            <div className="stats-icon" style={{ background: 'rgba(15, 118, 110, 0.08)', color: 'var(--success)' }}>
              <CheckSquare size={24} />
            </div>
            <div className="stats-details">
              <span className="stats-number">{summary.completed || 0}</span>
              <span className="stats-label">Selesai (Approved)</span>
            </div>
          </div>

          <div className="glass-card stats-card" style={{ borderLeft: '4px solid var(--danger)', background: 'rgba(255, 0, 0, 0.03)', cursor: 'pointer' }} onClick={() => setCurrentTab && setCurrentTab('tasks')} title="Laporan yang perlu perbaikan ulang">
            <div className="stats-icon" style={{ background: 'rgba(255, 0, 0, 0.08)', color: 'var(--danger)' }}>
              <AlertOctagon size={24} />
            </div>
            <div className="stats-details">
              <span className="stats-number">{summary.rejected || 0}</span>
              <span className="stats-label">Perlu Diulang</span>
            </div>
          </div>
        </div>

        {urgent.length > 0 && (
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '24px', border: '1.5px solid rgba(220, 38, 38, 0.3)', marginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: 'var(--danger)' }}>
              <AlertOctagon size={24} />
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Tugas Mendesak (Batas Waktu &lt; 60 Menit)</h2>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kode Ruang</th>
                    <th>Nama Ruangan</th>
                    <th>Batas Waktu</th>
                    <th>Sisa Waktu</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {urgent.map(t => (
                    <tr key={t.task_id}>
                      <td style={{ fontWeight: 700 }}>{t.room_code}</td>
                      <td>{t.room_name}</td>
                      <td>{new Date(t.due_datetime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td style={{ color: 'var(--danger)', fontWeight: 800 }}>{t.minutes_left} Menit Lagi</td>
                      <td>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => setCurrentTab && setCurrentTab('tasks')}
                          style={{ fontWeight: 700 }}
                        >
                          Kerjakan Sekarang
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PANEL DETEKSI KEHADIRAN GEOFENCE LOKASI CS */}
        <InspectionMapTrail 
          isCs={true} 
          buildings={data?.assigned_buildings || []} 
          onStartScan={() => {
            if (setCurrentTab) setCurrentTab('tasks');
          }} 
        />
      </div>
    );
  }

  // RENDER OFFICE BOY DASHBOARD
  if (isOb && data) {
    const summary = data.findings_summary || {};
    const findings = data.recent_findings || [];

    return (
      <div>
        {/* GREETING BANNER (Auto-dismiss in 3s) */}
        {showGreeting && (
          <div className={`greeting-banner ${isGreetingFading ? 'fade-out' : ''}`}>
            <div className="greeting-name">Halo, {user?.name || 'Petugas OB'}!</div>
            <div className="greeting-date">Hari ini {todayFormatted} • Semangat bekerja dan pantau perbaikan fasilitas!</div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>Ringkasan Tugas OB</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Status penugasan perbaikan fasilitas Anda</p>
          </div>
          <button className="btn btn-secondary" onClick={fetchDashboardData}>
            <RefreshCw size={16} /> Segarkan
          </button>
        </div>

        <div className="dashboard-grid">
          <div className="glass-card stats-card" style={{ borderLeft: '4px solid var(--primary)', background: 'rgba(14, 49, 146, 0.02)', cursor: 'pointer' }} onClick={() => setCurrentTab && setCurrentTab('findings')}>
            <div className="stats-icon" style={{ background: 'rgba(14, 49, 146, 0.08)', color: 'var(--primary)' }}>
              <FileText size={24} />
            </div>
            <div className="stats-details">
              <span className="stats-number">{summary.total || 0}</span>
              <span className="stats-label">Total Penugasan</span>
            </div>
          </div>

          <div className="glass-card stats-card" style={{ borderLeft: '4px solid var(--warning)', background: 'rgba(180, 83, 9, 0.03)', cursor: 'pointer' }} onClick={() => setCurrentTab && setCurrentTab('findings')}>
            <div className="stats-icon" style={{ background: 'rgba(180, 83, 9, 0.08)', color: 'var(--warning)' }}>
              <Clock size={24} />
            </div>
            <div className="stats-details">
              <span className="stats-number">{summary.open || 0}</span>
              <span className="stats-label">Baru (Open)</span>
            </div>
          </div>

          <div className="glass-card stats-card" style={{ borderLeft: '4px solid #3b82f6', background: 'rgba(59, 130, 246, 0.03)', cursor: 'pointer' }} onClick={() => setCurrentTab && setCurrentTab('findings')}>
            <div className="stats-icon" style={{ background: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6' }}>
              <RefreshCw size={24} className="spinner" style={{ animationDuration: '3s' }} />
            </div>
            <div className="stats-details">
              <span className="stats-number">{summary.in_progress || 0}</span>
              <span className="stats-label">Dalam Pengerjaan</span>
            </div>
          </div>

          <div className="glass-card stats-card" style={{ borderLeft: '4px solid var(--danger)', background: 'rgba(255, 0, 0, 0.03)', cursor: 'pointer' }} onClick={() => setCurrentTab && setCurrentTab('findings')}>
            <div className="stats-icon" style={{ background: 'rgba(255, 0, 0, 0.08)', color: 'var(--danger)' }}>
              <AlertOctagon size={24} />
            </div>
            <div className="stats-details">
              <span className="stats-number">{summary.overdue || 0}</span>
              <span className="stats-label">Melewati Deadline</span>
            </div>
          </div>

          <div className="glass-card stats-card" style={{ borderLeft: '4px solid var(--success)', background: 'rgba(15, 118, 110, 0.03)', cursor: 'pointer' }} onClick={() => setCurrentTab && setCurrentTab('findings')}>
            <div className="stats-icon" style={{ background: 'rgba(15, 118, 110, 0.08)', color: 'var(--success)' }}>
              <ThumbsUp size={24} />
            </div>
            <div className="stats-details">
              <span className="stats-number">{summary.resolved || 0}</span>
              <span className="stats-label">Selesai (Resolved)</span>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ borderRadius: 'var(--radius-md)', padding: '24px', marginTop: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>Penugasan Aktif (Belum Selesai)</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ruangan</th>
                  <th>Gedung</th>
                  <th>Deskripsi Kerusakan</th>
                  <th>Prioritas</th>
                  <th>Deadline</th>
                  <th>Status SLA</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {findings.map(f => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 600 }}>{f.room_name}</td>
                    <td>{f.building_name}</td>
                    <td>{f.deskripsi}</td>
                    <td>
                      <span className={`badge badge-${f.prioritas === 'high' ? 'danger' : f.prioritas === 'medium' ? 'warning' : 'info'}`}>
                        {f.prioritas}
                      </span>
                    </td>
                    <td>{f.deadline ? new Date(f.deadline).toLocaleDateString('id-ID') : '-'}</td>
                    <td>
                      <span className={`badge badge-${f.is_overdue ? 'danger' : 'success'}`}>
                        {f.is_overdue ? 'Melewati Deadline' : 'Dalam Batas Waktu'}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => setCurrentTab && setCurrentTab('findings')}
                      >
                        Buka Temuan
                      </button>
                    </td>
                  </tr>
                ))}
                {findings.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      Tidak ada penugasan perbaikan aktif saat ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // RENDER SUPERVISOR OR PIC DASHBOARD
  const breakdown = data.breakdown_per_building || [];
  const overdue = data.overdue_tasks || [];

  const periodLabel = { today: 'hari ini', week: 'minggu ini', month: 'bulan ini' }[period] || 'hari ini';
  const monthYear = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const fullDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const displayName = user?.name || activeUser.name || (isAdminOrSupervisor ? 'Supervisor' : 'PIC Area');

  const statCards = [
    {
      key: 'buildings',
      label: 'Gedung Dipantau',
      value: data.total_buildings || 0,
      caption: 'Gedung dalam cakupan pemantauan',
      icon: Building,
      tone: 'blue',
      tab: isAdminOrSupervisor ? 'buildings' : null
    },
    {
      key: 'rooms',
      label: 'Ruangan Terdaftar',
      value: data.total_rooms || 0,
      caption: 'Ruangan yang terdaftar di sistem',
      icon: Home,
      tone: 'green',
      tab: isAdminOrSupervisor ? 'rooms' : null
    },
    {
      key: 'compliance',
      label: 'Tingkat Kepatuhan',
      value: `${data.compliance_rate || 0}%`,
      caption: `Rata-rata kepatuhan tugas ${periodLabel}`,
      icon: CheckSquare,
      tone: 'purple',
      tab: null
    },
    {
      key: 'pending',
      label: 'Menunggu Verifikasi',
      value: data.pending_verifications || 0,
      caption: 'Laporan menunggu persetujuan',
      icon: Eye,
      tone: 'amber',
      tab: 'verifications'
    },
    {
      key: 'findings',
      label: 'Temuan Kerusakan',
      value: data.active_findings || 0,
      caption: 'Temuan kerusakan yang masih aktif',
      icon: AlertOctagon,
      tone: 'red',
      tab: 'findings'
    }
  ];

  return (
    <div>
      {/* Judul halaman + filter periode */}
      <div className="gb-page-head">
        <div>
          <h1 className="gb-page-title">
            {isAdminOrSupervisor ? 'Dashboard Supervisor' : 'Dashboard PIC Area'}
          </h1>
          <p className="gb-page-sub">Status operasional kebersihan fasilitas PT Widatra Bhakti</p>
        </div>
        <div className="gb-toolbar">
          <div className="gb-segment" role="group" aria-label="Filter periode">
            <button type="button" className={period === 'today' ? 'active' : ''} onClick={() => setPeriod('today')}>Hari Ini</button>
            <button type="button" className={period === 'week' ? 'active' : ''} onClick={() => setPeriod('week')}>Minggu Ini</button>
            <button type="button" className={period === 'month' ? 'active' : ''} onClick={() => setPeriod('month')}>Bulan Ini</button>
          </div>
          <button type="button" className="gb-refresh" onClick={() => fetchDashboardData(period)}>
            <RefreshCw size={16} /> Segarkan
          </button>
        </div>
      </div>

      {/* Welcome card */}
      <div className="gb-welcome">
        <div>
          <h2>Selamat datang, {displayName}!</h2>
          <p>{monthYear} — begini kondisi kebersihan fasilitas di seluruh gedung {periodLabel}.</p>
        </div>
        <div className="gb-welcome-chips">
          <span className="gb-welcome-chip">{fullDate}</span>
          <span className="gb-welcome-chip">Kepatuhan {data.compliance_rate || 0}%</span>
        </div>
      </div>

      {/* Kartu statistik */}
      <div className="gb-stats">
        {statCards.map((card) => {
          const CardIcon = card.icon;
          const clickable = Boolean(card.tab && setCurrentTab);
          return (
            <div
              key={card.key}
              className={`gb-stat ${clickable ? 'clickable' : ''}`}
              onClick={clickable ? () => setCurrentTab(card.tab) : undefined}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCurrentTab(card.tab); } } : undefined}
            >
              <div>
                <div className="gb-stat-label">{card.label}</div>
                <div className="gb-stat-value">{card.value}</div>
                <div className="gb-stat-caption">{card.caption}</div>
              </div>
              <div className={`gb-stat-icon gb-tone-${card.tone}`}>
                <CardIcon size={22} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Buildings Compliance Grid */}
      <div className="gb-grid">
        
        {/* Breakdown per Gedung */}
        <div className="gb-panel">
          <div className="gb-panel-head">
            <div>
              <h2 className="gb-panel-title"><Building size={18} /> Tingkat Kepatuhan per Gedung</h2>
              <p className="gb-panel-sub">Progres tugas dan kepatuhan kebersihan {periodLabel}</p>
            </div>
          </div>
          
          {/* Tampilan Desktop (Tabel) */}
          <div className="desktop-view">
            <div className="table-container" style={{ margin: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ whiteSpace: 'nowrap' }}>Nama Gedung</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Jumlah Ruang</th>
                    <th style={{ width: '160px', whiteSpace: 'nowrap' }}>Progress Tugas</th>
                    <th style={{ width: '120px', whiteSpace: 'nowrap' }}>Kepatuhan</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map(b => (
                    <tr key={b.building_id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: 'var(--on-surface)' }}>{b.building_name}</div>
                        <span className="gb-code" style={{ display: 'inline-block', marginTop: '4px' }}>{b.building_code}</span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{b.total_rooms} Ruang</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            {b.completed_tasks} / {b.total_tasks} Selesai
                          </span>
                          <div className="gb-progress">
                            <span style={{
                              width: `${b.total_tasks > 0 ? (b.completed_tasks / b.total_tasks) * 100 : 0}%`,
                              background: b.compliance_rate >= 80 ? 'var(--success)' : b.compliance_rate >= 50 ? 'var(--warning)' : 'var(--danger)'
                            }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`gb-pill ${b.compliance_rate >= 80 ? 'good' : b.compliance_rate >= 50 ? 'warn' : 'bad'}`}>{b.compliance_rate}%</span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => viewBuildingDetails(b.building_id)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                        >
                          <Search size={14} /> Detail Grid
                        </button>
                      </td>
                    </tr>
                  ))}
                  {breakdown.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada data gedung.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tampilan Mobile (Kartu / Cards) */}
          <div className="mobile-view">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {breakdown.map(b => (
                <div 
                  key={b.building_id} 
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{b.building_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Kode: <code>{b.building_code}</code> • {b.total_rooms} Ruang</div>
                    </div>
                    <div style={{ 
                      fontWeight: 800, 
                      fontSize: '1.2rem', 
                      color: b.compliance_rate >= 80 ? 'var(--success)' : b.compliance_rate >= 50 ? 'var(--warning)' : 'var(--danger)',
                      background: b.compliance_rate >= 80 ? 'rgba(15, 118, 110, 0.08)' : b.compliance_rate >= 50 ? 'rgba(180, 83, 9, 0.08)' : 'rgba(255, 0, 0, 0.08)',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      {b.compliance_rate}%
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '6px 0', borderTop: '1px dashed var(--border-color)', borderBottom: '1px dashed var(--border-color)', margin: '2px 0', color: 'var(--text-secondary)' }}>
                    <span>Progress Tugas</span>
                    <strong>{b.completed_tasks} / {b.total_tasks} Selesai</strong>
                  </div>

                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => viewBuildingDetails(b.building_id)}
                    style={{ width: '100%', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '6px', height: '36px', marginTop: '4px' }}
                  >
                    <Search size={14} /> Detail Grid Kebersihan
                  </button>
                </div>
              ))}
              {breakdown.length === 0 && (
                <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Tidak ada data gedung.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="gb-panel">
          <div className="gb-panel-head">
            <div>
              <h2 className="gb-panel-title danger"><AlertOctagon size={18} /> Tugas Terlambat (Overdue)</h2>
              <p className="gb-panel-sub">Tugas yang melewati batas waktu pengerjaan</p>
            </div>
          </div>

          <div className="gb-overdue-list">
            {overdue.map(t => (
              <div key={t.task_id} className="gb-overdue-item">
                <div className="gb-overdue-row">
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.room_name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.task_date}</span>
                </div>
                <div className="gb-overdue-row">
                  <span>CS: {t.cs_name}</span>
                  <span style={{ color: 'var(--danger)' }}>Due: {t.due_datetime ? (t.due_datetime.includes('T') ? t.due_datetime.split('T')[1]?.substring(0, 5) : t.due_datetime.split(' ')[1]?.substring(0, 5)) : '-'}</span>
                </div>
              </div>
            ))}

            {overdue.length === 0 && (
              <div className="gb-empty">
                <ThumbsUp size={24} style={{ color: 'var(--success)', opacity: 0.8 }} />
                <span>Tidak ada tugas terlambat hari ini.</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* PETA JEJAK INSPEKSI & GEOFENCING KAWASAN */}
      <InspectionMapTrail 
        buildings={breakdown.map(b => ({
          id: b.building_id,
          name: b.building_name,
          code: b.building_code,
          radius_meter: b.radius_meter || 250,
          latitude: b.latitude,
          longitude: b.longitude
        }))} 
        inspectionTrail={data?.inspection_trail || []}
        onNavigateBuildings={() => setCurrentTab && setCurrentTab('buildings')}
      />

      {/* Building Details Grid Modal / Section */}
      {selectedBuilding && (
        <div 
          className="glass-panel" 
          style={{ 
            marginTop: '30px', 
            padding: '24px', 
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--primary)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
                Grid Cleanliness Gedung: {buildingGrid ? buildingGrid.building.name : 'Memuat...'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Detail status kebersihan ruangan per shift hari ini</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedBuilding(null)}>Tutup Grid</button>
          </div>

          {loadingGrid ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <div className="spinner"></div>
            </div>
          ) : buildingGrid ? (
            <>
              {/* Tampilan Desktop (Tabel Grid Kebersihan) */}
              <div className="desktop-view">
                <div className="table-container">
                  <table className="data-table" style={{ border: 'none' }}>
                    <thead>
                      <tr>
                        <th>Lantai</th>
                        <th>Nama Kamar</th>
                        <th>Kode</th>
                        {Object.keys(buildingGrid.rooms_cleanliness_grid[0]?.shifts || {}).map(shiftName => (
                          <th key={shiftName} style={{ textAlign: 'center' }}>{shiftName}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {buildingGrid.rooms_cleanliness_grid.map(room => (
                        <tr key={room.room_id}>
                          <td>Lantai {room.floor}</td>
                          <td style={{ fontWeight: 600 }}>{room.room_name}</td>
                          <td><code>{room.room_code}</code></td>
                          {Object.entries(room.shifts).map(([shiftName, shiftInfo]) => {
                            let statusClass = 'status-pending';
                            
                            if (shiftInfo.status === 'completed') {
                              statusClass = 'status-completed';
                            } else if (shiftInfo.status === 'in_progress') {
                              statusClass = 'status-in_progress';
                            } else if (shiftInfo.status === 'waiting_verification') {
                              statusClass = 'status-waiting_verification';
                            } else if (shiftInfo.status === 'pending') {
                              statusClass = 'status-pending';
                            } else if (shiftInfo.status === 'rejected') {
                              statusClass = 'status-pending';
                            } else if (shiftInfo.status === 'overdue') {
                              statusClass = 'status-pending';
                            }

                            return (
                              <td key={shiftName} style={{ padding: '8px' }}>
                                <div 
                                  className={`room-card-status ${statusClass}`} 
                                  style={{ 
                                    padding: '8px', 
                                    margin: 0, 
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.75rem',
                                    minHeight: '50px',
                                    display: 'flex',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                                    {shiftInfo.status.replace('_', ' ')}
                                  </span>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                                    CS: {shiftInfo.cs_name}
                                  </span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tampilan Mobile (Kartu Kebersihan Ruangan per Shift) */}
              <div className="mobile-view">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {buildingGrid.rooms_cleanliness_grid.map(room => (
                    <div 
                      key={room.room_id} 
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border-color)', paddingBottom: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{room.room_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Kode: <code>{room.room_code}</code></div>
                        </div>
                        <span className="role-badge role-pic" style={{ fontSize: '0.7rem' }}>Lantai {room.floor}</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {Object.entries(room.shifts).map(([shiftName, shiftInfo]) => {
                          let statusClass = 'status-pending';
                          
                          if (shiftInfo.status === 'completed') {
                            statusClass = 'status-completed';
                          } else if (shiftInfo.status === 'in_progress') {
                            statusClass = 'status-in_progress';
                          } else if (shiftInfo.status === 'waiting_verification') {
                            statusClass = 'status-waiting_verification';
                          } else if (shiftInfo.status === 'pending') {
                            statusClass = 'status-pending';
                          } else if (shiftInfo.status === 'rejected') {
                            statusClass = 'status-pending';
                          } else if (shiftInfo.status === 'overdue') {
                            statusClass = 'status-pending';
                          }

                          return (
                            <div 
                              key={shiftName} 
                              style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                padding: '6px 8px',
                                background: 'rgba(255, 255, 255, 0.01)',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid rgba(255, 255, 255, 0.03)'
                              }}
                            >
                              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{shiftName}</span>
                              <div 
                                className={`room-card-status ${statusClass}`} 
                                style={{ 
                                  padding: '4px 8px', 
                                  margin: 0, 
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.7rem',
                                  display: 'inline-flex',
                                  flexDirection: 'column',
                                  alignItems: 'flex-end',
                                  minHeight: 'auto',
                                  justifyContent: 'center',
                                  border: 'none'
                                }}
                              >
                                <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>
                                  {shiftInfo.status.replace('_', ' ')}
                                </span>
                                {shiftInfo.cs_name !== '-' && (
                                  <span style={{ fontSize: '0.62rem', opacity: 0.85, marginTop: '1px' }}>
                                    CS: {shiftInfo.cs_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-danger)' }}>
              Gagal memuat data grid.
            </div>
          )}
        </div>
      )}
    </div>
  );
}