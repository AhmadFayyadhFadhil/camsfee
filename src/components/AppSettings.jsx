import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Save, Upload, Check, AlertCircle, Sliders, Image as ImageIcon } from 'lucide-react';

export default function AppSettings({ onSettingsUpdated }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Identity Settings
  const [companyName, setCompanyName] = useState('CAMS PANDAAN');
  const [companyDescription, setCompanyDescription] = useState('Cleaning Activity Monitor');
  const [footerText, setFooterText] = useState('© 2026 CAMS Pandaan. All rights reserved.');
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // System Parameter Settings
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
        
        data.forEach(item => {
          if (item.key === 'company_name') setCompanyName(item.value);
          if (item.key === 'company_description') setCompanyDescription(item.value);
          if (item.key === 'app_footer_text') setFooterText(item.value);
          if (item.key === 'company_logo' && item.value) {
            setLogoUrl(`/api/v1/settings/logo/image?t=${new Date().getTime()}`);
          }
          if (item.key === 'buffer_shift_minutes') setBufferShift(parseInt(item.value));
          if (item.key === 'escalation_pic_timeout_minutes') setEscalationPic(parseInt(item.value));
          if (item.key === 'task_reminder_before_end_minutes') setTaskReminder(parseInt(item.value));
          if (item.key === 'geofence_verification_enabled') setGeofenceEnabled(item.value === 'true' || item.value === true);
          if (item.key === 'geofence_allowed_distance_meters') setGeofenceDistance(parseInt(item.value));
        });
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat pengaturan.');
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

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Ukuran file logo tidak boleh melebihi 2MB.');
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // 1. Upload logo if selected
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        await api.post('/settings/logo', formData);
      }

      // 2. Save text settings
      const payload = {
        settings: [
          { key: 'company_name', value: companyName },
          { key: 'company_description', value: companyDescription },
          { key: 'app_footer_text', value: footerText },
          { key: 'buffer_shift_minutes', value: bufferShift.toString() },
          { key: 'escalation_pic_timeout_minutes', value: escalationPic.toString() },
          { key: 'task_reminder_before_end_minutes', value: taskReminder.toString() },
          { key: 'geofence_verification_enabled', value: geofenceEnabled.toString() },
          { key: 'geofence_allowed_distance_meters', value: geofenceDistance.toString() }
        ]
      };

      const response = await api.put('/settings', payload);
      if (response.success) {
        setSuccessMsg('Pengaturan aplikasi berhasil disimpan.');
        setLogoFile(null);
        
        // Notify parent to refetch public settings
        if (onSettingsUpdated) {
          onSettingsUpdated();
        }
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
    <div className="glass-panel" style={{ padding: '30px', borderRadius: 'var(--radius-lg)', maxWidth: '750px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <Sliders size={28} style={{ color: 'var(--primary)' }} />
        <div>
          <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>System Company</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Kelola nama aplikasi, logo, teks hak cipta (footer), dan konfigurasi geofencing.</p>
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
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '30px' }}>
          
          {/* Bagian 1: Identitas Visual */}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--primary)' }}>1. Identitas Visual & Branding</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Nama Perusahaan / Aplikasi</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={companyName} 
                  onChange={(e) => setCompanyName(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Deskripsi / Tagline Pendek</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={companyDescription} 
                  onChange={(e) => setCompanyDescription(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Teks Footer / Hak Cipta</label>
              <input 
                type="text" 
                className="form-control" 
                value={footerText} 
                onChange={(e) => setFooterText(e.target.value)} 
                required 
              />
            </div>

            {/* Logo Upload & Preview */}
            <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Logo Perusahaan / Aplikasi</label>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '8px' }}>
                <div style={{ 
                  width: '80px', 
                  height: '80px', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border-color)', 
                  background: 'transparent',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {logoPreview ? (
                    <img 
                      src={logoPreview} 
                      alt="Preview Logo Baru" 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain',
                        mixBlendMode: 'multiply'
                      }} 
                    />
                  ) : logoUrl ? (
                    <img 
                      src={logoUrl} 
                      alt="Logo Perusahaan Saat Ini" 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain',
                        mixBlendMode: 'multiply'
                      }} 
                    />
                  ) : (
                    <ImageIcon size={32} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <label 
                    className="btn btn-secondary" 
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      padding: '10px 16px'
                    }}
                  >
                    <Upload size={16} />
                    Unggah Logo Baru
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={handleLogoChange}
                    />
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '6px' }}>
                    Gunakan file JPG, PNG, atau SVG berdimensi persegi dengan ukuran maksimal 2MB.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '5px 0' }} />

          {/* Bagian 2: Parameter Sistem */}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--primary)' }}>2. Parameter Operasional Sistem</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Toleransi Shift CS (Menit)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={bufferShift} 
                  onChange={(e) => setBufferShift(parseInt(e.target.value) || 0)} 
                  min="0" 
                  required 
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Eskalasi Laporan PIC (Menit)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={escalationPic} 
                  onChange={(e) => setEscalationPic(parseInt(e.target.value) || 0)} 
                  min="0" 
                  required 
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Pengingat Sisa Waktu Shift (Menit)</label>
              <input 
                type="number" 
                className="form-control" 
                value={taskReminder} 
                onChange={(e) => setTaskReminder(parseInt(e.target.value) || 0)} 
                min="0" 
                required 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Verifikasi GPS (Geofencing)</label>
                <select 
                  className="form-control form-select"
                  value={geofenceEnabled ? 'true' : 'false'}
                  onChange={(e) => setGeofenceEnabled(e.target.value === 'true')}
                  required
                >
                  <option value="false">Nonaktifkan Geofencing</option>
                  <option value="true">Aktifkan Geofencing (GPS HP)</option>
                </select>
              </div>

              {geofenceEnabled && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Radius Jarak Aman (Meter)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={geofenceDistance} 
                    onChange={(e) => setGeofenceDistance(parseInt(e.target.value) || 0)} 
                    min="5" 
                    required 
                  />
                </div>
              )}
            </div>
          </div>

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
              <Save size={16} /> Simpan Semua Pengaturan
            </>
          )}
        </button>
      </form>
    </div>
  );
}
