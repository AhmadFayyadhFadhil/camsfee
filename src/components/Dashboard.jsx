import React, { useState, useEffect } from 'react';
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
  ThumbsUp
} from 'lucide-react';

export default function Dashboard({ user, setCurrentTab, setOpenScanModalOnMount }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [buildingGrid, setBuildingGrid] = useState(null);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [period, setPeriod] = useState('today');

  const isAdminOrSupervisor = user.roles && (user.roles.includes('admin') || user.roles.includes('supervisor'));
  const isPic = user.roles && user.roles.includes('pic');
  const isCs = user.roles && user.roles.includes('cleaning_service');
  const isOb = user.roles && user.roles.includes('ob');

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

  const fetchDashboardData = async (activePeriod = period) => {
    setLoading(true);
    setError(null);
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
      setError(err.message || 'Gagal memuat data dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(period);
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

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>Ringkasan Tugas CS</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Status tugas harian Anda tanggal {new Date().toLocaleDateString('id-ID')}</p>
          </div>
          <button className="btn btn-secondary" onClick={fetchDashboardData}>
            <RefreshCw size={16} /> Segarkan
          </button>
        </div>

        {/* BIG SCAN BUTTON FOR CS */}
        <div className="glass-panel" style={{ 
          padding: '24px', 
          borderRadius: 'var(--radius-lg)', 
          marginBottom: '24px', 
          background: 'var(--gradient-primary)',
          border: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          color: 'white',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
              <QrCode size={20} />
              Mulai Bersihkan Ruangan
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.875rem', marginTop: '6px' }}>
              Pindai atau foto barcode/QR Code ruangan untuk langsung membuka lembar checklist kebersihan.
            </p>
          </div>
          <button 
            className="btn" 
            onClick={() => {
              if (setOpenScanModalOnMount) {
                setOpenScanModalOnMount(true);
              }
              if (setCurrentTab) {
                setCurrentTab('tasks');
              }
            }}
            style={{ 
              height: '46px', 
              padding: '0 24px', 
              fontWeight: 700,
              background: '#ffffff',
              color: 'var(--primary)',
              boxShadow: '0 4px 15px rgba(14, 49, 146, 0.2)',
              border: 'none'
            }}
          >
            <QrCode size={18} /> Scan Barcode Ruangan
          </button>
        </div>

        <div className="dashboard-grid">
          <div className="glass-card stats-card" style={{ borderLeft: '4px solid var(--primary)', background: 'rgba(14, 49, 146, 0.02)', cursor: 'pointer' }} onClick={() => setCurrentTab && setCurrentTab('tasks')}>
            <div className="stats-icon" style={{ background: 'rgba(14, 49, 146, 0.08)', color: 'var(--primary)' }}>
              <FileText size={24} />
            </div>
            <div className="stats-details">
              <span className="stats-number">{summary.total || 0}</span>
              <span className="stats-label">Total Tugas</span>
            </div>
          </div>

          <div className="glass-card stats-card" style={{ borderLeft: '4px solid var(--warning)', background: 'rgba(180, 83, 9, 0.03)', cursor: 'pointer' }} onClick={() => setCurrentTab && setCurrentTab('tasks')}>
            <div className="stats-icon" style={{ background: 'rgba(180, 83, 9, 0.08)', color: 'var(--warning)' }}>
              <Clock size={24} />
            </div>
            <div className="stats-details">
              <span className="stats-number">{summary.pending || 0}</span>
              <span className="stats-label">Menunggu</span>
            </div>
          </div>

          <div className="glass-card stats-card" style={{ borderLeft: '4px solid #3b82f6', background: 'rgba(59, 130, 246, 0.03)', cursor: 'pointer' }} onClick={() => setCurrentTab && setCurrentTab('tasks')}>
            <div className="stats-icon" style={{ background: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6' }}>
              <RefreshCw size={24} className="spinner" style={{ animationDuration: '3s' }} />
            </div>
            <div className="stats-details">
              <span className="stats-number">{summary.in_progress || 0}</span>
              <span className="stats-label">Sedang Dikerjakan</span>
            </div>
          </div>

          <div className="glass-card stats-card" style={{ borderLeft: '4px solid var(--info)', background: 'rgba(26, 75, 196, 0.03)', cursor: 'pointer' }} onClick={() => setCurrentTab && setCurrentTab('tasks')}>
            <div className="stats-icon" style={{ background: 'rgba(26, 75, 196, 0.08)', color: 'var(--info)' }}>
              <Eye size={24} />
            </div>
            <div className="stats-details">
              <span className="stats-number">{summary.waiting_verification || 0}</span>
              <span className="stats-label">Menunggu Verifikasi</span>
            </div>
          </div>

          <div className="glass-card stats-card" style={{ borderLeft: '4px solid var(--success)', background: 'rgba(15, 118, 110, 0.03)', cursor: 'pointer' }} onClick={() => setCurrentTab && setCurrentTab('tasks')}>
            <div className="stats-icon" style={{ background: 'rgba(15, 118, 110, 0.08)', color: 'var(--success)' }}>
              <CheckSquare size={24} />
            </div>
            <div className="stats-details">
              <span className="stats-number">{summary.completed || 0}</span>
              <span className="stats-label">Selesai</span>
            </div>
          </div>

          <div className="glass-card stats-card" style={{ borderLeft: '4px solid var(--danger)', background: 'rgba(255, 0, 0, 0.03)', cursor: 'pointer' }} onClick={() => setCurrentTab && setCurrentTab('tasks')}>
            <div className="stats-icon" style={{ background: 'rgba(255, 0, 0, 0.08)', color: 'var(--danger)' }}>
              <AlertOctagon size={24} />
            </div>
            <div className="stats-details">
              <span className="stats-number">{summary.rejected || 0}</span>
              <span className="stats-label">Ditolak</span>
            </div>
          </div>
        </div>

        {urgent.length > 0 && (
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-md)', padding: '24px', border: '1px solid rgba(230, 0, 0, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: 'var(--danger)' }}>
              <AlertOctagon size={22} />
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Tugas Mendesak (Tenggat &lt; 60 Menit)</h2>
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
                      <td style={{ fontWeight: 600 }}>{t.room_code}</td>
                      <td>{t.room_name}</td>
                      <td>{new Date(t.due_datetime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{t.minutes_left} Menit Lagi</td>
                      <td>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => setCurrentTab && setCurrentTab('tasks')}
                        >
                          Mulai Kerja & Foto Barcode
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // RENDER OFFICE BOY DASHBOARD
  if (isOb && data) {
    const summary = data.findings_summary || {};
    const findings = data.recent_findings || [];

    return (
      <div>
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>
            {isAdminOrSupervisor ? 'Dashboard Supervisor' : 'Dashboard PIC Area'}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Status operasional kebersihan fasilitas PT Widatra Bhakti</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className={`btn btn-sm ${period === 'today' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPeriod('today')}>Hari Ini</button>
          <button className={`btn btn-sm ${period === 'week' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPeriod('week')}>Minggu Ini</button>
          <button className={`btn btn-sm ${period === 'month' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPeriod('month')}>Bulan Ini</button>
          <button className="btn btn-secondary btn-sm" onClick={() => fetchDashboardData(period)}>
            <RefreshCw size={16} /> Segarkan
          </button>
        </div>
      </div>

      {/* WELCOME HERO BANNER FOR SUPERVISOR/PIC */}
      <div className="glass-panel" style={{ 
        padding: '24px', 
        borderRadius: 'var(--radius-lg)', 
        marginBottom: '24px', 
        background: 'linear-gradient(135deg, rgba(14, 49, 146, 0.06) 0%, rgba(26, 75, 196, 0.02) 100%)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)' }}>
            Selamat Datang Kembali, {user.name}!
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '6px' }}>
            Pantau kepatuhan kebersihan gedung secara real-time. Hari ini, tingkat kepatuhan kebersihan berada di angka <strong style={{ color: 'var(--primary)' }}>{data.compliance_rate || 0}%</strong>.
          </p>
        </div>
        <div style={{ background: 'var(--gradient-primary)', color: 'white', padding: '10px 18px', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 4px 10px rgba(14, 49, 146, 0.15)' }}>
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-grid">
        <div className="glass-card stats-card" style={{ borderLeft: '4px solid var(--primary)', background: 'rgba(14, 49, 146, 0.02)' }}>
          <div className="stats-icon" style={{ background: 'rgba(14, 49, 146, 0.08)', color: 'var(--primary)' }}>
            <Building size={24} />
          </div>
          <div className="stats-details">
            <span className="stats-number">{data.total_buildings || 0}</span>
            <span className="stats-label">Gedung Dipantau</span>
          </div>
        </div>

        <div className="glass-card stats-card" style={{ borderLeft: '4px solid var(--secondary)', background: 'rgba(26, 75, 196, 0.02)' }}>
          <div className="stats-icon" style={{ background: 'rgba(26, 75, 196, 0.08)', color: 'var(--secondary)' }}>
            <Home size={24} />
          </div>
          <div className="stats-details">
            <span className="stats-number">{data.total_rooms || 0}</span>
            <span className="stats-label">Ruangan Terdaftar</span>
          </div>
        </div>

        <div className="glass-card stats-card" style={{ borderLeft: '4px solid #a855f7', background: 'rgba(168, 85, 247, 0.02)' }}>
          <div className="stats-icon" style={{ background: 'rgba(168, 85, 247, 0.08)', color: '#a855f7' }}>
            <CheckSquare size={24} />
          </div>
          <div className="stats-details">
            <span className="stats-number" style={{ color: 'var(--text-primary)' }}>
              {data.compliance_rate || 0}%
            </span>
            <span className="stats-label">Tingkat Kepatuhan</span>
          </div>
        </div>

        <div className="glass-card stats-card" style={{ borderLeft: '4px solid var(--info)', background: 'rgba(26, 75, 196, 0.02)' }}>
          <div className="stats-icon" style={{ background: 'rgba(26, 75, 196, 0.08)', color: 'var(--info)' }}>
            <Eye size={24} />
          </div>
          <div className="stats-details">
            <span className="stats-number">{data.pending_verifications || 0}</span>
            <span className="stats-label">Menunggu Verifikasi</span>
          </div>
        </div>

        <div className="glass-card stats-card" style={{ borderLeft: '4px solid var(--danger)', background: 'rgba(255, 0, 0, 0.02)' }}>
          <div className="stats-icon" style={{ background: 'rgba(255, 0, 0, 0.08)', color: 'var(--danger)' }}>
            <AlertOctagon size={24} />
          </div>
          <div className="stats-details">
            <span className="stats-number">{data.active_findings || 0}</span>
            <span className="stats-label">Temuan Kerusakan</span>
          </div>
        </div>
      </div>

      {/* Buildings Compliance Grid */}
      <div className="grid-2fr-1fr">
        
        {/* Breakdown per Gedung */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>Tingkat Kepatuhan per Gedung</h2>
          
          {/* Tampilan Desktop (Tabel) */}
          <div className="desktop-view">
            <div className="table-container" style={{ margin: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ whiteSpace: 'nowrap' }}>Nama Gedung</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Kode</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Jumlah Ruang</th>
                    <th style={{ width: '160px', whiteSpace: 'nowrap' }}>Progress Tugas</th>
                    <th style={{ width: '120px', whiteSpace: 'nowrap' }}>Kepatuhan</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map(b => (
                    <tr key={b.building_id}>
                      <td style={{ fontWeight: 600, color: 'var(--on-surface)', whiteSpace: 'nowrap' }}>{b.building_name}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ 
                          background: 'rgba(255, 255, 255, 0.05)', 
                          padding: '3px 8px', 
                          borderRadius: 'var(--radius-sm)', 
                          fontFamily: 'monospace', 
                          fontSize: '0.8rem',
                          border: '1px solid var(--border-color)'
                        }}>
                          {b.building_code}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{b.total_rooms} Ruang</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            {b.completed_tasks} / {b.total_tasks} Selesai
                          </span>
                          <div style={{ width: '120px', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ 
                              width: `${b.total_tasks > 0 ? (b.completed_tasks / b.total_tasks) * 100 : 0}%`, 
                              height: '100%', 
                              background: b.compliance_rate >= 80 ? 'var(--success)' : b.compliance_rate >= 50 ? 'var(--warning)' : 'var(--danger)',
                              borderRadius: '3px',
                              transition: 'width 0.4s ease'
                            }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          background: b.compliance_rate >= 80 ? 'rgba(16, 185, 129, 0.1)' : b.compliance_rate >= 50 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: b.compliance_rate >= 80 ? '#10b981' : b.compliance_rate >= 50 ? '#f59e0b' : '#ef4444',
                          border: b.compliance_rate >= 80 ? '1px solid rgba(16, 185, 129, 0.2)' : b.compliance_rate >= 50 ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                          padding: '4px 12px',
                          borderRadius: 'var(--radius-lg)',
                          fontSize: '0.85rem',
                          fontWeight: 700
                        }}>
                          {b.compliance_rate}%
                        </span>
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
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada data gedung.</td>
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
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertOctagon size={20} /> Tugas Terlambat (Overdue)
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {overdue.map(t => (
              <div 
                key={t.task_id} 
                className="glass-card" 
                style={{ 
                  padding: '12px 16px', 
                  borderLeft: '3px solid var(--danger)', 
                  background: 'rgba(230, 0, 0, 0.03)',
                  margin: 0
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.room_name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.task_date}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span>CS: {t.cs_name}</span>
                  <span style={{ color: 'var(--danger)' }}>Due: {t.due_datetime ? (t.due_datetime.includes('T') ? t.due_datetime.split('T')[1]?.substring(0, 5) : t.due_datetime.split(' ')[1]?.substring(0, 5)) : '-'}</span>
                </div>
              </div>
            ))}
            
            {overdue.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 0', color: 'var(--text-muted)', gap: '10px' }}>
                <ThumbsUp size={24} style={{ color: 'var(--success)', opacity: 0.8 }} />
                <span style={{ fontSize: '0.9rem' }}>Tidak ada tugas terlambat hari ini.</span>
              </div>
            )}
          </div>
        </div>

      </div>

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

