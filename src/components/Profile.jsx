import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Shield, Key, Check, ShieldAlert, User, Mail, Calendar } from 'lucide-react';

export default function Profile({ user }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

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

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (newPassword !== newPasswordConfirmation) {
      setError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation
      });

      if (response.success) {
        setSuccessMsg('Kata sandi berhasil diubah!');
        setCurrentPassword('');
        setNewPassword('');
        setNewPasswordConfirmation('');
      }
    } catch (err) {
      if (err.errors) {
        setError(Object.values(err.errors).flat().join(' '));
      } else {
        setError(err.message || 'Gagal mengubah kata sandi.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid-2-cols" style={{ gap: '30px', alignItems: 'start' }}>
      
      {/* Profile Card */}
      <div className="glass-panel" style={{ padding: '30px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
          <div className="user-avatar" style={{ width: '80px', height: '80px', fontSize: '2rem', marginBottom: '16px', borderRadius: '50%' }}>
            {user.name[0]}
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>{user.name}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{user.email}</p>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '12px' }}>
            {user.roles && user.roles.map((r, i) => (
              <span key={i} className={`role-badge role-${r === 'cleaning_service' ? 'cs' : r.replace('_', '')}`} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                {r.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <User size={18} style={{ color: 'var(--text-secondary)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nama Lengkap</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{user.name}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Mail size={18} style={{ color: 'var(--text-secondary)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Alamat Email</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{user.email}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Calendar size={18} style={{ color: 'var(--text-secondary)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status Akun</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary)' }}>Aktif Terverifikasi</div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="glass-panel" style={{ padding: '30px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Key style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Ganti Kata Sandi</h2>
        </div>

        {successMsg && (
          <div className="alert alert-success" style={{ marginBottom: '20px' }}>
            <Check size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label className="form-label">Kata Sandi Saat Ini</label>
            <input 
              type="password" 
              className="form-control" 
              value={currentPassword} 
              onChange={(e) => setCurrentPassword(e.target.value)} 
              placeholder="Masukkan password lama..."
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Kata Sandi Baru</label>
            <input 
              type="password" 
              className="form-control" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              placeholder="Minimal 8 karakter..."
              required
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '25px' }}>
            <label className="form-label">Konfirmasi Kata Sandi Baru</label>
            <input 
              type="password" 
              className="form-control" 
              value={newPasswordConfirmation} 
              onChange={(e) => setNewPasswordConfirmation(e.target.value)} 
              placeholder="Ketik ulang password baru..."
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', height: '42px' }}
            disabled={loading}
          >
            {loading ? 'Memproses...' : 'Ubah Kata Sandi'}
          </button>
        </form>
      </div>

    </div>
  );
}
