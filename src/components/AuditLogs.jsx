import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { 
  ShieldAlert, Search, RefreshCw, Eye, Calendar, Play, 
  CheckSquare, Clock, PlusCircle, Edit, UserCheck, Trash2, 
  QrCode, Activity, BarChart2, Layers, Cpu, Terminal, Wrench
} from 'lucide-react';

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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '80px', background: 'rgba(0,0,0,0.1)', borderRadius: 'var(--radius-md)' }}>
        <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
      </div>
    );
  }

  if (error || !imgUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '80px', background: 'rgba(0,0,0,0.05)', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '10px', borderRadius: 'var(--radius-md)' }}>
        <span>Tidak ada foto</span>
      </div>
    );
  }

  return (
    <>
      <img 
        src={imgUrl} 
        alt={alt} 
        className={className} 
        onClick={() => setIsZoomed(true)}
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover', 
          borderRadius: 'var(--radius-md)', 
          cursor: 'zoom-in',
          transition: 'transform 0.2s ease, filter 0.2s ease',
          ...style 
        }} 
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = 'brightness(0.9)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = 'none';
        }}
      />

      {isZoomed && (
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
            zIndex: 99999,
            cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
              onClick={(e) => { e.stopPropagation(); setIsZoomed(false); }}
              style={{
                position: 'absolute',
                top: '-40px',
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
        </div>
      )}
    </>
  );
}

const getFriendlyEntityName = (entityType) => {
  switch (entityType) {
    case 'findings':
      return 'Temuan Kerusakan';
    case 'checklist_submissions':
      return 'Laporan Checklist';
    case 'tasks':
      return 'Tugas CS';
    case 'adhoc_tasks':
      return 'Tugas Khusus & Acara';
    case 'room_asset_audits':
      return 'Audit Aset Ruangan';
    case 'rooms':
      return 'Ruangan';
    case 'users':
      return 'Pengguna';
    case 'buildings':
      return 'Gedung';
    case 'schedules':
      return 'Jadwal Kerja';
    case 'cs_assignments':
      return 'Penugasan CS';
    case 'shifts':
      return 'Shift Kerja';
    case 'verifications':
      return 'Verifikasi';
    default:
      return entityType ? entityType.replace(/_/g, ' ') : '';
  }
};

const getTargetDescription = (log) => {
  const data = log.new_data || log.old_data;
  if (!data) return '';

  // If it's an adhoc task
  if (log.entity_type === 'adhoc_tasks') {
    const judul = data.judul || '';
    const roomName = data.room?.nama_ruangan || data.room?.name || '';
    if (judul && roomName) {
      return `: "${judul}" di ruang ${roomName}`;
    } else if (judul) {
      return `: "${judul}"`;
    }
  }

  // If it's a room asset audit
  if (log.entity_type === 'room_asset_audits') {
    const roomName = data.room?.nama_ruangan || data.room?.name || '';
    if (roomName) {
      return `di ruang ${roomName}`;
    }
  }
  
  // If it's a finding
  if (log.entity_type === 'findings') {
    const deskripsi = data.deskripsi || '';
    const roomName = data.room?.nama_ruangan || data.room?.name || '';
    if (roomName && deskripsi) {
      return `di ruang ${roomName} ("${deskripsi}")`;
    } else if (deskripsi) {
      return `("${deskripsi}")`;
    } else if (roomName) {
      return `di ruang ${roomName}`;
    }
  }
  
  // If it's a task
  if (log.entity_type === 'tasks') {
    const roomName = data.room?.nama_ruangan || data.room?.name || '';
    if (roomName) {
      return `di ruang ${roomName}`;
    }
  }
  
  // If it's a checklist submission
  if (log.entity_type === 'checklist_submissions') {
    const roomName = data.task?.room?.nama_ruangan || data.task?.room?.name || '';
    if (roomName) {
      return `di ruang ${roomName}`;
    }
  }

  // If it's a room
  if (log.entity_type === 'rooms') {
    const roomName = data.nama_ruangan || data.name || '';
    const roomCode = data.kode_ruangan || data.code || '';
    if (roomName && roomCode) {
      return `: ${roomName} (${roomCode})`;
    } else if (roomName) {
      return `: ${roomName}`;
    }
  }

  // If it's a user
  if (log.entity_type === 'users') {
    const fullName = data.full_name || '';
    const username = data.username || '';
    if (fullName && username) {
      return `: ${fullName} (${username})`;
    } else if (fullName) {
      return `: ${fullName}`;
    }
  }

  // If it's a building
  if (log.entity_type === 'buildings') {
    const bName = data.nama_gedung || data.name || '';
    if (bName) {
      return `: ${bName}`;
    }
  }
  
  // If it's a schedule
  if (log.entity_type === 'schedules') {
    const roomName = data.room?.nama_ruangan || data.room?.name || '';
    if (roomName) {
      return `di ruang ${roomName}`;
    }
  }

  // If it's a cs_assignment
  if (log.entity_type === 'cs_assignments') {
    const bName = data.building?.nama_gedung || data.building?.name || '';
    const csName = data.cs?.full_name || '';
    if (bName && csName) {
      return `: ${csName} ke ${bName}`;
    } else if (bName) {
      return `ke ${bName}`;
    } else if (csName) {
      return `untuk ${csName}`;
    }
  }

  return '';
};

