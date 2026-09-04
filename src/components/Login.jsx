import React, { useState } from 'react';
import { api } from '../utils/api';
import { Shield, Lock, Mail, AlertTriangle, CheckCircle, AlertOctagon } from 'lucide-react';

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
        <div style={{ margin: '0 auto 10px auto', display: 'flex', justifyContent: 'center' }}>
          {appIdentity && appIdentity.company_logo ? (
            <div style={{ width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            <div className="login-logo" style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={28} />
            </div>
          )}
        </div>
        <div className="login-header">
          <h1 style={{ textTransform: 'uppercase', fontSize: '1.35rem', margin: '0 0 2px 0' }}>{appIdentity ? appIdentity.company_name : 'CAMS PANDAAN'}</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Cleaning Activity Monitoring System</p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ padding: '8px 12px', fontSize: '0.82rem', marginBottom: '14px' }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label" htmlFor="email" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>Alamat Email</label>
            <div style={{ position: 'relative' }}>
              <Mail 
                size={16} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
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
                style={{ paddingLeft: '38px', width: '100%', height: '38px', fontSize: '0.85rem' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label" htmlFor="password" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>Kata Sandi</label>
            <div style={{ position: 'relative' }}>
              <Lock 
                size={16} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
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
                style={{ paddingLeft: '38px', width: '100%', height: '38px', fontSize: '0.85rem' }}
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
            style={{ width: '100%', height: '40px', fontWeight: 600, fontSize: '0.88rem' }}
            disabled={loading}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                <span>Memproses...</span>
              </div>
            ) : (
              <span>Masuk Sistem</span>
            )}
          </button>
        </form>

        {/* Akun Khusus Lapor Temuan Kerusakan & Tatacara */}
        <div style={{
          marginTop: '16px',
          paddingTop: '14px',
          borderTop: '1px solid var(--border-color)',
        }}>
          <div style={{
            background: 'rgba(239, 246, 255, 0.7)',
            border: '1px solid #bfdbfe',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 14px',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <AlertOctagon size={14} /> Lapor Kerusakan Fasilitas
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setEmail('pelapor@cams.com');
                  setPassword('password');
                }}
                style={{ fontSize: '0.72rem', padding: '2px 8px', minHeight: '24px', height: '24px', fontWeight: 600 }}
                title="Klik untuk otomatis mengisi email & kata sandi akun pelapor"
              >
                Gunakan Akun Ini
              </button>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 6px 0', lineHeight: 1.35 }}>
              Karyawan/tamu yang ingin melapor fasilitas rusak tanpa akun operasional:
            </p>

            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-sm)', padding: '5px 8px', fontSize: '0.74rem', fontFamily: 'var(--mono)', color: '#334155', marginBottom: '8px' }}>
              Email: <b>pelapor@cams.com</b> &bull; Sandi: <b>password</b>
            </div>

            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>Tata Cara Melaporkan:</strong>
              <ol style={{ margin: 0, paddingLeft: '16px' }}>
                <li style={{ marginBottom: '1px' }}>Klik <b>Gunakan Akun Ini</b> &rarr; <b>Masuk Sistem</b>.</li>
                <li style={{ marginBottom: '1px' }}>Masuk menu <b>Temuan Kerusakan</b> &rarr; <b>+ Laporkan Kerusakan Baru</b>.</li>
                <li>Pilih ruangan, upload 1 foto bukti, dan kirim.</li>
              </ol>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
