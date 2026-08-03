import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Save, ShieldAlert, Check, Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Specific state variables for easier binding
  const [bufferShift, setBufferShift] = useState(30);
  const [escalationPic, setEscalationPic] = useState(120);
  const [taskReminder, setTaskReminder] = useState(60);
  const [geofenceEnabled, setGeofenceEnabled] = useState(false);
  const [geofenceDistance, setGeofenceDistance] = useState(50);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/settings');
      if (response.success) {
        const data = response.data || [];
        setSettings(data);
        
        // Populate states based on keys
        data.forEach(item => {
          if (item.key === 'buffer_shift_minutes') setBufferShift(parseInt(item.value));
          if (item.key === 'escalation_pic_timeout_minutes') setEscalationPic(parseInt(item.value));
          if (item.key === 'task_reminder_before_end_minutes') setTaskReminder(parseInt(item.value));
          if (item.key === 'geofence_verification_enabled') setGeofenceEnabled(item.value === 'true' || item.value === true);
          if (item.key === 'geofence_allowed_distance_meters') setGeofenceDistance(parseInt(item.value));
        });
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat pengaturan sistem.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
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

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      settings: [
        { key: 'buffer_shift_minutes', value: bufferShift.toString() },
        { key: 'escalation_pic_timeout_minutes', value: escalationPic.toString() },
        { key: 'task_reminder_before_end_minutes', value: taskReminder.toString() },
        { key: 'geofence_verification_enabled', value: geofenceEnabled.toString() },
        { key: 'geofence_allowed_distance_meters', value: geofenceDistance.toString() }
      ]
    };

    try {
      const response = await api.put('/settings', payload);
      if (response.success) {
        setSuccessMsg('Pengaturan sistem berhasil diperbarui.');
      }
    } catch (err) {
      setError(err.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '30px', borderRadius: 'var(--radius-lg)', maxWidth: '650px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <SettingsIcon size={28} style={{ color: 'var(--primary)' }} />
        <div>
          <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>Pengaturan Parameter Sistem</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Kelola toleransi kedatangan, durasi eskalasi laporan PIC, dan radius Geofence GPS.</p>
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

      <form onSubmit={handleSave}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '30px' }}>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Toleransi Waktu Kedatangan Shift CS (Menit)</label>
            <input 
              type="number" 
              className="form-control" 
              value={bufferShift} 
              onChange={(e) => setBufferShift(parseInt(e.target.value) || 0)} 
              min="0" 
              required 
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
              Toleransi waktu kedatangan awal dan akhir shift kerja CS untuk memindai QR Code ruangan.
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Durasi Eskalasi Verifikasi Laporan PIC (Menit)</label>
            <input 
              type="number" 
              className="form-control" 
              value={escalationPic} 
              onChange={(e) => setEscalationPic(parseInt(e.target.value) || 0)} 
              min="0" 
              required 
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
              Batas waktu toleransi PIC untuk memverifikasi laporan CS sebelum sistem melayangkan email eskalasi darurat ke Supervisor.
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Pengingat Sisa Waktu Shift CS (Menit)</label>
            <input 
              type="number" 
              className="form-control" 
              value={taskReminder} 
              onChange={(e) => setTaskReminder(parseInt(e.target.value) || 0)} 
              min="0" 
              required 
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
              Sisa menit pengerjaan shift CS sebelum notifikasi email/in-app peringatan otomatis dikirimkan ke CS.
            </span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '10px 0' }} />

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Verifikasi Jarak GPS (Geofencing)</label>
            <select 
              className="form-control form-select"
              value={geofenceEnabled ? 'true' : 'false'}
              onChange={(e) => setGeofenceEnabled(e.target.value === 'true')}
              required
            >
              <option value="false">Nonaktifkan Geofencing (Bebas scan dari mana saja)</option>
              <option value="true">Aktifkan Geofencing (Validasi lokasi koordinat HP CS)</option>
            </select>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
              Mengaktifkan validasi jarak GPS antara HP petugas CS saat mengirim laporan dengan titik koordinat fisik Gedung pabrik.
            </span>
          </div>

          {geofenceEnabled && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Radius Toleransi Geofencing (Meter)</label>
              <input 
                type="number" 
                className="form-control" 
                value={geofenceDistance} 
                onChange={(e) => setGeofenceDistance(parseInt(e.target.value) || 0)} 
                min="5" 
                required 
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                Radius jarak maksimal dalam meter yang diizinkan bagi HP petugas CS saat memindai QR Code dari pusat gedung.
              </span>
            </div>
          )}

        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={submitting} 
          style={{ width: '100%', height: '46px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
        >
          {submitting ? (
            <div className="spinner"></div>
          ) : (
            <>
              <Save size={16} /> Simpan Perubahan Parameter
            </>
          )}
        </button>
      </form>
    </div>
  );
}