// Render photos in audit log items
function RenderAuditPhotos({ log }) {
  if (log.entity_type === 'findings') {
    const isResolved = log.action === 'UPDATE_FINDING_STATUS' && (log.new_data?.status === 'resolved' || log.new_data?.resolved_at);
    
    return (
      <div style={{ marginTop: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Foto Temuan:</span>
          <div style={{ width: '130px', height: '95px', overflow: 'hidden', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <SecureImage src={`/findings/${log.entity_id}/foto`} alt="Foto Temuan" />
          </div>
        </div>
        {isResolved && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Foto Selesai (Perbaikan):</span>
            <div style={{ width: '130px', height: '95px', overflow: 'hidden', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <SecureImage src={`/findings/${log.entity_id}/foto-resolved`} alt="Foto Selesai" />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (log.entity_type === 'checklist_submissions') {
    return (
      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Bukti Foto Pembersihan (4 Foto):</span>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Foto {idx} (After):</span>
              <div style={{ width: '130px', height: '95px', overflow: 'hidden', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <SecureImage src={`/submissions/${log.entity_id}/foto-after-${idx}`} alt={`Foto After ${idx}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (log.entity_type === 'adhoc_tasks') {
    const hasSetup = log.action.includes('SETUP') || log.action === 'VERIFY_ADHOC_TASK' || log.action === 'SUBMIT_ADHOC_TASK' || log.new_data?.foto_bukti;
    const hasCleanup = log.action.includes('CLEANUP') || log.action === 'VERIFY_ADHOC_TASK' || log.new_data?.foto_bukti_cleanup;
    return (
      <div style={{ marginTop: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {hasSetup && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Foto Bukti Persiapan:</span>
            <div style={{ width: '130px', height: '95px', overflow: 'hidden', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <SecureImage src={`/adhoc-tasks/${log.entity_id}/foto-persiapan`} alt="Foto Persiapan" />
            </div>
          </div>
        )}
        {hasCleanup && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Foto Bukti Perapihan:</span>
            <div style={{ width: '130px', height: '95px', overflow: 'hidden', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <SecureImage src={`/adhoc-tasks/${log.entity_id}/foto-cleanup`} alt="Foto Perapihan" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all'); // all, tasks, rooms, other
  const [viewMode, setViewMode] = useState('timeline'); // timeline, table

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch more logs (up to 100) to populate search and timeline properly
      const response = await api.get('/audit-logs?per_page=100');
      if (response.success) {
        setLogs(response.data.data || response.data || []);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat data log audit.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Helper: Friendly translation of actions with color and icon mapping
  const getActionDetails = (action) => {
    switch (action) {
      case 'CREATE_ADHOC_TASK':
        return {
          label: 'Buat Tugas Khusus / Acara',
          description: 'Membuat penugasan persiapan meeting / tugas insidental',
          color: '#34d399',
          bgColor: 'rgba(52, 211, 153, 0.1)',
          borderColor: 'rgba(52, 211, 153, 0.25)',
          iconType: 'plus-circle'
        };
      case 'START_ADHOC_TASK':
        return {
          label: 'Mulai Tugas Khusus',
          description: 'CS memulai pengerjaan persiapan ruangan / tugas khusus',
          color: 'var(--primary)',
          bgColor: 'rgba(16, 185, 129, 0.1)',
          borderColor: 'rgba(16, 185, 129, 0.25)',
          iconType: 'play'
        };
      case 'SUBMIT_SETUP_ADHOC_TASK':
        return {
          label: 'Kirim Bukti Persiapan',
          description: 'CS menyerahkan foto bukti persiapan ruangan meeting',
          color: '#a78bfa',
          bgColor: 'rgba(139, 92, 246, 0.1)',
          borderColor: 'rgba(139, 92, 246, 0.25)',
          iconType: 'check-square'
        };
      case 'SUBMIT_CLEANUP_ADHOC_TASK':
        return {
          label: 'Kirim Bukti Perapihan',
          description: 'CS menyerahkan foto bukti perapihan ruangan pasca-meeting',
          color: '#a78bfa',
          bgColor: 'rgba(139, 92, 246, 0.1)',
          borderColor: 'rgba(139, 92, 246, 0.25)',
          iconType: 'check-square'
        };
      case 'SUBMIT_ADHOC_TASK':
        return {
          label: 'Kirim Laporan Tugas Khusus',
          description: 'CS menyerahkan bukti pengerjaan tugas khusus',
          color: '#a78bfa',
          bgColor: 'rgba(139, 92, 246, 0.1)',
          borderColor: 'rgba(139, 92, 246, 0.25)',
          iconType: 'check-square'
        };
      case 'VERIFY_ADHOC_TASK':
        return {
          label: 'Verifikasi Tugas Khusus Selesai',
          description: 'Supervisor/Admin menyetujui & menyelesaikan tugas khusus / meeting',
          color: 'var(--primary)',
          bgColor: 'rgba(16, 185, 129, 0.1)',
          borderColor: 'rgba(16, 185, 129, 0.25)',
          iconType: 'check-square'
        };
      case 'DELETE_ADHOC_TASK':
        return {
          label: 'Hapus Tugas Khusus',
          description: 'Menghapus penugasan tugas khusus dari sistem',
          color: '#f87171',
          bgColor: 'rgba(248, 113, 113, 0.1)',
          borderColor: 'rgba(248, 113, 113, 0.25)',
          iconType: 'trash'
        };
      case 'CREATE_ROOM_ASSET_AUDIT':
      case 'SUBMIT_ROOM_ASSET_AUDIT':
      case 'VERIFY_ROOM_ASSET_AUDIT':
        return {
          label: 'Audit Aset Ruangan',
          description: 'Pemeriksaan fisik & verifikasi kondisi aset ruangan',
          color: '#38bdf8',
          bgColor: 'rgba(56, 189, 248, 0.1)',
          borderColor: 'rgba(56, 189, 248, 0.25)',
          iconType: 'check-square'
        };
      case 'START_TASK':
        return {
          label: 'Mulai Tugas',
          description: 'Memulai pengerjaan kebersihan ruangan',
          color: 'var(--primary)',
          bgColor: 'rgba(16, 185, 129, 0.1)',
          borderColor: 'rgba(16, 185, 129, 0.25)',
          iconType: 'play'
        };
      case 'SUBMIT_CHECKLIST_REPORT':
        return {
          label: 'Kirim Laporan',
          description: 'Menyerahkan laporan checklist & bukti foto kebersihan',
          color: '#a78bfa', // Violet
          bgColor: 'rgba(139, 92, 246, 0.1)',
          borderColor: 'rgba(139, 92, 246, 0.25)',
          iconType: 'check-square'
        };
      case 'UPDATE_TASK_STATUS_TO_WAITING_VERIFICATION':
        return {
          label: 'Menunggu Verifikasi',
          description: 'Mengajukan hasil laporan tugas untuk diverifikasi oleh PIC',
          color: '#60a5fa', // Blue
          bgColor: 'rgba(59, 130, 246, 0.1)',
          borderColor: 'rgba(59, 130, 246, 0.25)',
          iconType: 'clock'
        };
      case 'ROOM_CREATED':
        return {
          label: 'Buat Ruangan',
          description: 'Mendaftarkan data ruangan baru ke dalam sistem',
          color: '#34d399', // Emerald
          bgColor: 'rgba(52, 211, 153, 0.1)',
          borderColor: 'rgba(52, 211, 153, 0.25)',
          iconType: 'plus-circle'
        };
      case 'UPDATE_ROOM':
        return {
          label: 'Update Ruangan',
          description: 'Memperbarui informasi detail ruangan',
          color: '#fbbf24', // Amber
          bgColor: 'rgba(251, 191, 36, 0.1)',
          borderColor: 'rgba(251, 191, 36, 0.25)',
          iconType: 'edit'
        };
      case 'ROOM_PIC_UPDATED':
        return {
          label: 'Ganti PIC Ruang',
          description: 'Memperbarui data PIC penanggung jawab ruangan',
          color: '#22d3ee', // Cyan
          bgColor: 'rgba(34, 211, 238, 0.1)',
          borderColor: 'rgba(34, 211, 238, 0.25)',
          iconType: 'user-check'
        };
      case 'ROOM_DEACTIVATED':
        return {
          label: 'Deaktivasi Ruangan',
          description: 'Menonaktifkan status ruangan di dalam sistem',
          color: '#f87171', // Red
          bgColor: 'rgba(248, 113, 113, 0.1)',
          borderColor: 'rgba(248, 113, 113, 0.25)',
          iconType: 'trash'
        };
      case 'ROOM_QR_REGENERATED':
        return {
          label: 'Regenerasi QR',
          description: 'Meregenerasi ulang QR Code dan token keamanan ruangan',
          color: '#fb7185', // Rose
          bgColor: 'rgba(251, 113, 133, 0.1)',
          borderColor: 'rgba(251, 113, 133, 0.25)',
          iconType: 'qr-code'
        };
      case 'VERIFY_SUBMISSION_APPROVE':
      case 'UPDATE_SUBMISSION_STATUS_TO_APPROVED':
      case 'UPDATE_TASK_STATUS_TO_COMPLETED':
        return {
          label: 'Tugas Disetujui',
          description: 'Menyetujui laporan & menandai tugas kebersihan selesai',
          color: 'var(--primary)',
          bgColor: 'rgba(16, 185, 129, 0.1)',
          borderColor: 'rgba(16, 185, 129, 0.25)',
          iconType: 'check-square'
        };
      case 'VERIFY_SUBMISSION_REJECT':
      case 'UPDATE_SUBMISSION_STATUS_TO_REJECTED':
      case 'UPDATE_TASK_STATUS_TO_REJECTED':
        return {
          label: 'Laporan Ditolak',
          description: 'Menolak laporan tugas kebersihan ruangan',
          color: '#f87171', // Red
          bgColor: 'rgba(230, 0, 0, 0.1)',
          borderColor: 'rgba(230, 0, 0, 0.25)',
          iconType: 'trash'
        };
      case 'USER_LOGIN':
        return {
          label: 'User Login',
          description: 'Masuk (login) ke dalam sistem',
          color: '#60a5fa', // Blue
          bgColor: 'rgba(59, 130, 246, 0.1)',
          borderColor: 'rgba(59, 130, 246, 0.25)',
          iconType: 'user-check'
        };
      case 'USER_LOGOUT':
        return {
          label: 'User Logout',
          description: 'Keluar (logout) dari sistem',
          color: '#94a3b8',
          bgColor: 'rgba(148, 163, 184, 0.1)',
          borderColor: 'rgba(148, 163, 184, 0.25)',
          iconType: 'user-check'
        };
      case 'PASSWORD_CHANGED':
        return {
          label: 'Ganti Password',
          description: 'Mengubah kata sandi akun',
          color: '#38bdf8',
          bgColor: 'rgba(56, 189, 248, 0.1)',
          borderColor: 'rgba(56, 189, 248, 0.25)',
          iconType: 'user-check'
        };
      case 'PASSWORD_RESET_BY_ADMIN':
        return {
          label: 'Reset Password',
          description: 'Mereset kata sandi pengguna',
          color: '#fbbf24',
          bgColor: 'rgba(251, 191, 36, 0.1)',
          borderColor: 'rgba(251, 191, 36, 0.25)',
          iconType: 'user-check'
        };
      case 'CREATE_BUILDING':
        return {
          label: 'Tambah Gedung',
          description: 'Menambahkan data gedung baru',
          color: '#34d399',
          bgColor: 'rgba(52, 211, 153, 0.1)',
          borderColor: 'rgba(52, 211, 153, 0.25)',
          iconType: 'plus-circle'
        };
      case 'UPDATE_BUILDING':
        return {
          label: 'Update Gedung',
          description: 'Memperbarui data gedung',
          color: '#fbbf24',
          bgColor: 'rgba(251, 191, 36, 0.1)',
          borderColor: 'rgba(251, 191, 36, 0.25)',
          iconType: 'edit'
        };
      case 'DELETE_BUILDING':
        return {
          label: 'Hapus Gedung',
          description: 'Menghapus data gedung dari sistem',
          color: '#f87171',
          bgColor: 'rgba(248, 113, 113, 0.1)',
          borderColor: 'rgba(248, 113, 113, 0.25)',
          iconType: 'trash'
        };
      case 'CREATE_CHECKLIST_ITEM':
        return {
          label: 'Tambah Item Checklist',
          description: 'Menambahkan item pemeriksaan checklist baru',
          color: '#34d399',
          bgColor: 'rgba(52, 211, 153, 0.1)',
          borderColor: 'rgba(52, 211, 153, 0.25)',
          iconType: 'plus-circle'
        };
      case 'UPDATE_CHECKLIST_ITEM':
        return {
          label: 'Update Item Checklist',
          description: 'Memperbarui item pemeriksaan checklist',
          color: '#fbbf24',
          bgColor: 'rgba(251, 191, 36, 0.1)',
          borderColor: 'rgba(251, 191, 36, 0.25)',
          iconType: 'edit'
        };
      case 'DEACTIVATE_CHECKLIST_ITEM':
        return {
          label: 'Nonaktifkan Item',
          description: 'Menonaktifkan item pemeriksaan checklist',
          color: '#f87171',
          bgColor: 'rgba(248, 113, 113, 0.1)',
          borderColor: 'rgba(248, 113, 113, 0.25)',
          iconType: 'trash'
        };
      case 'DELETE_CHECKLIST_ITEM':
        return {
          label: 'Hapus Item Checklist',
          description: 'Menghapus item pemeriksaan checklist',
          color: '#f87171',
          bgColor: 'rgba(248, 113, 113, 0.1)',
          borderColor: 'rgba(248, 113, 113, 0.25)',
          iconType: 'trash'
        };
      case 'CREATE_CS_ASSIGNMENT':
        return {
          label: 'Tambah Penugasan CS',
          description: 'Menugaskan staf CS ke gedung',
          color: '#34d399',
          bgColor: 'rgba(52, 211, 153, 0.1)',
          borderColor: 'rgba(52, 211, 153, 0.25)',
          iconType: 'plus-circle'
        };
      case 'UPDATE_CS_ASSIGNMENT':
        return {
          label: 'Update Penugasan CS',
          description: 'Memperbarui data penugasan kerja CS',
          color: '#fbbf24',
          bgColor: 'rgba(251, 191, 36, 0.1)',
          borderColor: 'rgba(251, 191, 36, 0.25)',
          iconType: 'edit'
        };
      case 'END_CS_ASSIGNMENT':
        return {
          label: 'Selesaikan Penugasan',
          description: 'Mengakhiri penugasan kerja CS',
          color: '#a78bfa',
          bgColor: 'rgba(139, 92, 246, 0.1)',
          borderColor: 'rgba(139, 92, 246, 0.25)',
          iconType: 'check-square'
        };
      case 'DELETE_CS_ASSIGNMENT':
        return {
          label: 'Hapus Penugasan CS',
          description: 'Menghapus penugasan CS dari sistem',
          color: '#f87171',
          bgColor: 'rgba(248, 113, 113, 0.1)',
          borderColor: 'rgba(248, 113, 113, 0.25)',
          iconType: 'trash'
        };
      case 'CREATE_FINDING':
        return {
          label: 'Laporkan Temuan',
          description: 'Melaporkan temuan kerusakan baru',
          color: '#f87171',
          bgColor: 'rgba(248, 113, 113, 0.1)',
          borderColor: 'rgba(248, 113, 113, 0.25)',
          iconType: 'shield-alert'
        };
      case 'UPDATE_FINDING_STATUS':
        return {
          label: 'Update Status Temuan',
          description: 'Memperbarui status perbaikan temuan kerusakan',
          color: '#38bdf8',
          bgColor: 'rgba(56, 189, 248, 0.1)',
          borderColor: 'rgba(56, 189, 248, 0.25)',
          iconType: 'wrench'
        };
      case 'DELETE_FINDING':
        return {
          label: 'Hapus Temuan',
          description: 'Menghapus laporan temuan kerusakan',
          color: '#f87171',
          bgColor: 'rgba(248, 113, 113, 0.1)',
          borderColor: 'rgba(248, 113, 113, 0.25)',
          iconType: 'trash'
        };
      case 'CREATE_USER':
        return {
          label: 'Tambah Pengguna',
          description: 'Mendaftarkan pengguna baru',
          color: '#34d399',
          bgColor: 'rgba(52, 211, 153, 0.1)',
          borderColor: 'rgba(52, 211, 153, 0.25)',
          iconType: 'plus-circle'
        };
      case 'UPDATE_USER':
        return {
          label: 'Update Pengguna',
          description: 'Memperbarui data pengguna',
          color: '#fbbf24',
          bgColor: 'rgba(251, 191, 36, 0.1)',
          borderColor: 'rgba(251, 191, 36, 0.25)',
          iconType: 'edit'
        };
      case 'DELETE_USER':
        return {
          label: 'Hapus Pengguna',
          description: 'Menghapus data pengguna dari sistem',
          color: '#f87171',
          bgColor: 'rgba(248, 113, 113, 0.1)',
          borderColor: 'rgba(248, 113, 113, 0.25)',
          iconType: 'trash'
        };
      case 'CREATE_SCHEDULE':
        return {
          label: 'Tambah Jadwal',
          description: 'Membuat jadwal kerja checklist baru',
          color: '#34d399',
          bgColor: 'rgba(52, 211, 153, 0.1)',
          borderColor: 'rgba(52, 211, 153, 0.25)',
          iconType: 'plus-circle'
        };
      case 'UPDATE_SCHEDULE':
        return {
          label: 'Update Jadwal',
          description: 'Memperbarui jadwal kerja checklist',
          color: '#fbbf24',
          bgColor: 'rgba(251, 191, 36, 0.1)',
          borderColor: 'rgba(251, 191, 36, 0.25)',
          iconType: 'edit'
        };
      case 'DEACTIVATE_SCHEDULE':
        return {
          label: 'Nonaktifkan Jadwal',
          description: 'Menonaktifkan jadwal kerja checklist',
          color: '#f87171',
          bgColor: 'rgba(248, 113, 113, 0.1)',
          borderColor: 'rgba(248, 113, 113, 0.25)',
          iconType: 'trash'
        };
      case 'CREATE_SHIFT':
        return {
          label: 'Tambah Shift',
          description: 'Menambahkan data shift kerja baru',
          color: '#34d399',
          bgColor: 'rgba(52, 211, 153, 0.1)',
          borderColor: 'rgba(52, 211, 153, 0.25)',
          iconType: 'plus-circle'
        };
      case 'UPDATE_SHIFT':
        return {
          label: 'Update Shift',
          description: 'Memperbarui data shift kerja',
          color: '#fbbf24',
          bgColor: 'rgba(251, 191, 36, 0.1)',
          borderColor: 'rgba(251, 191, 36, 0.25)',
          iconType: 'edit'
        };
      case 'DEACTIVATE_SHIFT':
        return {
          label: 'Nonaktifkan Shift',
          description: 'Menonaktifkan shift kerja',
          color: '#f87171',
          bgColor: 'rgba(248, 113, 113, 0.1)',
          borderColor: 'rgba(248, 113, 113, 0.25)',
          iconType: 'trash'
        };
      case 'DELETE_SHIFT':
        return {
          label: 'Hapus Shift',
          description: 'Menghapus shift kerja dari sistem',
          color: '#f87171',
          bgColor: 'rgba(248, 113, 113, 0.1)',
          borderColor: 'rgba(248, 113, 113, 0.25)',
          iconType: 'trash'
        };
      default:
        return {
          label: action ? action.replace(/_/g, ' ') : 'Aktivitas',
          description: 'Melakukan transaksi/perubahan data sistem',
          color: '#94a3b8', // Slate
          bgColor: 'rgba(148, 163, 184, 0.1)',
          borderColor: 'rgba(148, 163, 184, 0.25)',
          iconType: 'activity'
        };
    }
  };

  const renderIcon = (type, color) => {
    const size = 16;
    const style = { color: color };
    switch (type) {
      case 'play':
        return <Play size={size} style={style} />;
      case 'check-square':
        return <CheckSquare size={size} style={style} />;
      case 'clock':
        return <Clock size={size} style={style} />;
      case 'plus-circle':
        return <PlusCircle size={size} style={style} />;
      case 'edit':
        return <Edit size={size} style={style} />;
      case 'user-check':
        return <UserCheck size={size} style={style} />;
      case 'trash':
        return <Trash2 size={size} style={style} />;
      case 'qr-code':
        return <QrCode size={size} style={style} />;
      case 'shield-alert':
        return <ShieldAlert size={size} style={style} />;
      case 'wrench':
        return <Wrench size={size} style={style} />;
      default:
        return <Activity size={size} style={style} />;
    }
  };

  // Filter logs based on search query and category
  const filteredLogs = logs.filter(log => {
    const details = getActionDetails(log.action);
    const searchString = searchQuery.toLowerCase();
    
    const matchesSearch = (
      log.action?.toLowerCase().includes(searchString) ||
      details.label.toLowerCase().includes(searchString) ||
      details.description.toLowerCase().includes(searchString) ||
      log.entity_type?.toLowerCase().includes(searchString) ||
      log.user?.full_name?.toLowerCase().includes(searchString) ||
      log.user?.username?.toLowerCase().includes(searchString)
    );

    if (!matchesSearch) return false;

    if (filterCategory === 'all') return true;
    if (filterCategory === 'tasks') {
      return ['START_TASK', 'SUBMIT_CHECKLIST_REPORT', 'UPDATE_TASK_STATUS_TO_WAITING_VERIFICATION'].includes(log.action);
    }
    if (filterCategory === 'rooms') {
      return ['ROOM_CREATED', 'UPDATE_ROOM', 'ROOM_PIC_UPDATED', 'ROOM_DEACTIVATED', 'ROOM_QR_REGENERATED'].includes(log.action);
    }
    if (filterCategory === 'other') {
      return !['START_TASK', 'SUBMIT_CHECKLIST_REPORT', 'UPDATE_TASK_STATUS_TO_WAITING_VERIFICATION', 'ROOM_CREATED', 'UPDATE_ROOM', 'ROOM_PIC_UPDATED', 'ROOM_DEACTIVATED', 'ROOM_QR_REGENERATED'].includes(log.action);
    }
    return true;
  });

  // Calculate statistics
  const statTotal = logs.length;
  const statTasks = logs.filter(l => ['START_TASK', 'SUBMIT_CHECKLIST_REPORT', 'UPDATE_TASK_STATUS_TO_WAITING_VERIFICATION'].includes(l.action)).length;
  const statRooms = logs.filter(l => ['ROOM_CREATED', 'UPDATE_ROOM', 'ROOM_PIC_UPDATED', 'ROOM_DEACTIVATED', 'ROOM_QR_REGENERATED'].includes(l.action)).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>Log Audit Sistem (Audit Trail)</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Pelacakan visual riwayat aktivitas pekerjaan CS, pergantian data, dan sistem CAMS</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchLogs} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={16} /> Segarkan
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* STATISTICS OVERVIEW CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
            <Activity size={20} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Aktivitas</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{statTotal}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid #a78bfa' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckSquare size={20} style={{ color: '#a78bfa' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Operasional & Tugas</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{statTasks}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid #fbbf24' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(251, 191, 36, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={20} style={{ color: '#fbbf24' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Perubahan Master Ruang</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{statRooms}</div>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER BUTTONS */}
      <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
          <button 
            onClick={() => setFilterCategory('all')} 
            className={`btn btn-sm ${filterCategory === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 600 }}
          >
            Semua Aksi
          </button>
          <button 
            onClick={() => setFilterCategory('tasks')} 
            className={`btn btn-sm ${filterCategory === 'tasks' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 600 }}
          >
            Operasional CS
          </button>
          <button 
            onClick={() => setFilterCategory('rooms')} 
            className={`btn btn-sm ${filterCategory === 'rooms' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 600 }}
          >
            Manajemen Ruang
          </button>
          <button 
            onClick={() => setFilterCategory('other')} 
            className={`btn btn-sm ${filterCategory === 'other' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 600 }}
          >
            Aksi Lainnya
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', width: 'auto' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', width: '220px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Search size={14} />
            </span>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Cari aktivitas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '32px', height: '36px', fontSize: '0.85rem', width: '100%' }}
            />
          </div>

          {/* View mode switcher */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <button 
              onClick={() => setViewMode('timeline')}
              style={{
                background: viewMode === 'timeline' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'timeline' ? 'white' : 'var(--text-secondary)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              Timeline
            </button>
            <button 
              onClick={() => setViewMode('table')}
              style={{
                background: viewMode === 'table' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'table' ? 'white' : 'var(--text-secondary)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              Tabel
            </button>
          </div>
        </div>
      </div>

      {/* COMPARISON VALUE DETAIL MODAL (SIDE-BY-SIDE GLASS PANEL) */}
      {selectedLog && (
        <div className="glass-panel" style={{ 
          padding: '24px', 
          borderRadius: 'var(--radius-md)', 
          marginBottom: '24px', 
          border: `1px solid ${getActionDetails(selectedLog.action).color}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={18} style={{ color: getActionDetails(selectedLog.action).color }} />
              <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>Detail Perubahan Nilai: {getActionDetails(selectedLog.action).label}</h2>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedLog(null)} style={{ padding: '4px 10px' }}>Tutup</button>
          </div>
          
          {/* Metadata info */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <div><strong>Operator:</strong> {selectedLog.user?.name || 'Sistem'}</div>
            <div><strong>Waktu:</strong> {new Date(selectedLog.created_at).toLocaleString('id-ID')}</div>
            <div><strong>IP:</strong> {selectedLog.ip_address || '-'}</div>
            <div><strong>Browser:</strong> {selectedLog.user_agent ? (selectedLog.user_agent.substring(0, 45) + '...') : '-'}</div>
          </div>

          {/* JSON Diff Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e' }}></span> Sebelum (Before)
              </div>
              <pre style={{ 
                background: '#070a13', 
                border: '1px solid rgba(244, 63, 94, 0.2)',
                padding: '12px', 
                borderRadius: 'var(--radius-sm)', 
                color: '#fda4af', 
                overflowX: 'auto', 
                fontSize: '0.75rem', 
                fontFamily: 'var(--mono)', 
                minHeight: '140px',
                maxHeight: '300px',
                lineHeight: '1.4'
              }}>
                {selectedLog.old_data && Object.keys(selectedLog.old_data).length > 0 
                  ? JSON.stringify(selectedLog.old_data, null, 2) 
                  : '// Tidak ada data lama (Data Baru Dibuat)'}
              </pre>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></span> Sesudah (After)
              </div>
              <pre style={{ 
                background: '#070a13', 
                border: '1px solid rgba(16, 185, 129, 0.2)',
                padding: '12px', 
                borderRadius: 'var(--radius-sm)', 
                color: '#a7f3d0', 
                overflowX: 'auto', 
                fontSize: '0.75rem', 
                fontFamily: 'var(--mono)', 
                minHeight: '140px',
                maxHeight: '300px',
                lineHeight: '1.4'
              }}>
                {selectedLog.new_data && Object.keys(selectedLog.new_data).length > 0 
                  ? JSON.stringify(selectedLog.new_data, null, 2) 
                  : '// Data Dihapus'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* CORE DISPLAY (TIMELINE OR TABLE) */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingLeft: '24px', borderLeft: '2px solid rgba(255,255,255,0.06)', marginLeft: '12px' }}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{ position: 'relative' }}>
              {/* Fake timeline node */}
              <div style={{
                position: 'absolute',
                left: '-35px',
                top: '12px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.03)',
                border: '2px solid rgba(255,255,255,0.06)',
                zIndex: 2
              }} className="skeleton-shimmer"></div>
              
              {/* Fake Glass Card */}
              <div className="glass-card skeleton-shimmer" style={{
                margin: 0,
                padding: '20px',
                height: '110px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '12px'
              }}>
                <div className="skeleton-title" style={{ width: '40%' }}></div>
                <div className="skeleton-text" style={{ width: '75%' }}></div>
                <div className="skeleton-text" style={{ width: '50%' }}></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* VIEW MODE: VISUAL TIMELINE */}
          {viewMode === 'timeline' && (
            <div style={{ position: 'relative', paddingLeft: '24px', borderLeft: '2px solid rgba(255,255,255,0.06)', marginLeft: '12px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filteredLogs.map((log) => {
                const details = getActionDetails(log.action);
                return (
                  <div key={log.id} style={{ position: 'relative', transition: 'all 0.3s' }}>
                    {/* Circle Node on Timeline Line */}
                    <div style={{ 
                      position: 'absolute', 
                      left: '-35px', 
                      top: '12px', 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%', 
                      background: '#070a13',
                      border: `2px solid ${details.color}`,
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      boxShadow: `0 0 10px ${details.bgColor}`,
                      zIndex: 2
                    }}>
                      {renderIcon(details.iconType, details.color)}
                    </div>

                    {/* Timeline Glass Card */}
                    <div className="glass-card" style={{ 
                      margin: 0, 
                      padding: '16px 20px', 
                      background: 'rgba(255,255,255,0.015)',
                      border: '1px solid var(--border-color)',
                      transition: 'transform 0.2s, background 0.2s',
                      cursor: 'default'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      e.currentTarget.style.borderColor = details.borderColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.015)';
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }}
                    >
                      {/* Top Header Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            fontWeight: 700, 
                            color: details.color, 
                            background: details.bgColor, 
                            border: `1px solid ${details.borderColor}`,
                            padding: '3px 8px', 
                            borderRadius: '4px',
                            textTransform: 'uppercase'
                          }}>
                            {details.label}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            pada {getFriendlyEntityName(log.entity_type)}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={12} />
                          {new Date(log.created_at).toLocaleString('id-ID')}
                        </span>
                      </div>

                      {/* Content Description */}
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0', lineHeight: '1.4' }}>
                        {log.user?.name || 'Sistem Otomatis'} {details.description.toLowerCase()} {getTargetDescription(log)}
                      </h3>
                      
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>
                        Operator: <strong>{log.user?.name || 'Sistem'}</strong> ({log.user?.email || 'cronjob'})
                      </p>

                      {/* Render foto biner jika ada */}
                      <RenderAuditPhotos log={log} />

                      <div style={{ margin: '8px 0' }}></div>

                      {/* Footer Row Actions / Meta */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                          IP: {log.ip_address || 'local'}
                        </span>
                        
                        <span></span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredLogs.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px', background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  Tidak ada aktivitas audit yang cocok dengan filter.
                </div>
              )}
            </div>
          )}

          {/* VIEW MODE: STANDARD DATA TABLE */}
          {viewMode === 'table' && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Waktu Kejadian</th>
                    <th>Operator (User)</th>
                    <th>Jenis Aksi</th>
                    <th>Kategori Target</th>
                    <th>Target ID</th>
                    <th>Rincian</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => {
                    const details = getActionDetails(log.action);
                    return (
                      <tr key={log.id}>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                            {new Date(log.created_at).toLocaleString('id-ID')}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{log.user?.name || 'Sistem Otomatis'}</span>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.user?.email || 'cronjob'}</div>
                        </td>
                        <td>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            background: details.bgColor, 
                            color: details.color, 
                            padding: '4px 8px', 
                            borderRadius: 'var(--radius-sm)', 
                            border: `1px solid ${details.borderColor}`,
                            fontWeight: 700,
                            textTransform: 'uppercase'
                          }}>
                            {details.label}
                          </span>
                        </td>
                        <td>{getFriendlyEntityName(log.entity_type)}</td>
                        <td>
                          <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} title={log.entity_id}>
                            {log.entity_id ? log.entity_id.substring(0, 8) : ''}...
                          </code>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>-</span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                        Tidak ada aktivitas audit yang cocok dengan filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

