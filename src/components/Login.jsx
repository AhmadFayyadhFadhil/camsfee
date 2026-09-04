import React, { useState } from 'react';
import { api } from '../utils/api';
import { Shield, Lock, Mail, AlertTriangle, CheckCircle } from 'lucide-react';

export default function Login({ onLoginSuccess, appIdentity }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.success && response.data) {
        const { access_token, user } = response.data;
        api.setToken(access_token, user);
        onLoginSuccess(user, access_token);
      } else {
        setError(response.message || 'Login gagal.');
      }
    } catch (err) {
      if (err.errors) {
        // Validation errors
        const validationMsg = Object.values(err.errors).flat().join(' ');
        setError(validationMsg);
      } else {
        setError(err.message || 'Terjadi kesalahan saat menghubungi server.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card glass-panel">
        <div style={{ margin: '0 auto 16px auto', display: 'flex', justifyContent: 'center' }}>
          {appIdentity && appIdentity.company_logo ? (
            <div style={{ width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img 
                src={appIdentity.company_logo.includes('/api/v1/settings/logo/image') ? '/api/v1/settings/logo/image' : appIdentity.company_logo} 
                alt="Logo" 
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/favicon.svg';
                }}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain',
                  mixBlendMode: 'multiply'
                }} 
              />
            </div>
          ) : (
            <div className="login-logo" style={{ width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={36} />
            </div>
          )}
        </div>
        <div className="login-header">
          <h1 style={{ textTransform: 'uppercase', fontSize: '1.5rem' }}>{appIdentity ? appIdentity.company_name : 'CAMS PANDAAN'}</h1>
          <p>Cleaning Activity Monitoring System</p>
        </div>

        {error && (
          <div className="alert alert-danger">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Alamat Email</label>
            <div style={{ position: 'relative' }}>
              <Mail 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '14px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)' 
                }} 
              />
              <input
                id="email"
                type="email"
                className="form-control"
                placeholder="Masukkan email Anda"
                style={{ paddingLeft: '44px', width: '100%' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '30px' }}>
            <label className="form-label" htmlFor="password">Kata Sandi</label>
            <div style={{ position: 'relative' }}>
              <Lock 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '14px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)' 
                }} 
              />
              <input
                id="password"
                type="password"
                className="form-control"
                placeholder="Masukkan kata sandi"
                style={{ paddingLeft: '44px', width: '100%' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', height: '46px' }}
            disabled={loading}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="spinner" style={{ width: '18px', height: '18px' }}></div>
                <span>Memproses...</span>
              </div>
            ) : (
              <span>Masuk Sistem</span>
            )}
          </button>
        </form>

        {/* Akun Khusus Lapor Temuan Kerusakan & Tatacara */}
        <div style={{
          marginTop: '22px',
          paddingTop: '18px',
          borderTop: '1px solid var(--border-color)',
        }}>
          <div style={{
            background: 'rgba(239, 246, 255, 0.6)',
            border: '1px solid #bfdbfe',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 16px',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertOctagon size={15} /> Akun Khusus Lapor Kerusakan Fasilitas
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setEmail('pelapor@cams.com');
                  setPassword('password');
                }}
                style={{ fontSize: '0.74rem', padding: '3px 8px', minHeight: '26px', height: '26px', fontWeight: 600 }}
                title="Klik untuk otomatis mengisi email & kata sandi akun pelapor"
              >
                Gunakan Akun Ini
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: 1.4 }}>
              Bagi karyawan umum / staf yang tidak memiliki akun operasional dan ingin melaporkan fasilitas ruangan yang rusak:
            </p>

            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-sm)', padding: '6px 10px', fontSize: '0.76rem', fontFamily: 'var(--mono)', color: '#334155', marginBottom: '10px' }}>
              Email: <b>pelapor@cams.com</b> &bull; Sandi: <b>password</b>
            </div>

            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '3px' }}>Tata Cara Melaporkan Kerusakan:</strong>
              <ol style={{ margin: 0, paddingLeft: '16px' }}>
                <li style={{ marginBottom: '2px' }}>Gunakan akun pelapor di atas, lalu klik tombol <b>Masuk Sistem</b>.</li>
                <li style={{ marginBottom: '2px' }}>Pilih menu <b>Temuan Kerusakan</b> &rarr; klik <b>+ Laporkan Kerusakan Baru</b>.</li>
                <li>Pilih lokasi ruangan, lampirkan 1 foto bukti kerusakan, dan kirim laporan untuk segera ditindaklanjuti.</li>
              </ol>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
