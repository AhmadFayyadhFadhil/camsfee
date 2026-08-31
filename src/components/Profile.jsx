import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { 
  User, 
  Mail, 
  Phone, 
  Key, 
  Check, 
  ShieldAlert, 
  Camera, 
  Trash2, 
  Save, 
  Eye, 
  EyeOff, 
  Calendar, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

export default function Profile({ user, onUserUpdated }) {
  // Profile Data Form States
  const [fullName, setFullName] = useState(user?.full_name || user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || user?.foto_profile || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [shouldRemovePhoto, setShouldRemovePhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const fileInputRef = useRef(null);

  // Password Change States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  // Synchronize when prop user changes
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || user.name || '');
      setPhone(user.phone || '');
      setAvatarPreview(user.avatar_url || user.foto_profile || null);
      setAvatarFile(null);
      setShouldRemovePhoto(false);
    }
  }, [user]);

  // Auto-dismiss alert timers
  useEffect(() => {
    if (profileSuccess) {
      const timer = setTimeout(() => setProfileSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [profileSuccess]);

  useEffect(() => {
    if (profileError) {
      const timer = setTimeout(() => setProfileError(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [profileError]);

  useEffect(() => {
    if (passwordSuccess) {
      const timer = setTimeout(() => setPasswordSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [passwordSuccess]);

  useEffect(() => {
    if (passwordError) {
      const timer = setTimeout(() => setPasswordError(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [passwordError]);

  // Handle Photo Picker & Compression
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProfileError(null);
    try {
      const compressedBlob = await compressImage(file, 1200, 1000 * 1024);
      setAvatarFile(compressedBlob);
      setAvatarPreview(URL.createObjectURL(compressedBlob));
      setShouldRemovePhoto(false);
    } catch (err) {
      console.error('Error compressing avatar:', err);
      setProfileError('Gagal memproses gambar foto profil.');
    }
  };

  const handleRemovePhoto = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setShouldRemovePhoto(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit Profile Changes (Name, Phone, Avatar)
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!fullName.trim()) {
      setProfileError('Nama lengkap wajib diisi.');
      return;
    }

    setSavingProfile(true);

    const formData = new FormData();
    formData.append('full_name', fullName.trim());
    formData.append('phone', phone ? phone.trim() : '');

    if (shouldRemovePhoto) {
      formData.append('remove_photo', '1');
    } else if (avatarFile) {
      formData.append('foto_profile', avatarFile, 'avatar.jpg');
    }

    try {
      const response = await api.post('/auth/profile', formData);
      if (response.success && response.data) {
        const updatedData = response.data;
        
        // Simpan ke API client (sessionStorage) dan panggil callback update global
        api.setUser(updatedData);

        if (onUserUpdated) {
          onUserUpdated(updatedData);
        }

        setFullName(updatedData.full_name || updatedData.name || '');
        setPhone(updatedData.phone || '');
        setAvatarPreview(updatedData.avatar_url || updatedData.foto_profile || null);
        setAvatarFile(null);
        setShouldRemovePhoto(false);
        setProfileSuccess('Data profil dan foto berhasil diperbarui!');
      }
    } catch (err) {
      if (err.errors) {
        setProfileError(Object.values(err.errors).flat().join(' '));
      } else {
        setProfileError(err.message || 'Gagal memperbarui data profil.');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  // Submit Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Masukkan kata sandi saat ini.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Kata sandi baru minimal 8 karakter.');
      return;
    }

    if (newPassword !== newPasswordConfirmation) {
      setPasswordError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setSavingPassword(true);

    try {
      const response = await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation
      });

      if (response.success) {
        setPasswordSuccess('Kata sandi berhasil diubah! Gunakan kata sandi baru untuk login berikutnya.');
        setCurrentPassword('');
        setNewPassword('');
        setNewPasswordConfirmation('');
      }
    } catch (err) {
      if (err.errors) {
        setPasswordError(Object.values(err.errors).flat().join(' '));
      } else {
        setPasswordError(err.message || 'Gagal mengubah kata sandi.');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const displayName = fullName || user?.name || 'Pengguna';
  const initial = displayName ? displayName.charAt(0).toUpperCase() : 'U';

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* HEADER SECTION */}
      <div className="flex-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--on-surface)' }}>Profil Saya</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.92rem' }}>
            Kelola data diri, nomor telepon, foto profil, dan keamanan akun Anda
          </p>
        </div>
      </div>

      <div className="grid-2fr-1fr" style={{ gap: '24px', alignItems: 'start' }}>
        
        {/* KOLOM KIRI: FORM DATA DIRI & FOTO PROFIL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* KARTU EDIT DATA DIRI */}
          <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User style={{ color: 'var(--primary)' }} size={22} />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Informasi Data Diri</h2>
              </div>
            </div>

            {profileSuccess && (
              <div className="alert alert-success" style={{ marginBottom: '20px' }}>
                <Check size={18} />
                <span style={{ fontWeight: 600 }}>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
                <ShieldAlert size={18} />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile}>
              {/* SECTION FOTO PROFIL INTERAKTIF */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '26px', padding: '16px', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
                  {avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt={displayName} 
                      style={{ 
                        width: '84px', 
                        height: '84px', 
                        borderRadius: '50%', 
                        objectFit: 'cover',
                        border: '3px solid var(--primary)',
                        boxShadow: 'var(--shadow-sm)'
                      }} 
                    />
                  ) : (
                    <div 
                      className="user-avatar" 
                      style={{ 
                        width: '84px', 
                        height: '84px', 
                        fontSize: '2.2rem', 
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        border: '3px solid var(--primary)'
                      }}
                    >
                      {initial}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      position: 'absolute',
                      bottom: '0px',
                      right: '0px',
                      background: 'var(--primary)',
                      color: 'white',
                      border: '2px solid white',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-md)'
                    }}
                    title="Ganti Foto Profil"
                  >
                    <Camera size={14} />
                  </button>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.98rem', fontWeight: 700 }}>Foto Profil</h4>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Format JPG, PNG, atau WEBP (maks. 3MB). Foto akan tampil di pojok kanan atas navbar.
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      accept="image/png, image/jpeg, image/jpg, image/webp" 
                      onChange={handlePhotoSelect} 
                      style={{ display: 'none' }} 
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ fontSize: '0.78rem', padding: '5px 12px', fontWeight: 600 }}
                    >
                      <Camera size={14} /> Unggah Foto
                    </button>

                    {(avatarPreview || avatarFile) && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleRemovePhoto}
                        style={{ fontSize: '0.78rem', padding: '5px 12px', color: 'var(--danger)', fontWeight: 600 }}
                      >
                        <Trash2 size={14} /> Hapus Foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* INPUT NAMA LENGKAP */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={15} style={{ color: 'var(--text-secondary)' }} /> Nama Lengkap <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  placeholder="Masukkan nama lengkap Anda..."
                  required
                  disabled={savingProfile}
                />
              </div>

              {/* INPUT NOMOR TELEPON */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={15} style={{ color: 'var(--text-secondary)' }} /> Nomor Telepon / WhatsApp
                </label>
                <input 
                  type="tel" 
                  className="form-control" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="Contoh: 081234567890"
                  disabled={savingProfile}
                />
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Digunakan untuk koordinasi tugas lapangan dan notifikasi penugasan.
                </span>
              </div>

              {/* INPUT EMAIL (READONLY) */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={15} style={{ color: 'var(--text-secondary)' }} /> Alamat Email
                </label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={user?.email || ''} 
                  disabled 
                  style={{ background: 'var(--surface-container-high)', cursor: 'not-allowed', color: 'var(--text-secondary)' }}
                />
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Email akun terdaftar permanen. Hubungi Administrator jika ingin mengubah email.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ padding: '10px 24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
                  disabled={savingProfile}
                >
                  <Save size={16} />
                  <span>{savingProfile ? 'Menyimpan Profil...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* KOLOM KANAN: RINGKASAN AKUN & FORM GANTI PASSWORD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* KARTU STATUS AKUN */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-xl)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} style={{ color: 'var(--success)' }} /> Status Akun
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.86rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Peran Sistem:</span>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {user?.roles && user.roles.map((r, i) => (
                    <span key={i} className={`role-badge role-${r === 'cleaning_service' ? 'cs' : r.replace('_', '')}`} style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                      {r.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                <span style={{ fontWeight: 700, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ✓ Aktif Terverifikasi
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Username:</span>
                <span style={{ fontWeight: 600, color: 'var(--on-surface)' }}>{user?.username || '-'}</span>
              </div>
            </div>
          </div>

          {/* KARTU GANTI KATA SANDI */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <Key style={{ color: 'var(--primary)' }} size={20} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Ganti Kata Sandi</h3>
            </div>

            {passwordSuccess && (
              <div className="alert alert-success" style={{ marginBottom: '16px', padding: '10px 14px', fontSize: '0.84rem' }}>
                <Check size={16} />
                <span style={{ fontWeight: 600 }}>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="alert alert-danger" style={{ marginBottom: '16px', padding: '10px 14px', fontSize: '0.84rem' }}>
                <ShieldAlert size={16} />
                <span>{passwordError}</span>
              </div>
            )}

            {/* INFO PERSYARATAN PASSWORD */}
            <div style={{ background: 'var(--surface-container-low)', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '16px', fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <AlertCircle size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Ketentuan Keamanan:</strong>
                <div style={{ marginTop: '2px', lineHeight: 1.35 }}>
                  Minimal <strong>8 karakter</strong>, wajib kombinasi <strong>huruf</strong>, <strong>angka</strong>, dan <strong>simbol/karakter khusus</strong> (misal: <code style={{ color: 'var(--primary)' }}>P@ssw0rd123</code>).
                </div>
              </div>
            </div>

            <form onSubmit={handleChangePassword}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '0.84rem', fontWeight: 600 }}>Kata Sandi Saat Ini</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showCurrentPass ? 'text' : 'password'} 
                    className="form-control" 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                    placeholder="Masukkan password lama..."
                    required
                    disabled={savingPassword}
                    style={{ paddingRight: '38px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    tabIndex={-1}
                  >
                    {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '0.84rem', fontWeight: 600 }}>Kata Sandi Baru</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showNewPass ? 'text' : 'password'} 
                    className="form-control" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    placeholder="Kombinasi huruf, angka, & simbol..."
                    required
                    disabled={savingPassword}
                    style={{ paddingRight: '38px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    tabIndex={-1}
                  >
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontSize: '0.84rem', fontWeight: 600 }}>Konfirmasi Kata Sandi Baru</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showConfirmPass ? 'text' : 'password'} 
                    className="form-control" 
                    value={newPasswordConfirmation} 
                    onChange={(e) => setNewPasswordConfirmation(e.target.value)} 
                    placeholder="Ketik ulang password baru..."
                    required
                    disabled={savingPassword}
                    style={{ paddingRight: '38px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    tabIndex={-1}
                  >
                    {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', height: '42px', fontWeight: 700 }}
                disabled={savingPassword}
              >
                {savingPassword ? 'Menyimpan Sandi...' : 'Ubah Kata Sandi'}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}

