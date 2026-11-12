import React, { useState } from 'react';
import { api } from '../utils/api';
import { Shield, AlertTriangle, AlertOctagon, Eye, EyeOff } from 'lucide-react';

export default function Login({ onLoginSuccess, appIdentity }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const companyName = appIdentity ? appIdentity.company_name : 'CAMS PANDAAN';
  const footerText = (appIdentity && appIdentity.app_footer_text) || `© 2026 ${companyName}. All rights reserved.`;

  return (
    <div className="lg-page">
      <div className="lg-card">
        {/* Panel kiri: form login */}
        <div className="lg-form-side">
          <div className="lg-brand">
            {appIdentity && appIdentity.company_logo ? (
              <div className="lg-brand-logo">
                <img
                  src={appIdentity.company_logo.includes('/api/v1/settings/logo/image') ? '/api/v1/settings/logo/image' : appIdentity.company_logo}
                  alt="Logo"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/favicon.svg';
                  }}
                />
              </div>
            ) : (
              <div className="lg-brand-logo lg-brand-logo-fallback">
                <Shield size={22} />
              </div>
            )}
            <span className="lg-brand-name">{companyName}</span>
          </div>

          <h1 className="lg-title">Hello<br />Welcome Back</h1>
          <p className="lg-subtitle">Masuk ke Cleaning Activity Monitoring System</p>

          {error && (
            <div className="alert alert-danger lg-alert">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate={false}>
            <div className="lg-field">
              <label className="lg-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="lg-input"
                placeholder="Masukkan email Anda"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="lg-field">
              <label className="lg-label" htmlFor="password">Password</label>
              <div className="lg-input-wrap">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="lg-input lg-input-password"
                  placeholder="Masukkan kata sandi"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="lg-eye"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="lg-submit" disabled={loading}>
              {loading ? (
                <span className="lg-submit-loading">
                  <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
                  <span>Memproses...</span>
                </span>
              ) : (
                <span>Masuk Sistem</span>
              )}
            </button>
          </form>

          {/* Akun Khusus Lapor Temuan Kerusakan & Tatacara */}
          <div className="lg-report">
            <div className="lg-report-head">
              <span className="lg-report-title">
                <AlertOctagon size={14} /> Lapor Kerusakan Fasilitas
              </span>
              <button
                type="button"
                className="lg-report-btn"
                onClick={() => {
                  setEmail('pelapor@cams.com');
                  setPassword('Pass123');
                }}
                title="Klik untuk otomatis mengisi email & kata sandi akun pelapor"
              >
                Gunakan Akun Ini
              </button>
            </div>
            <p className="lg-report-text">
              Karyawan/tamu yang ingin melapor fasilitas rusak tanpa akun operasional:
            </p>
            <div className="lg-report-cred">
              Email: <b>pelapor@cams.com</b> &bull; Sandi: <b>Pass123</b>
            </div>
            <details className="lg-report-steps">
              <summary>Tata Cara Melaporkan</summary>
              <ol>
                <li>Klik <b>Gunakan Akun Ini</b> &rarr; <b>Masuk Sistem</b>.</li>
                <li>Masuk menu <b>Temuan Kerusakan</b> &rarr; <b>+ Laporkan Kerusakan Baru</b>.</li>
                <li>Pilih ruangan, upload 1 foto bukti, dan kirim.</li>
              </ol>
            </details>
          </div>

          <div className="lg-footer">{footerText}</div>
        </div>

        {/* Panel kanan: foto gedung */}
        <div className="lg-photo-side" aria-hidden="true">
          <img src="/login-building.jpg" alt="" />
        </div>
      </div>
    </div>
  );
}