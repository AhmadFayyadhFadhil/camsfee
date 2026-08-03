import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { FileText, Download, ShieldAlert, Check, Calendar } from 'lucide-react';

export default function Reports() {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters State
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [buildingId, setBuildingId] = useState('');
  const [status, setStatus] = useState('');
  const [reportType, setReportType] = useState('cleanliness'); // 'cleanliness' or 'findings'
  const [prioritas, setPrioritas] = useState('');

  const fetchBuildings = async () => {
    try {
      const response = await api.get('/buildings?is_active=true');
      if (response.success) {
        setBuildings(response.data.data || response.data || []);
      }
    } catch (err) {
      console.error('Error fetching buildings:', err);
    }
  };

  useEffect(() => {
    fetchBuildings();
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

  const handleExport = async (type) => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      date_from: dateFrom,
      date_to: dateTo,
    };

    if (buildingId) payload.building_id = buildingId;
    if (status) payload.status = status;
    if (reportType === 'findings' && prioritas) payload.prioritas = prioritas;

    try {
      let endpoint = '';
      let fileExt = type === 'pdf' ? 'pdf' : 'xlsx';

      if (reportType === 'cleanliness') {
        endpoint = type === 'pdf' ? '/reports/export/pdf' : '/reports/export/excel';
      } else {
        endpoint = type === 'pdf' ? '/reports/export/findings-pdf' : '/reports/export/findings-excel';
      }
      
      const blob = await api.post(endpoint, payload);
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileNamePrefix = reportType === 'cleanliness' ? 'cams-cleanliness-report' : 'cams-findings-report';
      link.download = `${fileNamePrefix}-${dateFrom}-to-${dateTo}.${fileExt}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSuccessMsg(`Laporan dalam format ${type.toUpperCase()} berhasil diexport.`);
    } catch (err) {
      setError(err.message || 'Gagal mengexport laporan. Pastikan data transaksi tersedia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '30px', borderRadius: 'var(--radius-lg)', maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <FileText size={28} style={{ color: 'var(--primary)' }} />
        <div>
          <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>Export Laporan Aktivitas</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Ekspor data kepatuhan kebersihan ke berkas spreadsheet Excel atau cetak PDF</p>
        </div>
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

      <div className="form-group" style={{ marginBottom: '20px' }}>
        <label className="form-label">Tipe Laporan</label>
        <div style={{ display: 'flex', gap: '20px' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            <input 
              type="radio" 
              name="reportType" 
              checked={reportType === 'cleanliness'} 
              onChange={() => { setReportType('cleanliness'); setStatus(''); }} 
            />
            Aktivitas Kebersihan CS
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            <input 
              type="radio" 
              name="reportType" 
              checked={reportType === 'findings'} 
              onChange={() => { setReportType('findings'); setStatus(''); }} 
            />
            Temuan Kerusakan & SLA
          </label>
        </div>
      </div>

      <div className="grid-2-cols" style={{ marginBottom: '20px' }}>
        <div className="form-group">
          <label className="form-label">Tanggal Mulai</label>
          <input 
            type="date" 
            className="form-control" 
            value={dateFrom} 
            onChange={(e) => setDateFrom(e.target.value)} 
            required 
          />
        </div>
        <div className="form-group">
          <label className="form-label">Tanggal Akhir</label>
          <input 
            type="date" 
            className="form-control" 
            value={dateTo} 
            onChange={(e) => setDateTo(e.target.value)} 
            required 
          />
        </div>
      </div>

      <div className="grid-2-cols" style={{ marginBottom: '30px' }}>
        <div className="form-group">
          <label className="form-label">Gedung (Opsional)</label>
          <select 
            className="form-control form-select"
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
          >
            <option value="">Semua Gedung</option>
            {buildings.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {reportType === 'cleanliness' ? (
          <div className="form-group">
            <label className="form-label">Status Tugas (Opsional)</label>
            <select 
              className="form-control form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Semua Status</option>
              <option value="pending">Pending (Belum Mulai)</option>
              <option value="in_progress">In Progress (Sedang Dikerjakan)</option>
              <option value="waiting_verification">Waiting Verification (Verifikasi)</option>
              <option value="completed">Completed (Selesai)</option>
              <option value="rejected">Rejected (Ditolak)</option>
              <option value="overdue">Overdue (Terlambat)</option>
            </select>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Status (Opsional)</label>
              <select 
                className="form-control form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="open">Open (Baru)</option>
                <option value="in_progress">In Progress (Dikerjakan)</option>
                <option value="resolved">Resolved (Selesai)</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Prioritas (Opsional)</label>
              <select 
                className="form-control form-select"
                value={prioritas}
                onChange={(e) => setPrioritas(e.target.value)}
              >
                <option value="">Semua Prioritas</option>
                <option value="low">Low (Rendah)</option>
                <option value="medium">Medium (Sedang)</option>
                <option value="high">High (Tinggi)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '15px' }}>
        <button 
          className="btn btn-primary" 
          onClick={() => handleExport('excel')}
          disabled={loading}
          style={{ flex: 1, height: '46px' }}
        >
          {loading ? (
            <div className="spinner"></div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <Download size={16} /> Export ke Excel (.xlsx)
            </div>
          )}
        </button>

        <button 
          className="btn btn-secondary" 
          onClick={() => handleExport('pdf')}
          disabled={loading}
          style={{ flex: 1, height: '46px', border: '1px solid rgba(255, 255, 255, 0.1)' }}
        >
          {loading ? (
            <div className="spinner"></div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <Download size={16} /> Unduh Cetak PDF (.pdf)
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
