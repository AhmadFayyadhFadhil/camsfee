import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../utils/api';
import { 
  ClipboardCheck, 
  QrCode, 
  FileText, 
  Check, 
  AlertTriangle, 
  Play, 
  HelpCircle, 
  Image as ImageIcon, 
  Zap, 
  Sparkles, 
  FlaskConical, 
  Camera, 
  RefreshCw,
  Search,
  Filter,
  X,
  Building2,
  RotateCcw,
  Clock
} from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

export default function CsTasks({ 
  scannedTaskData, 
  setScannedTaskData, 
  openScanModalOnMount, 
  setOpenScanModalOnMount, 
  onOpenAdhocTasks, 
  onNavigateDashboard 
}) {
  const [tasks, setTasks] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [adhocCount, setAdhocCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('all');
  const [filterShift, setFilterShift] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Active Task filling state
  const [activeTask, setActiveTask] = useState(null); // The task currently being filled
  const [checklistItems, setChecklistItems] = useState([]); // Items retrieved from scan
  const [checklistResults, setChecklistResults] = useState({}); // { [itemId]: { status: true, notes: '' } }
  const [barcodePhoto, setBarcodePhoto] = useState(null);
  const [barcodePhotoName, setBarcodePhotoName] = useState('');
  const [fotoBeforeFiles, setFotoBeforeFiles] = useState([null, null, null, null]);
  const [fotoBeforePreviews, setFotoBeforePreviews] = useState([null, null, null, null]);
  const [fotoAfterFiles, setFotoAfterFiles] = useState([null, null, null, null]);
  const [fotoAfterPreviews, setFotoAfterPreviews] = useState([null, null, null, null]);
  const [gpsState, setGpsState] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    capturedAt: null,
    ready: false,
    error: null,
  });
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // QR Scanning Simulation state
  const [scanningTask, setScanningTask] = useState(null);
  const [scanBarcodeFile, setScanBarcodeFile] = useState(null);
  const [scanBarcodeFileName, setScanBarcodeFileName] = useState('');
  const [scanBarcodePreview, setScanBarcodePreview] = useState('');
  const [lockedTask, setLockedTask] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [html5QrCodeInstance, setHtml5QrCodeInstance] = useState(null);

  // Room Camera realtime capture states
  const [showRoomCamera, setShowRoomCamera] = useState(false);
  const [roomCameraActive, setRoomCameraActive] = useState(false);
  const [roomCameraStream, setRoomCameraStream] = useState(null);
  const [roomCameraSlot, setRoomCameraSlot] = useState({ slotIndex: 0, mode: 'before' });
  const [liveTime, setLiveTime] = useState('');

  const getGeolocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({
          latitude: null,
          longitude: null,
          accuracy: null,
          capturedAt: null,
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
            capturedAt: new Date().toISOString(),
            ready: true,
            error: null,
          });
        },
        (error) => {
          console.error('Error getting geolocation:', error);
          resolve({
            latitude: null,
            longitude: null,
            accuracy: null,
            capturedAt: null,
            ready: false,
            error: error.message || 'Gagal mendapatkan lokasi GPS.',
          });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  };

  const isCurrentTimeSlot = (start, end) => {
    if (!start || !end) return false;
    try {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      const [sH, sM] = start.split(':').map(Number);
      const [eH, eM] = end.split(':').map(Number);
      
      const startMinutes = sH * 60 + (sM || 0);
      const endMinutes = eH * 60 + (eM || 0);
      
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } catch (e) {
      return false;
    }
  };

  const refreshGeolocation = async () => {
    const newGpsState = await getGeolocation();
    setGpsState(newGpsState);
    return newGpsState;
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
    
    const timezoneOffset = now.getTimezoneOffset();
    let tz = 'WIB';
    if (timezoneOffset === -480) tz = 'WITA';
    else if (timezoneOffset === -540) tz = 'WIT';
    else if (timezoneOffset === 0) tz = 'UTC';
    
    return `${day} ${month} ${year} ${hours}:${minutes}:${seconds} ${tz}`;
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

  const handleStartRoomCamera = async (slotIndex, mode) => {
    setError(null);
    setSuccessMsg(null);
    setRoomCameraSlot({ slotIndex, mode });
    setShowRoomCamera(true);
    setRoomCameraActive(true);

    const gps = await refreshGeolocation();
    setGpsState(gps);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      setRoomCameraStream(stream);

      setTimeout(() => {
        const videoElement = document.getElementById('room-video');
        if (videoElement) {
          videoElement.srcObject = stream;
        }
      }, 300);
    } catch (err) {
      console.error('Error opening room camera:', err);
      setError('Gagal mengakses kamera. Silakan berikan izin kamera atau gunakan input kamera langsung.');
      setShowRoomCamera(false);
      setRoomCameraActive(false);
    }
  };

  const handleCloseRoomCamera = () => {
    if (roomCameraStream) {
      roomCameraStream.getTracks().forEach(track => track.stop());
      setRoomCameraStream(null);
    }
    setRoomCameraActive(false);
    setShowRoomCamera(false);
  };

  const handleCaptureRoomPhoto = async (slotIndex, mode) => {
    const videoElement = document.getElementById('room-video');
    if (!videoElement) {
      setError('Kamera tidak aktif.');
      handleCloseRoomCamera();
      return;
    }

    try {
      const gps = gpsState.ready ? gpsState : await refreshGeolocation();
      if (!gps.ready) {
        setError('GPS belum tersedia. Pastikan izin lokasi diberikan sebelum mengambil foto.');
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      const img = new Image();
      img.src = canvas.toDataURL('image/jpeg');
      await new Promise(resolve => img.onload = resolve);

      const watermarkedBlob = await drawWatermark(img, gps);
      const fileName = `kamera-after-${slotIndex + 1}-${activeTask.id.substring(0, 8)}.jpg`;

      const newFiles = [...fotoAfterFiles];
      const newPreviews = [...fotoAfterPreviews];
      newFiles[slotIndex] = watermarkedBlob;
      newPreviews[slotIndex] = URL.createObjectURL(watermarkedBlob);
      setFotoAfterFiles(newFiles);
      setFotoAfterPreviews(newPreviews);

      handleCloseRoomCamera();
      setSuccessMsg('Foto bukti berhasil diambil dengan GPS & watermark waktu.');
    } catch (err) {
      console.error('Error capturing photo:', err);
      setError('Gagal mengambil gambar dari kamera.');
      handleCloseRoomCamera();
    }
  };

  const handlePhotoFileChange = async (slotIndex, mode, file) => {
    if (!file) return;
    setError(null);

    const gps = gpsState.ready ? gpsState : await refreshGeolocation();
    if (!gps.ready) {
      setError('GPS belum tersedia. Pastikan izin lokasi diberikan sebelum mengunggah foto.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const img = new Image();
        img.src = e.target.result;
        await new Promise(resolve => img.onload = resolve);

        const watermarkedBlob = await drawWatermark(img, gps);
        const previewUrl = URL.createObjectURL(watermarkedBlob);

        if (mode === 'before') {
          const newFiles = [...fotoBeforeFiles];
          const newPreviews = [...fotoBeforePreviews];
          newFiles[slotIndex] = watermarkedBlob;
          newPreviews[slotIndex] = previewUrl;
          setFotoBeforeFiles(newFiles);
          setFotoBeforePreviews(newPreviews);
        } else {
          const newFiles = [...fotoAfterFiles];
          const newPreviews = [...fotoAfterPreviews];
          newFiles[slotIndex] = watermarkedBlob;
          newPreviews[slotIndex] = previewUrl;
          setFotoAfterFiles(newFiles);
          setFotoAfterPreviews(newPreviews);
        }

        setSuccessMsg('Foto bukti diunggah dan dibubuhi watermark waktu & lokasi!');
      } catch (err) {
        console.error('Error drawing watermark on uploaded file:', err);
        setError('Gagal memproses file. Pastikan file merupakan gambar yang valid.');
      }
    };
    reader.readAsDataURL(file);
  };

  const stopScanner = async () => {
    if (html5QrCodeInstance && html5QrCodeInstance.isScanning) {
      try {
        await html5QrCodeInstance.stop();
      } catch (err) {
        console.error("Failed to stop scanner:", err);
      }
    }
    setScannerActive(false);
  };

  const handleCloseScanner = async () => {
    await stopScanner();
    setScanningTask(null);
    setShowScanner(false);
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeInstance && html5QrCodeInstance.isScanning) {
        html5QrCodeInstance.stop().catch(err => console.error(err));
      }
      if (roomCameraStream) {
        roomCameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [html5QrCodeInstance, roomCameraStream]);
  useEffect(() => {
    let intervalId;
    if (showRoomCamera) {
      setLiveTime(getFormattedDateTime());
      intervalId = setInterval(() => {
        setLiveTime(getFormattedDateTime());
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showRoomCamera]);
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

  // Terima dan buka task otomatis yang baru saja dipindai dari Dashboard
  useEffect(() => {
    if (scannedTaskData) {
      const { task, checklist_items, barcodePhoto, barcodePhotoName } = scannedTaskData;
      setActiveTask(task);
      const items = (checklist_items || []).map(item => ({
        ...item,
        name: item.name || item.nama_item || ''
      }));
      setChecklistItems(items);

      const initialResults = {};
      items.forEach(item => {
        initialResults[item.id] = {
          status: false,
          notes: ''
        };
      });
      setChecklistResults(initialResults);

      if (barcodePhoto) {
        setBarcodePhoto(barcodePhoto);
      }
      if (barcodePhotoName) {
        setBarcodePhotoName(barcodePhotoName);
      }
      setFotoAfterFiles([null, null, null, null]);
      setFotoAfterPreviews([null, null, null, null]);

      setSuccessMsg(`Memuat lembar checklist kebersihan untuk ${task?.room?.name || 'ruangan'}. Silakan isi checklist.`);

      if (setScannedTaskData) {
        setScannedTaskData(null);
      }
    }
  }, [scannedTaskData]);

  const fetchMyTasks = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [tasksRes, matRes, adhocRes] = await Promise.all([
        api.get('/tasks/my-tasks'),
        api.get('/cleaning-materials?is_active=true&per_page=100', { lookup: true }),
        api.get('/adhoc-tasks?per_page=20', { cache: true })
      ]);

      if (tasksRes.success) {
        setTasks(tasksRes.data.data || tasksRes.data || []);
      }
      if (matRes.success) {
        setAvailableMaterials(matRes.data.data || matRes.data || []);
      }
      if (adhocRes.success) {
        const adhocList = adhocRes.data.data || adhocRes.data || [];
        const pendingOrActive = adhocList.filter(a => ['pending', 'in_progress', 'rejected'].includes(a.status));
        setAdhocCount(pendingOrActive.length);
      }
    } catch (err) {
      if (showLoading) setError(err.message || 'Gagal memuat tugas harian Anda.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTasks(true);
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

  const handleGlobalScan = () => {
    setError(null);
    setSuccessMsg(null);
    setScanBarcodeFile(null);
    setScanBarcodeFileName('');
    setScanBarcodePreview('');
    setLockedTask(false);
    setScanningTask(null);
    setShowScanner(true);
  };

  useEffect(() => {
    if (openScanModalOnMount) {
      handleGlobalScan();
      if (setOpenScanModalOnMount) {
        setOpenScanModalOnMount(false);
      }
    }
  }, [openScanModalOnMount]);

  // Open the barcode scanner step
  const handleScanQr = (task) => {
    setError(null);
    setSuccessMsg(null);
    setScanBarcodeFile(null);
    setScanBarcodeFileName('');
    setScanBarcodePreview('');
    setLockedTask(true);
    setScanningTask(task);
    setShowScanner(true);
  };

  // Simulate scanning for a specific task (Dev Mode)
  const simulateScanForTask = async (task) => {
    if (!task) return;
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const roomCode = task.room?.code || 'ROOM';
      const blob = await generateMockImage('barcode', roomCode);
      
      const payload = {
        room_id: task.room_id || task.room?.id,
        qr_code_token: task.room?.qr_code_token,
        task_id: task.id
      };

      const response = await api.post('/submissions/scan', payload);
      if (response.success) {
        setSuccessMsg(`[Simulasi] Berhasil melakukan scan QR Ruangan: ${task.room?.name}.`);
        setError(null);
        
        const items = (response.data.checklist_items || []).map(item => ({
          ...item,
          name: item.name || item.nama_item || ''
        }));
        setChecklistItems(items);
        
        const initialResults = {};
        items.forEach(item => {
          initialResults[item.id] = {
            status: false,
            notes: ''
          };
        });
        setChecklistResults(initialResults);
        
        setBarcodePhoto(blob);
        setBarcodePhotoName(`mock-barcode-${task.id.substring(0,8)}.png`);
        setFotoAfterFiles([null, null, null, null]);
        setFotoAfterPreviews([null, null, null, null]);
        
        setActiveTask(response.data.task || task);
        setScanningTask(null);
        setShowScanner(false);
      }
    } catch (err) {
      setError(err.message || 'Gagal melakukan simulasi scan.');
      setSuccessMsg(null);
    } finally {
      setLoading(false);
    }
  };

  // Mulai pengerjaan tugas langsung tanpa harus scan QR terlebih dahulu
  const handleStartTask = async (task) => {
    if (!task) return;
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const payload = {
        room_id: task.room_id || task.room?.id,
        qr_code_token: task.room?.qr_code_token || null,
        task_id: task.id
      };

      const response = await api.post('/submissions/scan', payload);
      if (response.success) {
        setSuccessMsg(`Memulai pengerjaan ruangan: ${task.room?.name || 'Ruangan'}. Silakan periksa item checklist dan ambil 4 foto bukti.`);
        setError(null);
        
        const items = (response.data.checklist_items || []).map(item => ({
          ...item,
          name: item.name || item.nama_item || ''
        }));
        setChecklistItems(items);
        
        const initialResults = {};
        items.forEach(item => {
          initialResults[item.id] = {
            status: false,
            notes: ''
          };
        });
        setChecklistResults(initialResults);
        
        setBarcodePhoto(null);
        setBarcodePhotoName('');
        setFotoAfterFiles([null, null, null, null]);
        setFotoAfterPreviews([null, null, null, null]);
        
        setActiveTask(response.data.task || task);
      }
    } catch (err) {
      setError(err.message || 'Gagal memulai pengerjaan tugas.');
      setSuccessMsg(null);
    } finally {
      setLoading(false);
    }
  };

  // Resume an already in progress task (if CS refreshed the browser)
  const handleResumeTask = async (task) => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const payload = {
        room_id: task.room_id || task.room?.id,
        qr_code_token: task.room?.qr_code_token || null,
        task_id: task.id
      };

      const response = await api.post('/submissions/scan', payload);
      if (response.success) {
        setError(null);
        setSuccessMsg(null);
        const items = (response.data.checklist_items || []).map(item => ({
          ...item,
          name: item.name || item.nama_item || ''
        }));
        setChecklistItems(items);
        
        const initialResults = {};
        items.forEach(item => {
          initialResults[item.id] = {
            status: false,
            notes: ''
          };
        });
        setChecklistResults(initialResults);
        
        setActiveTask(response.data.task || task);
      }
    } catch (err) {
      setError(err.message || 'Gagal melanjutkan pengerjaan tugas.');
      setSuccessMsg(null);
    } finally {
      setLoading(false);
    }
  };

  // Unique Buildings from tasks data
  const uniqueBuildings = useMemo(() => {
    const map = new Map();
    tasks.forEach(t => {
      if (t.room?.building) {
        map.set(t.room.building.id || t.room.building.name, t.room.building);
      }
    });
    return Array.from(map.values());
  }, [tasks]);

  // Unique Shifts from tasks data
  const uniqueShifts = useMemo(() => {
    const map = new Map();
    tasks.forEach(t => {
      if (t.shift) {
        map.set(t.shift.id || t.shift.name, t.shift);
      }
    });
    return Array.from(map.values());
  }, [tasks]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      // 1. Text Search (Room name or Room code or Building name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const roomName = (t.room?.name || '').toLowerCase();
        const roomCode = (t.room?.code || '').toLowerCase();
        const bName = (t.room?.building?.name || '').toLowerCase();
        if (!roomName.includes(q) && !roomCode.includes(q) && !bName.includes(q)) {
          return false;
        }
      }

      // 2. Building Filter
      if (filterBuilding !== 'all') {
        const bId = t.room?.building?.id || t.room?.building?.name;
        if (bId !== filterBuilding) {
          return false;
        }
      }

      // 3. Shift Filter
      if (filterShift !== 'all') {
        const sId = t.shift?.id || t.shift?.name;
        if (sId !== filterShift) {
          return false;
        }
      }

      // 4. Status Filter
      if (filterStatus !== 'all') {
        if (t.status !== filterStatus) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, searchQuery, filterBuilding, filterShift, filterStatus]);

  // Status Summary Counts
  const statusCounts = useMemo(() => {
    return {
      all: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      waiting_verification: tasks.filter(t => t.status === 'waiting_verification').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      overdue: tasks.filter(t => t.status === 'overdue').length,
      rejected: tasks.filter(t => t.status === 'rejected').length,
    };
  }, [tasks]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterBuilding('all');
    setFilterShift('all');
    setFilterStatus('all');
  };

  const currentUser = api.getUser();

  const renderStatusBadge = (t) => {
    const isMyTask = t.cs_user_id && currentUser?.id && t.cs_user_id === currentUser.id;
    const workerName = t.cs_name || 'Rekan CS';

    if (t.status === 'completed') {
      return (
        <span className="status-badge status-completed">
          Selesai {isMyTask ? '(Saya)' : `(oleh ${workerName})`}
        </span>
      );
    }
    if (t.status === 'in_progress') {
      return (
        <span className="status-badge status-in_progress">
          Sedang Dikerjakan {isMyTask ? '(Saya)' : `(oleh ${workerName})`}
        </span>
      );
    }
    if (t.status === 'waiting_verification') {
      return (
        <span className="status-badge status-waiting_verification">
          Menunggu Verifikasi {isMyTask ? '(Saya)' : `(oleh ${workerName})`}
        </span>
      );
    }
    if (t.status === 'rejected') {
      return (
        <span className="status-badge status-rejected">
          Ditolak {isMyTask ? '(Revisi Saya)' : `(Revisi ${workerName})`}
        </span>
      );
    }
    if (t.status === 'overdue') {
      return <span className="status-badge status-overdue">Terlambat</span>;
    }
    return <span className="status-badge status-pending">Belum Dimulai</span>;
  };

  const renderActionColumn = (t, isMobile = false) => {
    const isMyTask = t.cs_user_id && currentUser?.id && t.cs_user_id === currentUser.id;
    const workerName = t.cs_name || 'Rekan CS';

    if (t.status === 'pending') {
      if (isMobile) {
        return (
          <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
            <button 
              className="btn btn-primary"
              onClick={() => handleStartTask(t)}
              style={{ flex: 1, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              Mulai Kerjakan
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={onNavigateDashboard}
              style={{ padding: '8px 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              title="Pindai QR"
            >
              Scan
            </button>
          </div>
        );
      }
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => handleStartTask(t)}
            style={{ display: 'inline-flex', alignItems: 'center', fontWeight: 700 }}
            title="Mulai pengerjaan tugas ruangan ini"
          >
            Mulai Kerjakan
          </button>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={onNavigateDashboard}
            style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 8px' }}
            title="Opsi Pindai QR di Dashboard"
          >
            Scan
          </button>
        </div>
      );
    }

    if (t.status === 'in_progress') {
      if (isMyTask) {
        return (
          <button 
            className={`btn btn-warning ${isMobile ? '' : 'btn-sm'}`}
            onClick={() => handleResumeTask(t)}
            style={{ width: isMobile ? '100%' : 'auto', color: 'white', fontWeight: 700 }}
            title="Lanjutkan pengisian form checklist"
          >
            Lanjutkan Isi
          </button>
        );
      }
      return (
        <span style={{ 
          fontSize: '0.82rem', 
          color: 'var(--on-surface-variant)', 
          background: 'var(--surface-container-high)', 
          padding: '6px 12px', 
          borderRadius: 'var(--radius-md)', 
          fontWeight: 600,
          display: 'inline-block'
        }}>
          Dikerjakan {workerName}
        </span>
      );
    }

    if (t.status === 'waiting_verification') {
      return (
        <span style={{ fontSize: '0.82rem', color: '#b45309', fontWeight: 600 }}>
          Menunggu PIC
        </span>
      );
    }

    if (t.status === 'completed') {
      return (
        <span style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 700 }}>
          Selesai
        </span>
      );
    }

    if (t.status === 'rejected') {
      if (isMyTask) {
        return (
          <button 
            className={`btn btn-warning ${isMobile ? '' : 'btn-sm'}`}
            onClick={() => handleStartTask(t)}
            style={{ width: isMobile ? '100%' : 'auto', color: 'white', fontWeight: 700 }}
            title="Kerjakan ulang tugas yang ditolak"
          >
            Kerjakan Ulang
          </button>
        );
      }
      return (
        <span style={{ 
          fontSize: '0.82rem', 
          color: '#991b1b', 
          background: '#fee2e2', 
          padding: '6px 12px', 
          borderRadius: 'var(--radius-md)', 
          fontWeight: 600 
        }}>
          Revisi {workerName}
        </span>
      );
    }

    if (t.status === 'overdue') {
      return (
        <button 
          className={`btn btn-danger ${isMobile ? '' : 'btn-sm'}`}
          onClick={() => handleStartTask(t)}
          style={{ width: isMobile ? '100%' : 'auto', fontWeight: 700 }}
          title="Mulai pengerjaan tugas yang terlambat"
        >
          Mulai (Terlambat)
        </button>
      );
    }

    return null;
  };

  // Helper: Generates a mock PNG Blob using HTML5 Canvas
  const generateMockImage = (type, itemName) => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    if (type === 'barcode') {
      // Draw a mock QR Code / Barcode
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 400, 300);

      // Draw barcode lines
      ctx.fillStyle = '#000000';
      ctx.fillRect(40, 40, 320, 20); // Top bar
      
      // Draw QR square borders
      ctx.strokeRect(50, 80, 60, 60);
      ctx.fillRect(60, 90, 40, 40);
      
      ctx.strokeRect(290, 80, 60, 60);
      ctx.fillRect(300, 90, 40, 40);

      ctx.strokeRect(50, 200, 60, 60);
      ctx.fillRect(60, 210, 40, 40);

      // Draw some random barcode stripes in the middle
      for (let i = 130; i < 270; i += 10) {
        const width = Math.random() > 0.5 ? 4 : 8;
        ctx.fillRect(i, 90, width, 120);
      }

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`CAMS-QR-ROOM-VERIFICATION`, 200, 250);
      ctx.fillText(itemName, 200, 270);
    } else {
      // Fill background
      ctx.fillStyle = '#064e3b'; // dark green
      ctx.fillRect(0, 0, 400, 300);

      // Draw borders
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 380, 280);

      // Add labels
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BUKTI FOTO AFTER (BERSIH)', 200, 80);

      ctx.font = '14px Outfit, sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(`Item: ${itemName}`, 200, 140);
      ctx.fillText(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 200, 170);
      ctx.fillText(`CAMS Testing Frontend Mock`, 200, 220);
    }

    // Convert to Blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  };

  const handleAutoGeneratePhotos = async () => {
    setError(null);
    try {
      const afterBlob1 = await generateMockImage('after', `${activeTask.room?.name || 'Ruangan'} - After 1`);
      const afterBlob2 = await generateMockImage('after', `${activeTask.room?.name || 'Ruangan'} - After 2`);
      const afterBlob3 = await generateMockImage('after', `${activeTask.room?.name || 'Ruangan'} - After 3`);
      const afterBlob4 = await generateMockImage('after', `${activeTask.room?.name || 'Ruangan'} - After 4`);
      setBarcodePhoto(afterBlob1);
      setBarcodePhotoName(`mock-barcode-${activeTask.id.substring(0,8)}.png`);
      setFotoAfterFiles([afterBlob1, afterBlob2, afterBlob3, afterBlob4]);
      setFotoAfterPreviews([
        URL.createObjectURL(afterBlob1),
        URL.createObjectURL(afterBlob2),
        URL.createObjectURL(afterBlob3),
        URL.createObjectURL(afterBlob4)
      ]);
      setSuccessMsg('Bukti 4 foto setelah pembersihan berhasil di-generate secara otomatis! Siap diserahkan.');
    } catch (err) {
      setError('Gagal men-generate foto mock.');
    }
  };

  const handleFileChange = (itemId, type, file) => {
    if (!file) return;
    setChecklistResults({
      ...checklistResults,
      [itemId]: {
        ...checklistResults[itemId],
        [type === 'before' ? 'fotoBefore' : 'fotoAfter']: file,
        [type === 'before' ? 'fotoBeforeName' : 'fotoAfterName']: file.name,
      },
    });
  };

  const handleResultStatusChange = (itemId, status) => {
    setChecklistResults({
      ...checklistResults,
      [itemId]: {
        ...checklistResults[itemId],
        status
      }
    });
  };

  const handleResultNotesChange = (itemId, notes) => {
    setChecklistResults({
      ...checklistResults,
      [itemId]: {
        ...checklistResults[itemId],
        notes
      }
    });
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    if (fotoAfterFiles.some((file) => !file)) {
      setError('Semua 4 foto bukti setelah pembersihan harus diisi sebelum pengiriman.');
      setSubmitting(false);
      return;
    }

    if (!gpsState.ready) {
      setError('GPS belum siap. Pastikan izin lokasi diberikan dan coba lagi.');
      setSubmitting(false);
      return;
    }

    try {
      // Pastikan seluruh 4 foto terkompresi di bawah 1MB
      const compressedPhotos = await Promise.all(
        fotoAfterFiles.map(f => compressImage(f, 1600, 1000 * 1024))
      );

      const formData = new FormData();
      formData.append('task_id', activeTask.id);
      if (submissionNotes) {
        formData.append('catatan_cs', submissionNotes);
      }

      formData.append('latitude', gpsState.latitude);
      formData.append('longitude', gpsState.longitude);
      formData.append('gps_accuracy', gpsState.accuracy);
      formData.append('gps_captured_at', gpsState.capturedAt);

      checklistItems.forEach((item, index) => {
        const res = checklistResults[item.id] || {};
        formData.append(`results[${index}][checklist_item_id]`, item.id);
        formData.append(`results[${index}][is_done]`, res.status ? '1' : '0');
        if (res.notes) {
          formData.append(`results[${index}][catatan]`, res.notes);
        }
      });

      // Lampirkan bahan pembersih / alat yang dipilih
      selectedMaterials.forEach((matId, index) => {
        formData.append(`material_ids[${index}]`, matId);
      });

      formData.append('foto_after_1', compressedPhotos[0] || fotoAfterFiles[0], `after-1-${activeTask.id.substring(0, 8)}.jpg`);
      formData.append('foto_after_2', compressedPhotos[1] || fotoAfterFiles[1], `after-2-${activeTask.id.substring(0, 8)}.jpg`);
      formData.append('foto_after_3', compressedPhotos[2] || fotoAfterFiles[2], `after-3-${activeTask.id.substring(0, 8)}.jpg`);
      formData.append('foto_after_4', compressedPhotos[3] || fotoAfterFiles[3], `after-4-${activeTask.id.substring(0, 8)}.jpg`);

      const response = await api.post('/submissions', formData);
      if (response.success) {
        const activeId = activeTask.id;
        setTasks(prev => prev.map(t => (t.id === activeId ? { ...t, status: 'waiting_verification' } : t)));
        setSuccessMsg('Laporan kebersihan ruangan berhasil dikirim! Menunggu verifikasi dari PIC.');
        setActiveTask(null);
        setChecklistItems([]);
        setSelectedMaterials([]);
        setSubmissionNotes('');
        setFotoAfterFiles([null, null, null, null]);
        setFotoAfterPreviews([null, null, null, null]);
        fetchMyTasks(false);
      }
    } catch (err) {
      if (err.errors) {
        setError(Object.values(err.errors).flat().join(' '));
      } else {
        setError(err.message || 'Gagal mengirim laporan.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>Tugas Harian Saya</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Daftar ruangan yang perlu Anda bersihkan hari ini
          </p>
        </div>
        {!activeTask && (
          <button className="btn btn-secondary" onClick={fetchMyTasks} title="Muat ulang daftar tugas">
            ↻ Segarkan
          </button>
        )}
      </div>

      {/* BANNER INFORMASI TUGAS HARIAN */}
      {!activeTask && (
        <div className="instruction-banner" style={{ marginBottom: '20px' }}>
          <div className="instruction-banner-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardCheck size={20} color="var(--primary)" />
            <span>Memulai Pengerjaan Tugas Kebersihan:</span>
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Anda dapat langsung menekan tombol <strong>"▶ Mulai Kerjakan"</strong> pada tabel tugas di bawah ini, atau gunakan opsi <strong>"Scan di Dashboard"</strong> untuk pemindaian QR Code stiker pintu ruangan.
          </p>
          <div style={{ marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              type="button"
              className="btn btn-secondary btn-sm" 
              onClick={onNavigateDashboard}
              style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <QrCode size={16} /> Opsi Cepat: Buka Scanner QR di Dashboard
            </button>
          </div>
        </div>
      )}

      {/* FILTER BAR & QUICK STATUS TABS */}
      {!activeTask && (
        <div className="glass-panel" style={{ padding: '18px 20px', borderRadius: 'var(--radius-xl)', marginBottom: '20px' }}>
          
          {/* Quick Status Badges / Pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <button
              type="button"
              className={`btn btn-sm ${filterStatus === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterStatus('all')}
              style={{ fontWeight: 600, fontSize: '0.8rem', borderRadius: 'var(--radius-full)' }}
            >
              Semua ({statusCounts.all})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filterStatus === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterStatus('pending')}
              style={{ fontWeight: 600, fontSize: '0.8rem', borderRadius: 'var(--radius-full)' }}
            >
              Belum Dimulai ({statusCounts.pending})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filterStatus === 'in_progress' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterStatus('in_progress')}
              style={{ fontWeight: 600, fontSize: '0.8rem', borderRadius: 'var(--radius-full)' }}
            >
              Sedang Dikerjakan ({statusCounts.in_progress})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filterStatus === 'waiting_verification' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterStatus('waiting_verification')}
              style={{ fontWeight: 600, fontSize: '0.8rem', borderRadius: 'var(--radius-full)' }}
            >
              Menunggu Verifikasi ({statusCounts.waiting_verification})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filterStatus === 'completed' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterStatus('completed')}
              style={{ fontWeight: 600, fontSize: '0.8rem', borderRadius: 'var(--radius-full)' }}
            >
              Selesai ({statusCounts.completed})
            </button>
            {statusCounts.overdue > 0 && (
              <button
                type="button"
                className={`btn btn-sm ${filterStatus === 'overdue' ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => setFilterStatus('overdue')}
                style={{ fontWeight: 600, fontSize: '0.8rem', borderRadius: 'var(--radius-full)' }}
              >
                Terlambat ({statusCounts.overdue})
              </button>
            )}
            {statusCounts.rejected > 0 && (
              <button
                type="button"
                className={`btn btn-sm ${filterStatus === 'rejected' ? 'btn-warning' : 'btn-secondary'}`}
                onClick={() => setFilterStatus('rejected')}
                style={{ fontWeight: 600, fontSize: '0.8rem', borderRadius: 'var(--radius-full)' }}
              >
                Ditolak ({statusCounts.rejected})
              </button>
            )}
          </div>

          {/* Detailed Filters Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
            
            {/* Search Input */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Search size={14} /> Cari Ruangan / Kode
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ketik nama / kode ruangan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ fontSize: '0.88rem', paddingLeft: '32px' }}
                />
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Gedung */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Building2 size={14} /> Gedung
              </label>
              <select
                className="form-control"
                value={filterBuilding}
                onChange={(e) => setFilterBuilding(e.target.value)}
                style={{ fontSize: '0.88rem' }}
              >
                <option value="all">Semua Gedung</option>
                {uniqueBuildings.map(b => (
                  <option key={b.id || b.name} value={b.id || b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Shift */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Filter size={14} /> Shift Kerja
              </label>
              <select
                className="form-control"
                value={filterShift}
                onChange={(e) => setFilterShift(e.target.value)}
                style={{ fontSize: '0.88rem' }}
              >
                <option value="all">Semua Shift</option>
                {uniqueShifts.map(s => (
                  <option key={s.id || s.name} value={s.id || s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Button */}
            {(searchQuery || filterBuilding !== 'all' || filterShift !== 'all' || filterStatus !== 'all') && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleResetFilters}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '42px', width: '100%', justifyContent: 'center' }}
                  title="Reset semua filter"
                >
                  <RotateCcw size={14} /> Reset Filter
                </button>
              </div>
            )}

          </div>

          {/* Results Summary Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(14, 49, 146, 0.05)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <span>Menampilkan <strong>{filteredTasks.length}</strong> dari <strong>{tasks.length}</strong> tugas kebersihan</span>
            {(searchQuery || filterBuilding !== 'all' || filterShift !== 'all' || filterStatus !== 'all') && (
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Filter aktif diterapkan</span>
            )}
          </div>

        </div>
      )}

      {/* BANNER TUGAS MENDADAK */}
      {adhocCount > 0 && onOpenAdhocTasks && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(249, 115, 22, 0.15))',
            border: '2px solid rgba(234, 179, 8, 0.5)',
            padding: '16px 20px',
            borderRadius: 'var(--radius-xl)',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Zap size={26} color="#eab308" fill="#eab308" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ color: '#b45309', fontSize: '1rem', display: 'block' }}>
                ⚡ Ada {adhocCount} Tugas Mendadak dari Supervisor!
              </strong>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                Tugas ini bersifat darurat dan harus dikerjakan segera. Setelah selesai, Anda akan otomatis kembali ke tugas harian ini.
              </div>
            </div>
          </div>
          <button 
            className="btn btn-warning" 
            onClick={onOpenAdhocTasks} 
            style={{ color: '#fff', fontWeight: 700, minWidth: '200px' }}
          >
            ⚡ Kerjakan Tugas Mendadak
          </button>
        </div>
      )}



      {successMsg && (
        <div className="alert alert-success">
          <Check size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ACTIVE TASK CHECKLIST SUBMISSION */}
      {activeTask && (() => {
        const completedChecklistCount = checklistItems.filter(item => checklistResults[item.id]?.status).length;
        const totalChecklistCount = checklistItems.length;
        const photosTakenCount = fotoAfterFiles.filter(Boolean).length;
        const isAllPhotosTaken = photosTakenCount === 4;
        const isReadyToSubmit = isAllPhotosTaken && gpsState.ready;

        return (
          <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-xl)', marginBottom: '30px' }}>
            
            {/* STEP PROGRESS INDICATOR */}
            <div className="step-indicator">
              <div className="step-item">
                <div className={`step-num ${completedChecklistCount > 0 ? 'done' : 'active'}`}>
                  {completedChecklistCount === totalChecklistCount && totalChecklistCount > 0 ? '✓' : '1'}
                </div>
                <div className={`step-label ${completedChecklistCount === totalChecklistCount ? 'done' : 'active'}`}>
                  1. Centang Checklist ({completedChecklistCount}/{totalChecklistCount})
                </div>
              </div>
              <div className={`step-divider ${completedChecklistCount === totalChecklistCount ? 'done' : ''}`}></div>
              <div className="step-item">
                <div className={`step-num ${isAllPhotosTaken ? 'done' : completedChecklistCount === totalChecklistCount ? 'active' : 'pending-step'}`}>
                  {isAllPhotosTaken ? '✓' : '2'}
                </div>
                <div className={`step-label ${isAllPhotosTaken ? 'done' : completedChecklistCount === totalChecklistCount ? 'active' : ''}`}>
                  2. Ambil 4 Foto ({photosTakenCount}/4)
                </div>
              </div>
              <div className={`step-divider ${isAllPhotosTaken ? 'done' : ''}`}></div>
              <div className="step-item">
                <div className={`step-num ${isReadyToSubmit ? 'active' : 'pending-step'}`}>
                  3
                </div>
                <div className={`step-label ${isReadyToSubmit ? 'active' : ''}`}>
                  3. Kirim Laporan
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <div>
                <span className="status-badge status-in_progress" style={{ marginBottom: '6px' }}>Sedang Dikerjakan</span>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>Laporan Ruang: {activeTask.room?.name || 'Ruangan'}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '3px' }}>
                  Gedung: <strong>{activeTask.room?.building?.name}</strong> | Kode: <strong>{activeTask.room?.code}</strong> | Shift: <strong>{activeTask.shift?.name || 'Aktif'}</strong>
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveTask(null)} disabled={submitting}>
                ✕ Batal &amp; Kembali
              </button>
            </div>

            <form onSubmit={handleSubmitReport}>
              {/* STEP 1: ITEM CHECKLIST */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>
                    Langkah 1: Periksa &amp; Bersihkan Setiap Item
                  </h3>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: completedChecklistCount === totalChecklistCount ? 'var(--success)' : 'var(--text-muted)' }}>
                    {completedChecklistCount} dari {totalChecklistCount} Selesai
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {checklistItems.map((item, index) => {
                    const result = checklistResults[item.id] || {};
                    const isDone = Boolean(result.status);
                    return (
                      <div 
                        key={item.id} 
                        className="glass-card" 
                        style={{ 
                          padding: '16px 20px', 
                          margin: 0,
                          borderLeft: isDone ? '4px solid var(--success)' : '4px solid rgba(14, 49, 146, 0.2)',
                          background: isDone ? 'rgba(15, 118, 110, 0.02)' : 'white'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingBottom: '10px', borderBottom: '1px solid rgba(14, 49, 146, 0.06)' }}>
                          <div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>ITEM #{index + 1}</span>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{item.name}</h4>
                            {item.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>SOP: {item.description}</p>}
                          </div>
                          
                          <div>
                            {isDone ? (
                              <button
                                type="button"
                                className="btn btn-success btn-sm"
                                onClick={() => handleResultStatusChange(item.id, false)}
                                disabled={submitting}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                title="Klik untuk membatalkan status selesai"
                              >
                                <Check size={16} /> Selesai Dibersihkan (✓)
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => handleResultStatusChange(item.id, true)}
                                disabled={submitting}
                                style={{ 
                                  borderColor: 'var(--primary)', 
                                  color: 'var(--primary)',
                                  fontWeight: 700,
                                  padding: '8px 18px'
                                }}
                              >
                                ✓ Tandai Bersih
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="form-group" style={{ margin: '10px 0 0' }}>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={result.notes || ''}
                            onChange={(e) => handleResultNotesChange(item.id, e.target.value)}
                            placeholder="Catatan kendala item jika ada (opsional)..."
                            disabled={submitting}
                            style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STEP 2: FOTO BUKTI 4 SUDUT */}
              <div style={{ marginBottom: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>
                    Langkah 2: Ambil 4 Foto Bukti Sudut Ruangan
                  </h3>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Wajib ambil 4 foto langsung dari kamera HP Anda (menghadap 4 arah/sudut ruangan yang berbeda).
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '12px' }}>
                  {[0, 1, 2, 3].map((slotIndex) => {
                    const angleNames = [
                      'Foto Sudut 1 (Depan)',
                      'Foto Sudut 2 (Belakang)',
                      'Foto Sudut 3 (Kiri)',
                      'Foto Sudut 4 (Kanan / Detail)'
                    ];
                    const label = angleNames[slotIndex];
                    const preview = fotoAfterPreviews[slotIndex];
                    const isTaken = Boolean(preview);

                    return (
                      <div 
                        key={`after-${slotIndex}`} 
                        style={{ 
                          border: isTaken ? '1.5px solid var(--success)' : '1.5px dashed rgba(14, 49, 146, 0.25)', 
                          borderRadius: 'var(--radius-xl)', 
                          overflow: 'hidden', 
                          background: isTaken ? 'rgba(15, 118, 110, 0.02)' : 'white'
                        }}
                      >
                        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', background: isTaken ? 'rgba(15, 118, 110, 0.08)' : 'rgba(14, 49, 146, 0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '0.85rem', color: isTaken ? 'var(--success)' : 'var(--text-primary)' }}>
                            {label}
                          </strong>
                          {isTaken && <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.8rem' }}>✓ Ada</span>}
                        </div>
                        <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: '#f8fbff' }}>
                          {preview ? (
                            <img src={preview} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', padding: '12px', textAlign: 'center' }}>
                              <ImageIcon size={32} opacity={0.4} />
                              <span style={{ fontSize: '0.78rem' }}>Belum ada foto</span>
                            </div>
                          )}
                        </div>
                        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <button
                            type="button"
                            className={isTaken ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm"}
                            disabled={submitting}
                            onClick={() => handleStartRoomCamera(slotIndex, 'after')}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', fontWeight: 700 }}
                          >
                            <ImageIcon size={16} /> {isTaken ? '📷 Ambil Ulang' : '📷 Buka Kamera'}
                          </button>
                          {isTaken && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={submitting}
                              onClick={() => {
                                const newFiles = [...fotoAfterFiles];
                                const newPreviews = [...fotoAfterPreviews];
                                newFiles[slotIndex] = null;
                                newPreviews[slotIndex] = null;
                                setFotoAfterFiles(newFiles);
                                setFotoAfterPreviews(newPreviews);
                              }}
                              style={{ color: 'var(--danger)', fontSize: '0.75rem', padding: '4px 8px' }}
                            >
                              Hapus Foto
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STEP 3: BAHAN & CATATAN */}
              {availableMaterials.length > 0 && (
                <div className="form-group" style={{ marginBottom: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                  <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
                    <FlaskConical size={18} color="var(--primary)" /> Bahan Kimia &amp; Alat yang Digunakan (Ketuk untuk Memilih):
                  </label>
                  <p style={{ margin: '2px 0 10px 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Pilih sabun, disinfektan, atau alat yang Anda pakai di ruangan ini:
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {availableMaterials.map((mat) => {
                      const isSelected = selectedMaterials.includes(mat.id);
                      return (
                        <button
                          type="button"
                          key={mat.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedMaterials(selectedMaterials.filter((id) => id !== mat.id));
                            } else {
                              setSelectedMaterials([...selectedMaterials, mat.id]);
                            }
                          }}
                          style={{
                            padding: '8px 14px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            borderRadius: 'var(--radius-lg)',
                            border: isSelected ? '1.5px solid var(--success)' : '1px solid var(--border-color)',
                            background: isSelected ? 'rgba(15, 118, 110, 0.12)' : 'white',
                            color: isSelected ? 'var(--success)' : 'var(--text-primary)',
                            fontWeight: isSelected ? 700 : 500,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <span>{isSelected ? '✓' : '+'}</span>
                          <span>{mat.nama_material}</span>
                          <span style={{ fontSize: '0.72rem', opacity: 0.75 }}>({mat.jenis})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.95rem' }}>Catatan Tambahan Pekerjaan (Opsional)</label>
                <textarea 
                  className="form-control" 
                  rows="2"
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="Tulis kendala pengerjaan jika ada..."
                  disabled={submitting}
                />
              </div>

              {/* SUBMIT READINESS BAR */}
              <div className="submit-readiness">
                <div className={`readiness-item ${completedChecklistCount === totalChecklistCount && totalChecklistCount > 0 ? 'ready' : 'not-ready'}`}>
                  <span>{completedChecklistCount === totalChecklistCount && totalChecklistCount > 0 ? '✅' : '⚪'}</span>
                  <span>Checklist: {completedChecklistCount}/{totalChecklistCount} item</span>
                </div>
                <div className={`readiness-item ${isAllPhotosTaken ? 'ready' : 'not-ready'}`}>
                  <span>{isAllPhotosTaken ? '✅' : '⚪'}</span>
                  <span>Foto bukti: {photosTakenCount}/4 sudut</span>
                </div>
                <div className={`readiness-item ${gpsState.ready ? 'ready' : 'not-ready'}`}>
                  <span>{gpsState.ready ? '✅' : '⚪'}</span>
                  <span>Lokasi GPS: {gpsState.ready ? 'Tersedia' : 'Memuat...'}</span>
                </div>
              </div>

              <button 
                type="submit" 
                className={`btn btn-primary ${isReadyToSubmit ? 'btn-submit-ready' : ''}`}
                style={{ width: '100%', height: '52px', fontSize: '1.05rem', fontWeight: 800 }}
                disabled={submitting}
              >
                {submitting ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <div className="spinner"></div>
                    <span>Mengirim Laporan... Jangan tutup halaman ini.</span>
                  </div>
                ) : (
                  <span>🚀 Kirim Laporan &amp; Selesaikan Tugas Ruangan</span>
                )}
              </button>
            </form>
          </div>
        );
      })()}

      {/* MY TASKS LIST */}
      {!activeTask && (
        <div>
          {loading ? (
            <div className="loading-state">
              <div className="spinner" style={{ width: '36px', height: '36px' }}></div>
              <div className="loading-state-text">⏳ Memuat jadwal tugas kebersihan Anda...</div>
            </div>
          ) : (
            <>
              {/* Tampilan Desktop (Tabel Tugas) */}
              <div className="desktop-view">
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Ruangan</th>
                        <th className="col-hide-mobile">Gedung</th>
                        <th className="col-hide-mobile">Shift Kerja</th>
                        <th>Target Waktu (Rundown)</th>
                        <th>Status Tugas</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTasks.map(t => (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 700 }}>
                            <div style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{t.room?.name || 'Ruangan'}</span>
                              {t.items_count > 1 && (
                                <span style={{ fontSize: '0.72rem', fontWeight: 600, background: 'rgba(14, 49, 146, 0.08)', color: 'var(--primary)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
                                  {t.items_count} Item
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Kode: {t.room?.code}</div>
                          </td>
                          <td className="col-hide-mobile">{t.room?.building?.name || '-'}</td>
                          <td className="col-hide-mobile">
                            <span style={{ fontWeight: 600 }}>{t.shift?.name || '-'}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {(t.target_jam_mulai && t.target_jam_selesai) ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ 
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '4px 9px', 
                                    background: isCurrentTimeSlot(t.target_jam_mulai, t.target_jam_selesai) ? 'rgba(34, 197, 94, 0.15)' : 'rgba(14, 49, 146, 0.07)',
                                    color: isCurrentTimeSlot(t.target_jam_mulai, t.target_jam_selesai) ? '#15803d' : 'var(--primary)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    border: isCurrentTimeSlot(t.target_jam_mulai, t.target_jam_selesai) ? '1px solid #86efac' : '1px solid rgba(14, 49, 146, 0.12)'
                                  }}>
                                    <Clock size={13} /> {t.target_jam_mulai} - {t.target_jam_selesai} WIB
                                  </span>
                                  {isCurrentTimeSlot(t.target_jam_mulai, t.target_jam_selesai) && (
                                    <span style={{ fontSize: '0.68rem', background: '#22c55e', color: '#ffffff', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.3px' }}>
                                      SEKARANG
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.task_date}</span>
                              )}
                              <span style={{ fontSize: '0.74rem', color: t.status === 'overdue' ? 'var(--danger)' : 'var(--text-muted)' }}>
                                Batas Shift: {t.due_datetime ? (t.due_datetime.includes('T') ? t.due_datetime.split('T')[1]?.substring(0, 5) : t.due_datetime.split(' ')[1]?.substring(0, 5)) : '-'} WIB
                              </span>
                            </div>
                          </td>
                          <td>
                            {renderStatusBadge(t)}
                          </td>
                          <td>
                            {renderActionColumn(t, false)}
                          </td>
                        </tr>
                      ))}
                      {filteredTasks.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>🔍</div>
                            <div>Tidak ada tugas kebersihan yang sesuai dengan filter pencarian.</div>
                            {(searchQuery || filterBuilding !== 'all' || filterShift !== 'all' || filterStatus !== 'all') && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={handleResetFilters}
                                style={{ marginTop: '10px' }}
                              >
                                Reset Filter
                              </button>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tampilan Mobile (Kartu Tugas Ramah Layar Sentuh) */}
              <div className="mobile-view">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {filteredTasks.map(t => (
                    <div 
                      key={t.id} 
                      className={`task-card-mobile ${t.status === 'overdue' ? 'status-urgent' : t.status === 'completed' ? 'status-done' : ''}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div>
                          <div className="task-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{t.room?.name || 'Ruangan'}</span>
                            {t.items_count > 1 && (
                              <span style={{ fontSize: '0.72rem', fontWeight: 600, background: 'rgba(14, 49, 146, 0.08)', color: 'var(--primary)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
                                {t.items_count} Item
                              </span>
                            )}
                          </div>
                          <div className="task-card-sub">Gedung: {t.room?.building?.name || '-'} • Kode: {t.room?.code}</div>
                        </div>
                        <span className="status-badge status-in_progress" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>{t.shift?.name || 'Shift 1'}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', padding: '8px 0', borderTop: '1px dashed var(--border-color)', borderBottom: '1px dashed var(--border-color)', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} style={{ color: 'var(--primary)' }} />
                          <span style={{ color: 'var(--text-secondary)' }}>Target Jam:</span>
                          <strong style={{ color: 'var(--text-primary)' }}>
                            {t.target_jam_mulai && t.target_jam_selesai 
                              ? `${t.target_jam_mulai} - ${t.target_jam_selesai} WIB` 
                              : `Pukul ${t.due_datetime ? t.due_datetime.split('T')[1]?.substring(0, 5) : '-'}`}
                          </strong>
                        </div>
                        {isCurrentTimeSlot(t.target_jam_mulai, t.target_jam_selesai) && (
                          <span style={{ fontSize: '0.68rem', background: '#22c55e', color: '#ffffff', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                            SEKARANG
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '2px' }}>
                        <div>
                          {renderStatusBadge(t)}
                        </div>

                        <div style={{ flex: '1', display: 'flex', justifyContent: 'flex-end', minWidth: '160px' }}>
                          {renderActionColumn(t, true)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredTasks.length === 0 && (
                    <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>🔍</div>
                      <div>Tidak ada tugas kebersihan yang sesuai dengan filter pencarian.</div>
                      {(searchQuery || filterBuilding !== 'all' || filterShift !== 'all' || filterStatus !== 'all') && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={handleResetFilters}
                          style={{ marginTop: '10px' }}
                        >
                          Reset Filter
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ROOM CAMERA MODAL */}
      {showRoomCamera && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(7, 10, 19, 0.9)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px',
          backdropFilter: 'blur(8px)'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '500px',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            boxShadow: 'var(--shadow-lg), 0 0 30px rgba(16, 185, 129, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ImageIcon size={22} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Ambil Foto Realtime</h3>
              </div>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={handleCloseRoomCamera}
                style={{ padding: '4px 8px' }}
              >
                Tutup
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '16px', textAlign: 'center' }}>
                Posisikan kamera ke ruangan yang telah dibersihkan, lalu ketuk tombol "Ambil Foto".
              </p>

              {/* CAMERA PREVIEW */}
              <div style={{ 
                background: '#0a0e17', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                position: 'relative',
                aspectRatio: '4/3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <video 
                  id="room-video" 
                  autoPlay 
                  playsInline 
                  style={{ 
                    width: '100%', 
                    height: '100%',
                    objectFit: 'cover'
                  }}
                ></video>
                
                {/* Floating Overlay for GPS & Date/Time */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  background: 'rgba(0,0,0,0.6)',
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
                  <div>GPS Aktif: {gpsState.ready ? `${gpsState.latitude?.toFixed(4)}, ${gpsState.longitude?.toFixed(4)}` : 'Mendapatkan GPS...'}</div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '3px', marginTop: '2px', fontSize: '0.68rem', color: '#10b981', fontWeight: 600 }}>
                    Waktu: {liveTime}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => handleCaptureRoomPhoto(roomCameraSlot.slotIndex, roomCameraSlot.mode)}
                style={{ width: '100%', height: '44px', fontWeight: 600 }}
              >
                Ambil Foto
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleCloseRoomCamera}
                style={{ width: '120px' }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
