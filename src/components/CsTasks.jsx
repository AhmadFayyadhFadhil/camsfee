import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { ClipboardCheck, QrCode, FileText, Check, AlertTriangle, Play, HelpCircle, Image as ImageIcon } from 'lucide-react';

export default function CsTasks({ openScanModalOnMount, setOpenScanModalOnMount }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Active Task filling state
  const [activeTask, setActiveTask] = useState(null); // The task currently being filled
  const [checklistItems, setChecklistItems] = useState([]); // Items retrieved from scan
  const [checklistResults, setChecklistResults] = useState({}); // { [itemId]: { status: true, notes: '' } }
  const [barcodePhoto, setBarcodePhoto] = useState(null);
  const [barcodePhotoName, setBarcodePhotoName] = useState('');
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
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.8);
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

  const handleStartScanning = async () => {
    setError(null);
    setSuccessMsg(null);
    try {
      const readerElement = document.getElementById("qr-reader");
      if (!readerElement) {
        throw new Error("Scanner container not found in DOM.");
      }

      // Dynamic import to reduce initial JS payload
      const { Html5Qrcode } = await import('html5-qrcode');

      const qrCode = new Html5Qrcode("qr-reader");
      setHtml5QrCodeInstance(qrCode);
      setScannerActive(true);

      await qrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size };
          }
        },
        async (decodedText) => {
          try {
            let qrData;
            try {
              qrData = JSON.parse(decodedText);
            } catch (jsonErr) {
              throw new Error("QR Code tidak valid. Pastikan Anda melakukan scan pada QR Code CAMS yang tepat.");
            }

            const { room_id, token } = qrData;
            if (!room_id || !token) {
              throw new Error("Format data QR Code CAMS tidak lengkap.");
            }

            const foundTask = tasks.find(t => 
              (t.room_id === room_id || t.room?.id === room_id) && 
              ['pending', 'in_progress', 'rejected'].includes(t.status)
            );

            let capturedBlob = null;
            try {
              const videoElement = readerElement.querySelector("video");
              if (videoElement) {
                const canvas = document.createElement("canvas");
                canvas.width = videoElement.videoWidth;
                canvas.height = videoElement.videoHeight;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                capturedBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
              }
            } catch (capErr) {
              console.error("Failed to capture video frame:", capErr);
            }

            if (!capturedBlob) {
              capturedBlob = await generateMockImage('barcode', foundTask?.room?.code || 'ROOM');
            }

            const payload = {
              room_id: room_id,
              qr_code_token: token,
              task_id: foundTask?.id || scanningTask?.id || null
            };

            const response = await api.post('/submissions/scan', payload);
            if (response.success) {
              setSuccessMsg(`Berhasil melakukan scan QR Ruangan: ${response.data.task?.room?.name || foundTask?.room?.name || 'Ruangan'}. Status tugas berubah menjadi Sedang Dikerjakan.`);
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

              setBarcodePhoto(capturedBlob);
              setBarcodePhotoName(`scanned-barcode-${(response.data.task?.id || foundTask?.id || '').substring(0,8)}.jpg`);
              setFotoAfterFiles([null, null, null, null]);
              setFotoAfterPreviews([null, null, null, null]);

              // Hentikan scanner, tutup modal, dan aktifkan form checklist
              await stopScanner();
              setShowScanner(false);
              setScanningTask(null);
              setActiveTask(response.data.task || foundTask || scanningTask);
            }
          } catch (err) {
            console.error('Error during QR decode callback:', err);
            setError(err.message || 'Gagal memproses QR Code.');
            await stopScanner();
            setShowScanner(false);
          }
        },
        (errorMessage) => {
          // silent failure on frame scanner missed
        }
      );
    } catch (err) {
      setError(err.message || 'Gagal membuka akses kamera. Pastikan memberikan izin akses kamera.');
      setScannerActive(false);
    }
  };

  const fetchMyTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/tasks/my-tasks');
      if (response.success) {
        setTasks(response.data.data || response.data || []);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat tugas harian Anda.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTasks();
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

  // Resume an already in progress task (if CS refreshed the browser)
  const handleResumeTask = async (task) => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const payload = {
        room_id: task.room_id || task.room?.id,
        qr_code_token: task.room?.qr_code_token,
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

      formData.append('foto_after_1', fotoAfterFiles[0], `after-1-${activeTask.id.substring(0, 8)}.jpg`);
      formData.append('foto_after_2', fotoAfterFiles[1], `after-2-${activeTask.id.substring(0, 8)}.jpg`);
      formData.append('foto_after_3', fotoAfterFiles[2], `after-3-${activeTask.id.substring(0, 8)}.jpg`);
      formData.append('foto_after_4', fotoAfterFiles[3], `after-4-${activeTask.id.substring(0, 8)}.jpg`);

      const response = await api.post('/submissions', formData);
      if (response.success) {
        setSuccessMsg('Laporan kebersihan ruangan berhasil dikirim! Menunggu verifikasi dari PIC.');
        setActiveTask(null);
        setChecklistItems([]);
        setSubmissionNotes('');
        setFotoAfterFiles([null, null, null, null]);
        setFotoAfterPreviews([null, null, null, null]);
        fetchMyTasks();
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
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>Tugas Saya</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Melihat jadwal tugas pembersihan, scan QR Code, dan laporkan pekerjaan</p>
        </div>
        {!activeTask && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={handleGlobalScan} style={{ display: 'inline-flex', gap: '6px' }}>
              <QrCode size={16} /> Scan Barcode Ruangan
            </button>
            <button className="btn btn-secondary" onClick={fetchMyTasks}>
              Segarkan
            </button>
          </div>
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
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ACTIVE TASK CHECKLIST SUBMISSION */}
      {activeTask && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-md)', marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <div>
              <span className="role-badge role-cs" style={{ marginBottom: '6px' }}>Sedang Dikerjakan</span>
              <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Laporan: {activeTask.room?.name || 'Ruangan'} ({activeTask.room?.code})</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Gedung: {activeTask.room?.building?.name} | Shift: {activeTask.shift?.name || 'Aktif'}</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setActiveTask(null)} disabled={submitting}>
              Batal & Kembali
            </button>
          </div>

          <form onSubmit={handleSubmitReport}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
              {checklistItems.map((item, index) => {
                const result = checklistResults[item.id] || {};
                return (
                  <div key={item.id} className="glass-card" style={{ padding: '20px', background: 'rgba(255,255,255,0.01)', margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>ITEM #{index + 1}</span>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{item.name}</h3>
                        {item.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>SOP: {item.description}</p>}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {result.status ? (
                          <span 
                            style={{ 
                              color: 'var(--primary)', 
                              fontWeight: 600, 
                              fontSize: '0.9rem', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '6px',
                              background: 'rgba(16, 185, 129, 0.1)',
                              padding: '6px 12px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid rgba(16, 185, 129, 0.2)'
                            }}
                          >
                            <Check size={16} /> Dibersihkan
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleResultStatusChange(item.id, true)}
                            disabled={submitting}
                            style={{ 
                              borderColor: 'var(--primary)', 
                              color: 'var(--primary)',
                              fontWeight: 600
                            }}
                          >
                            Bersih
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Catatan Item (Opsional)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={result.notes || ''}
                        onChange={(e) => handleResultNotesChange(item.id, e.target.value)}
                        placeholder="Misal: Keran air agak longgar..."
                        disabled={submitting}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Foto bukti 4 slot: 4 after */}
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>Bukti Foto Ruangan*</label>
                  <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Ambil 4 foto setelah pembersihan langsung dari kamera perangkat.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '16px' }}>
                {[0, 1, 2, 3].map((slotIndex) => {
                  const label = `After ${slotIndex + 1}`;
                  const preview = fotoAfterPreviews[slotIndex];
                  return (
                    <div key={`after-${slotIndex}`} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'rgba(255,255,255,0.03)' }}>
                      <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.04)' }}>
                        <strong style={{ display: 'block', marginBottom: '6px' }}>{label}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Setelah</span>
                      </div>
                      <div style={{ minHeight: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        {preview ? (
                          <img src={preview} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '12px' }}>
                            Belum ada foto {label.toLowerCase()}.
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
                        <p style={{ margin: '0 0 6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Foto hanya bisa diambil via kamera. Upload dari galeri tidak diizinkan.
                        </p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={submitting}
                            onClick={() => handleStartRoomCamera(slotIndex, 'after')}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flex: 1 }}
                          >
                            <ImageIcon size={14} /> {preview ? 'Ambil Ulang' : 'Kamera'}
                          </button>
                        </div>
                        {preview && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            disabled={submitting}
                            onClick={() => {
                              const newFiles = [...fotoAfterFiles];
                              const newPreviews = [...fotoAfterPreviews];
                              newFiles[slotIndex] = null;
                              newPreviews[slotIndex] = null;
                              setFotoAfterFiles(newFiles);
                              setFotoAfterPreviews(newPreviews);
                            }}
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>


            </div>

            <div className="form-group">
              <label className="form-label">Catatan Umum Pekerjaan (Opsional)</label>
              <textarea 
                className="form-control" 
                rows="3"
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
                placeholder="Tulis kendala pengerjaan jika ada..."
                disabled={submitting}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', height: '46px' }}
              disabled={submitting}
            >
              {submitting ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <div className="spinner"></div>
                  <span>Mengirim Laporan...</span>
                </div>
              ) : (
                <span>Kirim Laporan & Serahkan Laporan</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* MY TASKS LIST */}
      {!activeTask && (
        <div>
          {loading ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ruangan</th>
                    <th className="col-hide-mobile">Gedung</th>
                    <th className="col-hide-mobile">Shift Kerja</th>
                    <th>Batas Waktu (Due)</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map((n) => (
                    <tr key={n} className="skeleton-shimmer">
                      <td><div className="skeleton-title" style={{ width: '120px' }}></div></td>
                      <td className="col-hide-mobile"><div className="skeleton-text" style={{ width: '100px' }}></div></td>
                      <td className="col-hide-mobile"><div className="skeleton-text" style={{ width: '80px' }}></div></td>
                      <td><div className="skeleton-text" style={{ width: '140px' }}></div></td>
                      <td><div className="skeleton-text" style={{ width: '90px' }}></div></td>
                      <td><div className="skeleton-rect" style={{ width: '110px', height: '32px' }}></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                        <th>Batas Waktu (Due)</th>
                        <th>Status</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map(t => (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 600 }}>
                            <div>{t.room?.name || 'Ruangan'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Kode: {t.room?.code}</div>
                          </td>
                          <td className="col-hide-mobile">{t.room?.building?.name || '-'}</td>
                          <td className="col-hide-mobile">
                            <span style={{ fontWeight: 500 }}>{t.shift?.name}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span>{t.task_date}</span>
                              <span style={{ fontSize: '0.8rem', color: t.status === 'overdue' ? 'var(--danger)' : 'var(--text-secondary)' }}>
                                Jam {t.due_datetime ? (t.due_datetime.includes('T') ? t.due_datetime.split('T')[1]?.substring(0, 5) : t.due_datetime.split(' ')[1]?.substring(0, 5)) : '-'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className={`role-badge ${
                              t.status === 'completed' ? 'role-cs' : 
                              t.status === 'in_progress' ? 'role-supervisor' : 
                              t.status === 'waiting_verification' ? 'role-pic' : 
                              t.status === 'rejected' ? 'role-admin' :
                              t.status === 'overdue' ? 'role-admin' : 'role-manager'
                            }`} style={{ textTransform: 'capitalize' }}>
                              {t.status === 'pending' ? 'Belum Mulai' :
                               t.status === 'in_progress' ? 'Sedang Dikerjakan' :
                               t.status === 'waiting_verification' ? 'Menunggu Verifikasi' :
                               t.status === 'completed' ? 'Selesai' :
                               t.status === 'rejected' ? 'Ditolak' :
                               t.status === 'overdue' ? 'Terlambat' : t.status}
                            </span>
                          </td>
                          <td>
                            {t.status === 'pending' && (
                              <button 
                                className="btn btn-primary btn-sm"
                                onClick={() => handleScanQr(t)}
                                style={{ display: 'inline-flex', gap: '6px' }}
                              >
                                <QrCode size={14} /> Scan & Mulai
                              </button>
                            )}
                            {t.status === 'in_progress' && (
                              <button 
                                className="btn btn-warning btn-sm"
                                onClick={() => handleResumeTask(t)}
                                style={{ display: 'inline-flex', gap: '6px', color: 'white' }}
                              >
                                <ClipboardCheck size={14} /> Isi Laporan
                              </button>
                            )}
                            {t.status === 'waiting_verification' && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Menunggu Verifikasi</span>
                            )}
                            {t.status === 'completed' && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>Tugas Selesai</span>
                            )}
                            {t.status === 'rejected' && (
                              <button 
                                className="btn btn-danger btn-sm"
                                onClick={() => handleScanQr(t)}
                                style={{ display: 'inline-flex', gap: '6px' }}
                              >
                                <Play size={14} /> Kerjakan Ulang
                              </button>
                            )}
                            {t.status === 'overdue' && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>Terlambat</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {tasks.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                            Tidak ada tugas kebersihan yang ditugaskan kepada Anda hari ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tampilan Mobile (Kartu Tugas CS) */}
              <div className="mobile-view">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {tasks.map(t => (
                    <div 
                      key={t.id} 
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
                          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{t.room?.name || 'Ruangan'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Gedung: {t.room?.building?.name || '-'} • Kode: {t.room?.code}</div>
                        </div>
                        <span className="role-badge role-supervisor" style={{ fontSize: '0.7rem' }}>{t.shift?.name}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '8px 0', borderTop: '1px dashed var(--border-color)', borderBottom: '1px dashed var(--border-color)', margin: '4px 0' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Batas Waktu:</span>
                        <strong style={{ color: t.status === 'overdue' ? 'var(--danger)' : 'var(--text-primary)' }}>
                          {t.task_date} Pukul {t.due_datetime ? (t.due_datetime.includes('T') ? t.due_datetime.split('T')[1]?.substring(0, 5) : t.due_datetime.split(' ')[1]?.substring(0, 5)) : '-'}
                        </strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className={`role-badge ${
                          t.status === 'completed' ? 'role-cs' : 
                          t.status === 'in_progress' ? 'role-supervisor' : 
                          t.status === 'waiting_verification' ? 'role-pic' : 
                          t.status === 'rejected' ? 'role-admin' :
                          t.status === 'overdue' ? 'role-admin' : 'role-manager'
                        }`} style={{ textTransform: 'capitalize', fontSize: '0.72rem' }}>
                          {t.status === 'pending' ? 'Belum Mulai' :
                           t.status === 'in_progress' ? 'Sedang Dikerjakan' :
                           t.status === 'waiting_verification' ? 'Menunggu Verifikasi' :
                           t.status === 'completed' ? 'Selesai' :
                           t.status === 'rejected' ? 'Ditolak' :
                           t.status === 'overdue' ? 'Terlambat' : t.status}
                        </span>

                        <div style={{ flex: '1', display: 'flex', justifyContent: 'flex-end', marginLeft: '12px' }}>
                          {t.status === 'pending' && (
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => handleScanQr(t)}
                              style={{ display: 'inline-flex', gap: '6px', width: '100%', justifyContent: 'center' }}
                            >
                              <QrCode size={14} /> Scan & Mulai
                            </button>
                          )}
                          {t.status === 'in_progress' && (
                            <button 
                              className="btn btn-warning btn-sm"
                              onClick={() => handleResumeTask(t)}
                              style={{ display: 'inline-flex', gap: '6px', color: 'white', width: '100%', justifyContent: 'center' }}
                            >
                              <ClipboardCheck size={14} /> Isi Laporan
                            </button>
                          )}
                          {t.status === 'waiting_verification' && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Menunggu Verifikasi</span>
                          )}
                          {t.status === 'completed' && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>Tugas Selesai</span>
                          )}
                          {t.status === 'rejected' && (
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={() => handleScanQr(t)}
                              style={{ display: 'inline-flex', gap: '6px', width: '100%', justifyContent: 'center' }}
                            >
                              <Play size={14} /> Kerjakan Ulang
                            </button>
                          )}
                          {t.status === 'overdue' && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>Terlambat</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Tidak ada tugas kebersihan yang ditugaskan kepada Anda hari ini.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
      {/* SCANNING BARCODE MODAL */}
      {showScanner && (
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
                <QrCode size={22} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Scan Barcode Kehadiran</h3>
              </div>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={handleCloseScanner}
                style={{ padding: '4px 8px' }}
              >
                Tutup
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '16px', textAlign: 'center' }}>
                {lockedTask 
                  ? `Silakan scan QR Code yang tertempel di pintu ruangan ${scanningTask?.room?.name || ''} untuk memverifikasi kehadiran.`
                  : `Arahkan kamera ke QR Code yang tertempel di pintu ruangan mana saja untuk memverifikasi kehadiran Anda secara otomatis.`
                }
              </p>

              {/* CAMERA SCANNER AREA */}
              <div style={{ 
                background: '#0a0e17', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                marginBottom: '20px',
                minHeight: '240px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                <div 
                  id="qr-reader" 
                  style={{ 
                    width: '100%', 
                    maxWidth: '360px', 
                    borderRadius: 'var(--radius-sm)', 
                    overflow: 'hidden',
                    display: scannerActive ? 'block' : 'none'
                  }}
                ></div>
                
                {!scannerActive && (
                  <div style={{ textAlign: 'center', padding: '24px' }}>
                    <QrCode size={48} style={{ color: 'var(--primary)', opacity: 0.8, marginBottom: '12px' }} />
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                      Pindai QR Code langsung menggunakan kamera perangkat Anda.
                    </p>
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={handleStartScanning}
                      style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', border: 'none' }}
                    >
                      Buka Kamera & Scan QR
                    </button>
                  </div>
                )}

                {scannerActive && (
                  <button 
                    type="button" 
                    className="btn btn-danger btn-sm"
                    onClick={stopScanner}
                    style={{ position: 'absolute', bottom: '10px', zIndex: 10 }}
                  >
                    Matikan Kamera
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleCloseScanner}
                style={{ width: '100%' }}
              >
                Tutup / Batal
              </button>
            </div>
          </div>
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
