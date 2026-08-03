import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { FINDING_STATUSES } from '../utils/constants';
import { 
  AlertTriangle, 
  Plus, 
  Check, 
  X, 
  ShieldAlert, 
  Camera, 
  MessageSquare, 
  Eye, 
  Wrench,
  AlertCircle,
  Trash2,
  UserCheck
} from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext.jsx';

// Secure Image Renderer helper
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '100px', background: 'rgba(0,0,0,0.1)', borderRadius: 'var(--radius-md)' }}>
        <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
      </div>
    );
  }

  if (error || !imgUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '100px', background: 'rgba(0,0,0,0.05)', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '10px', borderRadius: 'var(--radius-md)' }}>
        <span>Tidak ada foto</span>
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

const formatResponseTime = (minutes) => {
  if (!minutes) return '-';
  if (minutes < 60) return `${minutes} Menit`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return `${hours} Jam ${mins} Menit`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days} Hari ${remainingHours} Jam`;
};

export default function Findings({ user, isOb = false }) {
  const confirm = useConfirm();
  const [findings, setFindings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState('unresolved');
  
  // Create Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [findingCategoryId, setFindingCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [fotoTemuan, setFotoTemuan] = useState(null);
  const [fotoTemuanName, setFotoTemuanName] = useState('');

  // Resolve Form State
  const [resolvingFinding, setResolvingFinding] = useState(null);
  const [resolveStatus, setResolveStatus] = useState('resolved');
  const [fotoSelesai, setFotoSelesai] = useState(null);
  const [fotoSelesaiName, setFotoSelesaiName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Camera States
  const [showCamera, setShowCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraTarget, setCameraTarget] = useState(''); // 'finding', 'resolve', or 'ob_0'..'ob_3'
  const [gpsCoords, setGpsCoords] = useState({ lat: '-', lng: '-' });
  const [liveTime, setLiveTime] = useState('');

  // Penugasan States
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningFinding, setAssigningFinding] = useState(null);
  const [assigneeId, setAssigneeId] = useState('');
  const [isAssigneeExternal, setIsAssigneeExternal] = useState(false);
  const [externalNarrative, setExternalNarrative] = useState('');
  const [assignableUsers, setAssignableUsers] = useState([]);

  const getGeolocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: '-', lng: '-' });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting geolocation:", error);
          resolve({ lat: '-', lng: '-' });
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
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
    
    const timezoneOffset = now.getTimezoneOffset();
    let tz = 'WIB';
    if (timezoneOffset === -480) tz = 'WITA';
    else if (timezoneOffset === -540) tz = 'WIT';
    else if (timezoneOffset === 0) tz = 'UTC';
    
    return `${day} ${month} ${year} ${hours}:${minutes}:${seconds} ${tz}`;
  };

  const drawWatermark = (imageElement, lat, lng) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = imageElement.naturalWidth || imageElement.width;
    canvas.height = imageElement.naturalHeight || imageElement.height;
    
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    
    const overlayHeight = Math.max(50, canvas.height * 0.16);
    const paddingX = Math.max(12, canvas.width * 0.03);
    const paddingY = Math.max(10, canvas.height * 0.03);
    const fontSize = Math.max(10, canvas.height * 0.032);
    
    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, canvas.height - overlayHeight, canvas.width, overlayHeight);
    
    // Draw texts
    ctx.fillStyle = '#ffffff';
    ctx.font = `${fontSize}px Arial, sans-serif`;
    ctx.textBaseline = 'middle';
    
    const timeText = `Waktu: ${getFormattedDateTime()}`;
    const latFormatted = typeof lat === 'number' ? lat.toFixed(14) : lat;
    const lngFormatted = typeof lng === 'number' ? lng.toFixed(14) : lng;
    const locText = `Lokasi: ${latFormatted}, ${lngFormatted}`;
    
    const lineHeight = fontSize * 1.35;
    
    ctx.fillText(timeText, paddingX, canvas.height - overlayHeight + paddingY + fontSize / 2);
    ctx.fillText(locText, paddingX, canvas.height - overlayHeight + paddingY + fontSize / 2 + lineHeight);
    
    // Watermark label on bottom right
    ctx.fillStyle = '#10b981';
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText('SIGMA Internship', canvas.width - paddingX, canvas.height - paddingY - fontSize / 2);
    
    ctx.textAlign = 'left';
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.85);
    });
  };

  const handleStartCamera = async (target) => {
    setError(null);
    setSuccessMsg(null);
    setCameraTarget(target);
    setShowCamera(true);
    setCameraActive(true);
    
    getGeolocation().then(coords => {
      setGpsCoords(coords);
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      setCameraStream(stream);
      
      setTimeout(() => {
        const videoElement = document.getElementById("findings-video");
        if (videoElement) {
          videoElement.srcObject = stream;
        }
      }, 300);
    } catch (err) {
      console.error("Error opening findings camera:", err);
      setError("Gagal mengakses kamera. Silakan pilih opsi 'Unggah File Foto' untuk mengunggah gambar.");
      setShowCamera(false);
      setCameraActive(false);
    }
  };

  const handleCloseCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
    setShowCamera(false);
  };

  const handleCapturePhoto = async () => {
    const videoElement = document.getElementById("findings-video");
    if (!videoElement) {
      setError("Kamera tidak aktif.");
      handleCloseCamera();
      return;
    }

    try {
      let coords = gpsCoords;
      if (coords.lat === '-' || coords.lng === '-') {
        coords = await getGeolocation();
      }

      const canvas = document.createElement("canvas");
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      const img = new Image();
      img.src = canvas.toDataURL("image/jpeg");
      await new Promise(resolve => img.onload = resolve);

      const watermarkedBlob = await drawWatermark(img, coords.lat, coords.lng);
      
      if (cameraTarget === 'finding') {
        setFotoTemuan(watermarkedBlob);
        setFotoTemuanName(`realtime-finding-${new Date().getTime().toString().substring(6)}.jpg`);
      } else {
        setFotoSelesai(watermarkedBlob);
        setFotoSelesaiName(`realtime-resolve-${new Date().getTime().toString().substring(6)}.jpg`);
      }
      
      handleCloseCamera();
      setSuccessMsg("Foto bukti realtime berhasil diambil dengan lokasi & waktu!");
    } catch (err) {
      console.error("Error capturing photo:", err);
      setError("Gagal mengambil gambar dari kamera.");
      handleCloseCamera();
    }
  };

  const handlePhotoFileChange = async (file, target) => {
    if (!file) return;
    setError(null);
    
    const coords = await getGeolocation();
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const img = new Image();
        img.src = event.target.result;
        await new Promise(resolve => img.onload = resolve);
        
        const watermarkedBlob = await drawWatermark(img, coords.lat, coords.lng);
        if (target === 'finding') {
          setFotoTemuan(watermarkedBlob);
          setFotoTemuanName(file.name);
        } else {
          setFotoSelesai(watermarkedBlob);
          setFotoSelesaiName(file.name);
        }
        setSuccessMsg("Foto bukti diunggah dan dibubuhi watermark waktu & lokasi!");
      } catch (err) {
        console.error("Error drawing watermark on uploaded file:", err);
        if (target === 'finding') {
          setFotoTemuan(file);
          setFotoTemuanName(file.name);
        } else {
          setFotoSelesai(file);
          setFotoSelesaiName(file.name);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const isAdmin = user.roles && user.roles.includes('admin');
  const isSupervisor = user.roles && user.roles.includes('supervisor');
  const isPic = user.roles && user.roles.includes('pic');
  const isCs = user.roles && user.roles.includes('cleaning_service');
  
  // Otorisasi penyelesaian temuan
  const getCanResolve = (f) => {
    if (isAdmin || isSupervisor) return true;
    if (f.assigned_to === user.id) return true;
    return false;
  };
  
  const canDelete = (finding) => {
    if (isAdmin || isPic) return true;
    return false;
  };

  const fetchAssignable = async () => {
    if (isAdmin || isSupervisor) {
      try {
        const response = await api.get('/users/assignable');
        if (response.success && response.data) {
          setAssignableUsers(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch assignable users:", err);
      }
    }
  };

  // Fetch staf yang dapat di-assign tugas perbaikan (Supervisor & Admin)
  useEffect(() => {
    fetchAssignable();
  }, [isAdmin, isSupervisor]);

  useEffect(() => {
    let intervalId;
    if (showCamera) {
      setLiveTime(getFormattedDateTime());
      intervalId = setInterval(() => {
        setLiveTime(getFormattedDateTime());
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showCamera]);

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

  const handleOpenAssignModal = (finding) => {
    setAssigningFinding(finding);
    fetchAssignable();
    if (finding.assigned_to_external) {
      setIsAssigneeExternal(true);
      setExternalNarrative(finding.assigned_to_external);
      setAssigneeId('');
    } else {
      setIsAssigneeExternal(false);
      setExternalNarrative('');
      setAssigneeId(finding.assigned_to || '');
    }
    setError(null);
    setSuccessMsg(null);
    setShowAssignModal(true);
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setAssigningFinding(null);
    setAssigneeId('');
    setExternalNarrative('');
    setIsAssigneeExternal(false);
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const payload = {
        status: assigningFinding.status,
        assigned_to: isAssigneeExternal ? null : (assigneeId || null),
        assigned_to_external: isAssigneeExternal ? (externalNarrative || null) : null
      };

      const response = await api.patch(`/findings/${assigningFinding.id}/status`, payload);
      if (response.success) {
        setSuccessMsg('Penugasan perbaikan berhasil diperbarui.');
        handleCloseAssignModal();
        fetchFindings();
      }
    } catch (err) {
      setError(err.message || 'Gagal memperbarui penugasan.');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchFindings = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/findings';
      const params = [];
      if (statusFilter) params.push(`status=${statusFilter}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const response = await api.get(url);
      if (response.success) {
        setFindings(response.data.data || response.data || []);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat temuan masalah.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await api.get('/rooms?is_active=true');
      if (response.success) {
        setRooms(response.data.data || response.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/finding-categories');
      if (response.success) {
        const cats = response.data?.data || response.data || [];
        setCategories(cats);
        if (cats.length > 0) {
          setFindingCategoryId(prev => prev || cats[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFindings();
    fetchRooms();
    fetchCategories();
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

  // Mock Canvas Image Creator
  const generateMockImage = (text, isResolved) => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = isResolved ? '#047857' : '#b91c1c'; // green vs red
    ctx.fillRect(0, 0, 400, 300);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 380, 280);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isResolved ? 'FOTO SELESAI PERBAIKAN' : 'FOTO TEMUAN MASALAH', 200, 80);

    ctx.font = '14px Outfit, sans-serif';
    ctx.fillStyle = '#f1f5f9';
    ctx.fillText(`Masalah: ${text}`, 200, 150);
    ctx.fillText(`Lokasi: CAMS Plant Pandaan`, 200, 180);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  };

  const handleAutoGenerateReportPhoto = async () => {
    if (!description) {
      setError('Tulis deskripsi temuan terlebih dahulu untuk di-generate gambarnya.');
      return;
    }
    setError(null);
    try {
      const blob = await generateMockImage(description, false);
      setFotoTemuan(blob);
      setFotoTemuanName('mock-finding.png');
      setSuccessMsg('Foto temuan berhasil di-generate secara otomatis!');
    } catch (err) {
      setError('Gagal generate foto temuan.');
    }
  };

  const handleAutoGenerateResolvePhoto = async () => {
    if (!resolvingFinding) return;
    setError(null);
    try {
      const blob = await generateMockImage((resolvingFinding.deskripsi || resolvingFinding.description) + ' (PERBAIKAN)', true);
      setFotoSelesai(blob);
      setFotoSelesaiName('mock-resolved.png');
      setSuccessMsg('Foto selesai perbaikan berhasil di-generate secara otomatis!');
    } catch (err) {
      setError('Gagal generate foto perbaikan.');
    }
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      handlePhotoFileChange(file, type);
    }
  };

  const handleSaveReport = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    if (!roomId) {
      setError('Pilih ruangan lokasi temuan.');
      setSubmitting(false);
      return;
    }

    // Validasi 1 foto wajib
    if (!fotoTemuan) {
      setError('Ambil foto temuan kerusakan menggunakan kamera.');
      setSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('room_id', roomId);
      if (findingCategoryId) {
        formData.append('finding_category_id', findingCategoryId);
      }
      formData.append('deskripsi', description);
      formData.append('prioritas', 'medium');
      formData.append('foto_temuan', fotoTemuan, fotoTemuanName);

      const response = await api.post('/findings', formData);
      if (response.success) {
        setSuccessMsg('Temuan masalah berhasil dilaporkan dan notifikasi telah dikirim ke Supervisor.');
        setShowCreateForm(false);
        setRoomId('');
        setFindingCategoryId('');
        setDescription('');
        setFotoTemuan(null);
        setFotoTemuanName('');
        fetchFindings();
      }
    } catch (err) {
      if (err.errors) {
        setError(Object.values(err.errors).flat().join(' '));
      } else {
        setError(err.message || 'Gagal melaporkan temuan.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveResolve = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    if (resolveStatus === 'resolved' && !fotoSelesai) {
      setError('Wajib mengunggah foto perbaikan jika status diselesaikan (Resolved).');
      setSubmitting(false);
      return;
    }

    try {
      // Laravel PATCH request with files requires method tunneling:
      // We send a POST request with `_method: PATCH` inside the FormData body.
      const formData = new FormData();
      formData.append('_method', 'PATCH');
      formData.append('status', resolveStatus);
      
      if (fotoSelesai && resolveStatus === 'resolved') {
        formData.append('foto_selesai', fotoSelesai, fotoSelesaiName);
      }

      const response = await api.post(`/findings/${resolvingFinding.id}/status`, formData);
      if (response.success) {
        setSuccessMsg('Status perbaikan temuan kerusakan berhasil diperbarui.');
        setResolvingFinding(null);
        setFotoSelesai(null);
        setFotoSelesaiName('');
        fetchFindings();
      }
    } catch (err) {
      if (err.errors) {
        setError(Object.values(err.errors).flat().join(' '));
      } else {
        setError(err.message || 'Gagal memperbarui status temuan.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFinding = async (findingId) => {
    if (!(await confirm({
      title: 'Hapus Temuan Kerusakan',
      message: 'Apakah Anda yakin ingin menghapus laporan temuan kerusakan ini?',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger'
    }))) {
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const response = await api.delete(`/findings/${findingId}`);
      if (response.success) {
        setSuccessMsg('Laporan temuan kerusakan berhasil dihapus.');
        fetchFindings();
      }
    } catch (err) {
      setError(err.message || 'Gagal menghapus laporan temuan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>Temuan Masalah Fasilitas</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Pelaporan kerusakan inventaris ruangan dan pelacakan status perbaikan</p>
        </div>
      {/* Tombol Laporkan Temuan — tampil untuk semua role termasuk OB */}
      {!showCreateForm && !resolvingFinding && (
        <button className="btn btn-primary" onClick={() => { setShowCreateForm(true); fetchRooms(); fetchCategories(); setResolvingFinding(null); }}>
          <Plus size={16} /> Laporkan Temuan Baru
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

      {/* CREATE FORM */}
      {showCreateForm && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-md)', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Laporkan Temuan Kerusakan Baru</h2>
          <form onSubmit={handleSaveReport}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Ruangan Lokasi</label>
                <select 
                  className="form-control form-select"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  required
                >
                  <option value="" disabled>Pilih Ruangan</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.code}) - Gedung {r.building?.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Kategori Kerusakan</label>
                <select 
                  className="form-control form-select"
                  value={findingCategoryId}
                  onChange={(e) => setFindingCategoryId(e.target.value)}
                  required
                >
                  <option value="" disabled>Pilih Kategori</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.nama_kategori} ({c.kode_kategori})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Deskripsi Kerusakan</label>
              <textarea 
                className="form-control" 
                rows="3"
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Contoh: AC Bocor mengeluarkan air deras, lantai menjadi licin..."
                required
              />
            </div>

            <div className="form-group" style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Foto Bukti Kerusakan (1 Foto Wajib)*</label>
              <p style={{ margin: '4px 0 10px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Ambil 1 foto kondisi kerusakan langsung dari kamera. Unggah file dari galeri tidak diizinkan.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleStartCamera('finding')}
                  disabled={submitting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Camera size={14} /> Ambil Foto Realtime
                </button>

                <span style={{ fontSize: '0.85rem', color: fotoTemuan ? 'var(--primary)' : 'var(--text-muted)', fontWeight: fotoTemuan ? 600 : 400 }}>
                  {fotoTemuanName ? `✓ Foto Siap: ${fotoTemuanName}` : 'Foto belum diambil'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Mengirim...' : 'Kirim Laporan'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>Batal</button>
            </div>
          </form>
        </div>
      )}

      {/* RESOLVE FORM (ADMIN / SUPERVISOR ONLY) */}
      {resolvingFinding && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-md)', marginBottom: '30px', border: '1px solid var(--primary)' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Update Status Perbaikan Kerusakan</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
            Detail: {resolvingFinding.deskripsi || resolvingFinding.description} | Lokasi: {resolvingFinding.room?.name}
          </p>
          <form onSubmit={handleSaveResolve}>
            <div className="grid-2-cols" style={{ marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label">Status Saat Ini</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value="Sedang Diperbaiki (In Progress)" 
                  disabled 
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Bukti Perbaikan (Wajib)*</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                  <button 
                    type="button" 
                    className="btn btn-primary btn-sm" 
                    onClick={() => handleStartCamera('resolve')}
                    disabled={submitting}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Camera size={14} /> Ambil Foto Realtime
                  </button>

                  <span style={{ fontSize: '0.8rem', color: fotoSelesai ? 'var(--primary)' : 'var(--text-muted)', fontWeight: fotoSelesai ? 600 : 400 }}>
                    {fotoSelesaiName ? `✓ ${fotoSelesaiName}` : 'Belum diambil'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>Selesai</button>
              <button type="button" className="btn btn-secondary" onClick={() => setResolvingFinding(null)}>Batal</button>
            </div>
          </form>
        </div>
      )}

      {/* FILTER & LIST */}
      {!showCreateForm && !resolvingFinding && (
        <div>
          {/* Status Filter */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Filter Status:</span>
            <button className={`btn btn-sm ${statusFilter === 'unresolved' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter('unresolved')}>Semua</button>
            <button className={`btn btn-sm ${statusFilter === 'resolved' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter('resolved')}>Resolved</button>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
              {[1, 2, 3].map((n) => (
                <div key={n} className="glass-panel skeleton-shimmer" style={{ padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                  {/* Photo Skeleton */}
                  <div className="skeleton-rect" style={{ width: '150px', height: '110px', flexShrink: 0 }}></div>
                  
                  {/* Info details */}
                  <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="skeleton-text" style={{ width: '100px' }}></div>
                    <div className="skeleton-title" style={{ width: '250px' }}></div>
                    <div className="skeleton-text" style={{ width: '350px' }}></div>
                    <div className="skeleton-text" style={{ width: '180px' }}></div>
                  </div>

                  {/* Buttons Skeleton */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div className="skeleton-rect" style={{ width: '90px', height: '32px' }}></div>
                    <div className="skeleton-rect" style={{ width: '70px', height: '32px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
              {findings.map(f => (
                <div key={f.id} className="glass-panel finding-card" style={{ padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                  <div className="finding-photos-wrapper" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {/* Photo Findings */}
                    <div className="finding-photo-container" style={{ width: '150px', height: '110px', flexShrink: 0 }}>
                      <SecureImage src={`/findings/${f.id}/foto`} alt="Foto Temuan" />
                    </div>

                    {/* Photo Resolved (If Resolved) */}
                    {f.status === 'resolved' && (
                      <div className="finding-photo-container" style={{ width: '150px', height: '110px', flexShrink: 0 }}>
                        <SecureImage src={`/findings/${f.id}/foto-resolved`} alt="Foto Selesai" />
                      </div>
                    )}
                  </div>

                  {/* Info details */}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span className={`role-badge ${
                        f.status === 'resolved' ? 'role-cs' : 
                        f.status === 'in_progress' ? 'role-supervisor' : 'role-admin'
                      }`} style={{ textTransform: 'capitalize' }}>
                        {f.status === 'unresolved' ? 'Belum Diperbaiki' :
                         f.status === 'in_progress' ? 'Sedang Diperbaiki' :
                         f.status === 'resolved' ? 'Selesai' : f.status}
                      </span>
                      <span className="role-badge role-ob" style={{ textTransform: 'capitalize', fontSize: '0.7rem' }}>
                        📁 {f.category_name || 'Lainnya'}
                      </span>
                      {f.status !== 'resolved' && f.deadline_perbaikan && (
                        <span className={`role-badge ${f.is_overdue ? 'role-admin' : 'role-cs'}`} style={{ textTransform: 'capitalize', fontSize: '0.7rem' }}>
                          {f.is_overdue ? '🔴 Melewati Deadline' : '🟢 Dalam Batas Waktu'}
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '8px 0 4px' }}>
                      Ruangan: {f.room?.name || 'Ruangan'} ({f.room?.code})
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '6px' }}>{f.deskripsi || f.description}</p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Dilaporkan oleh: <strong>{f.reporter_name || 'Staf'}</strong> | Gedung: {f.room?.building?.name}
                    </div>
                    {f.deadline_perbaikan && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Deadline Perbaikan: <strong>{new Date(f.deadline_perbaikan).toLocaleDateString('id-ID')}</strong>
                      </div>
                    )}
                    {f.status === 'resolved' && f.response_time_minutes !== null && f.response_time_minutes !== undefined && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Waktu Penyelesaian: <strong style={{ color: 'var(--success)' }}>{formatResponseTime(f.response_time_minutes)}</strong>
                      </div>
                    )}
                    <div style={{ fontSize: '0.78rem', marginTop: '8px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600 }}>Tugas Perbaikan:</span>
                      {f.assigned_to_external ? (
                        <span className="role-badge role-admin" style={{ fontSize: '0.7rem', textTransform: 'none' }}>
                          Pihak Luar: {f.assigned_to_external}
                        </span>
                      ) : f.assigned_to ? (
                        <span className="role-badge role-cs" style={{ fontSize: '0.7rem', textTransform: 'none' }}>
                          Petugas: {f.assignee_name}
                        </span>
                      ) : (
                        <span className="role-badge role-manager" style={{ fontSize: '0.7rem', textTransform: 'none' }}>
                          Belum Ditugaskan
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons (Resolve & Delete) */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(isAdmin || isSupervisor) && f.status !== 'resolved' && (
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenAssignModal(f)}
                        style={{ display: 'inline-flex', gap: '4px', color: 'var(--secondary)' }}
                      >
                        <UserCheck size={14} /> Tugaskan
                      </button>
                    )}

                    {getCanResolve(f) && f.status !== 'resolved' && (
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setResolvingFinding(f); setResolveStatus('resolved'); setSuccessMsg(null); setError(null); }}
                        style={{ display: 'inline-flex', gap: '4px', color: 'var(--primary)' }}
                      >
                        <Wrench size={14} /> Update Perbaikan
                      </button>
                    )}

                    {canDelete(f) && (
                      <button 
                        className="btn btn-secondary btn-sm"
                        type="button"
                        onClick={() => handleDeleteFinding(f.id)}
                        disabled={submitting}
                        style={{ display: 'inline-flex', gap: '4px', color: 'var(--danger)' }}
                      >
                        <Trash2 size={14} /> Hapus
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {findings.length === 0 && (
                <div className="glass-card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Tidak ada temuan kerusakan fasilitas pada kategori filter ini. Aman!
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CAMERA MODAL */}
      {showCamera && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999
        }}>
          <div className="glass-panel" style={{
            width: '90%',
            maxWidth: '500px',
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                {cameraTarget === 'finding' ? 'Ambil Foto Temuan Kerusakan' : 'Ambil Foto Bukti Perbaikan'}
              </h3>
              <button 
                type="button"
                className="btn btn-secondary btn-sm" 
                onClick={handleCloseCamera}
                style={{ padding: '4px 8px' }}
              >
                Tutup
              </button>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
              Arahkan kamera ke area yang bersangkutan, pastikan pencahayaan cukup, lalu klik "Ambil Foto".
            </p>

            {/* CAMERA PREVIEW */}
            <div style={{ 
              background: '#0a0e17', 
              border: '1px solid var(--border-color)', 
              borderRadius: 'var(--radius-sm)', 
              overflow: 'hidden', 
              aspectRatio: '4/3', 
              position: 'relative',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {cameraActive ? (
                <>
                  <video 
                    id="findings-video" 
                    autoPlay 
                    playsInline 
                    muted 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  
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
                    <div>GPS Aktif: {gpsCoords.lat !== '-' ? `${typeof gpsCoords.lat === 'number' ? gpsCoords.lat.toFixed(4) : gpsCoords.lat}, ${typeof gpsCoords.lng === 'number' ? gpsCoords.lng.toFixed(4) : gpsCoords.lng}` : 'Mendapatkan GPS...'}</div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '3px', marginTop: '2px', fontSize: '0.68rem', color: '#10b981', fontWeight: 600 }}>
                      Waktu: {liveTime}
                    </div>
                  </div>
                </>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>Mengakses kamera...</span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleCloseCamera}
                style={{ width: '120px' }}
              >
                Batal
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleCapturePhoto}
                style={{ width: '150px' }}
              >
                <Camera size={16} /> Ambil Foto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGNMENT MODAL (ADMIN / SUPERVISOR ONLY) */}
      {showAssignModal && assigningFinding && (
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
            boxShadow: 'var(--shadow-lg), 0 0 30px rgba(16, 185, 129, 0.1)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserCheck size={22} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Tugaskan Staf Perbaikan</h3>
              </div>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={handleCloseAssignModal}
                style={{ padding: '4px 8px' }}
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSaveAssignment}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Jenis Penugasan</label>
                <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="assignType" 
                      checked={!isAssigneeExternal} 
                      onChange={() => setIsAssigneeExternal(false)}
                    />
                    Staf Internal (CAMS)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="assignType" 
                      checked={isAssigneeExternal} 
                      onChange={() => setIsAssigneeExternal(true)}
                    />
                    Pihak Luar / Dep. Lain
                  </label>
                </div>
              </div>

              {!isAssigneeExternal ? (
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Pilih Staf Internal (OB / CS / PIC)</label>
                  <select 
                    className="form-control form-select"
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                  >
                    <option value="">-- Belum Ditugaskan --</option>
                    {assignableUsers.map(u => {
                      const roleName = u.roles?.map(r => r.replace('_', ' ')).join(', ') || 'Staf';
                      let statusText = 'Luar Shift';
                      if (u.is_on_shift) {
                        statusText = 'Shift Saat Ini';
                      } else if (u.shift_label) {
                        statusText = 'Shift Lain';
                      }
                      const statusIndicator = u.is_on_shift ? '🟢' : '⚪';
                      
                      return (
                        <option key={u.id} value={u.id}>
                          {statusIndicator} [{statusText}] {u.name} ({roleName}) {u.shift_label ? `- ${u.shift_label}` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Detail Narasi Pihak Luar (Nama & Departemen)*</label>
                  <textarea 
                    className="form-control"
                    rows="3"
                    value={externalNarrative}
                    onChange={(e) => setExternalNarrative(e.target.value)}
                    placeholder="Contoh: Nama: Joko, Departemen: Departemen Umum (Teknisi)"
                    required
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan Penugasan'}
                </button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={handleCloseAssignModal}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
