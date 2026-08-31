import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { ROLES } from '../utils/constants';
import { Users, Plus, Edit2, Trash2, Check, X, ShieldAlert, Key } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext.jsx';

export default function UsersList({ currentUser, isSupervisor, isAdmin }) {
  const confirm = useConfirm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoles, setSelectedRoles] = useState([]); // Array of role names, e.g. ['pic']
  const [isActive, setIsActive] = useState(true);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Logika Filter Pengguna
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesRole = roleFilter === '' || (u.roles && u.roles.includes(roleFilter));
    
    const matchesStatus = 
      statusFilter === '' || 
      (statusFilter === 'active' && u.is_active) || 
      (statusFilter === 'inactive' && !u.is_active);
      
    return matchesSearch && matchesRole && matchesStatus;
  });

  const fetchUsers = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const response = await api.get('/users?per_page=1000');
      if (response.success) {
        setUsers(response.data.data || response.data || []);
      }
    } catch (err) {
      if (showLoading) setError(err.message || 'Gagal memuat data pengguna.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(true);
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

  const handleOpenNewForm = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setSelectedRoles(['cleaning_service']); // Default
    setIsActive(true);
    setShowForm(true);
  };

  const handleOpenEditForm = (user) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword(''); // Empty password, only filled if changing
    setSelectedRoles(user.roles || []);
    setIsActive(user.is_active);
    setShowForm(true);
  };

  const handleRoleCheckboxChange = (roleName) => {
    if (selectedRoles.includes(roleName)) {
      setSelectedRoles(selectedRoles.filter(r => r !== roleName));
    } else {
      setSelectedRoles([...selectedRoles, roleName]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (selectedRoles.length === 0) {
      setError('Pilih minimal satu role untuk pengguna ini.');
      return;
    }

    const payload = {
      name,
      email,
      roles: selectedRoles,
      is_active: isActive
    };

    if (password) {
      payload.password = password;
    }

    try {
      let response;
      if (editingUser) {
        response = await api.put(`/users/${editingUser.id}`, payload);
      } else {
        // Password is required for new user
        if (!password) {
          setError('Password wajib diisi untuk pengguna baru.');
          return;
        }
        response = await api.post('/users', payload);
      }

      if (response.success) {
        const savedUser = response.data;
        if (savedUser && savedUser.id) {
          if (editingUser) {
            setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...savedUser } : u));
          } else {
            setUsers(prev => [savedUser, ...prev]);
          }
        }
        setSuccessMsg(editingUser ? 'User berhasil diperbarui.' : 'User baru berhasil ditambahkan.');
        setShowForm(false);
        setEditingUser(null);
        fetchUsers(false);
      }
    } catch (err) {
      if (err.errors) {
        setError(Object.values(err.errors).flat().join(' '));
      } else {
        setError(err.message || 'Terjadi kesalahan saat menyimpan data.');
      }
    }
  };

  const handleToggleStatus = async (user) => {
    if (!user) return;
    
    // Proteksi: jangan izinkan menonaktifkan akun sendiri
    if (currentUser?.id === user.id) {
      setError('Anda tidak dapat mengubah status aktif akun Anda sendiri.');
      return;
    }

    // Proteksi: Supervisor tidak boleh menonaktifkan Admin
    if (isSupervisor && user.roles?.includes('admin')) {
      setError('Supervisor tidak memiliki wewenang untuk mengubah status akun Administrator.');
      return;
    }

    const confirmMessage = user.is_active
      ? `Apakah Anda yakin ingin menonaktifkan akun "${user.name}"? Pengguna ini tidak akan bisa login ke sistem.`
      : `Apakah Anda yakin ingin mengaktifkan kembali akun "${user.name}"?`;

    const isConfirmed = await confirm({
      title: `${user.is_active ? 'Nonaktifkan' : 'Aktifkan'} Pengguna`,
      message: confirmMessage,
      confirmText: user.is_active ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan',
      cancelText: 'Batal',
      type: user.is_active ? 'warning' : 'primary'
    });

    if (!isConfirmed) return;

    setTogglingId(user.id);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.patch(`/users/${user.id}/toggle-status`);
      if (res.success && res.data) {
        const updatedUser = res.data;
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...updatedUser, is_active: updatedUser.is_active } : u));
        setSuccessMsg(res.message || `Status akun ${user.name} berhasil diperbarui.`);
      }
    } catch (err) {
      setError(err.message || 'Gagal mengubah status pengguna.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeactivate = async (id) => {
    if (!(await confirm({
      title: 'Hapus Pengguna Secara Permanen',
      message: 'Apakah Anda yakin ingin menghapus pengguna ini secara permanen? Semua data penugasan, histori PIC, dan laporan terkait juga akan ikut terhapus.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger'
    }))) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await api.delete(`/users/${id}`);
      if (response.success) {
        setSuccessMsg('Pengguna berhasil dihapus sepenuhnya.');
        fetchUsers();
      }
    } catch (err) {
      setError(err.message || 'Gagal menghapus pengguna.');
    }
  };

  return (
    <div>
      <div className="flex-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>Kelola Pengguna</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manajemen akun staf, pembagian otoritas peran (roles), dan status keaktifan</p>
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={handleOpenNewForm}>
            <Plus size={16} /> Tambah Staf Baru
          </button>
        )}
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

      {/* FILTER PANEL */}
      {!showForm && (
        <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '6px', display: 'block' }}>Cari Staf</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Cari nama, username, email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '0.9rem', height: '38px' }}
            />
          </div>
          <div style={{ width: '180px' }}>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '6px', display: 'block' }}>Filter Hak Akses (Role)</label>
            <select 
              className="form-control form-select" 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '0.9rem', height: '38px' }}
            >
              <option value="">Semua Role</option>
              <option value="admin">Admin</option>
              <option value="supervisor">Supervisor</option>
              <option value="pic">PIC</option>
              <option value="cleaning_service">Cleaning Service</option>
            </select>
          </div>
          <div style={{ width: '180px' }}>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '6px', display: 'block' }}>Filter Status</label>
            <select 
              className="form-control form-select" 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '0.9rem', height: '38px' }}
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Non-aktif</option>
            </select>
          </div>
        </div>
      )}

      {/* CREATE/EDIT FORM (Floating Pop-up) */}
      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div 
            className="glass-panel" 
            style={{ maxWidth: '600px', width: '92vw', maxHeight: '88vh', overflowY: 'auto', padding: '28px', borderRadius: 'var(--radius-2xl)', background: '#ffffff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {editingUser ? 'Edit Akun Staf' : 'Tambah Staf'}
                </span>
                <h2 className="modal-title" style={{ marginTop: '2px' }}>
                  {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
                </h2>
              </div>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => setShowForm(false)}
                title="Tutup formulir"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="grid-2-cols" style={{ gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Nama Lengkap *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="Contoh: Budi Santoso"
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Alamat Email *</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="Contoh: budi@widatra.com"
                      required 
                    />
                  </div>
                </div>

                <div className="grid-2-cols" style={{ gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      Kata Sandi {editingUser && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Kosongkan jika tetap)</span>}
                    </label>
                    <input 
                      type="password" 
                      className="form-control" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder={editingUser ? "Ganti password baru..." : "Ketik password akun..."}
                      required={!editingUser} 
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Status Keaktifan</label>
                    <select 
                      className="form-control form-select"
                      value={isActive ? 'true' : 'false'}
                      onChange={(e) => setIsActive(e.target.value === 'true')}
                    >
                      <option value="true">🟢 Aktif Bekerja</option>
                      <option value="false">🔴 Non-aktif</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Pilih Otoritas Peran (Roles) *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginTop: '6px' }}>
                    {ROLES.map(role => (
                      <label 
                        key={role.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          padding: '10px 12px', 
                          background: selectedRoles.includes(role.name) ? 'rgba(14, 49, 146, 0.05)' : 'rgba(0,0,0,0.02)', 
                          border: selectedRoles.includes(role.name) ? '1.5px solid var(--primary)' : '1px solid var(--border-color)', 
                          borderRadius: 'var(--radius-lg)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={selectedRoles.includes(role.name)} 
                          onChange={() => handleRoleCheckboxChange(role.name)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                        />
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: selectedRoles.includes(role.name) ? 'var(--primary)' : 'var(--text-primary)' }}>{role.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>
                  ✓ Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIST USERS */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Pengguna</th>
                <th>Email</th>
                <th>Hak Akses (Roles)</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td><code>{u.email}</code></td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {u.roles && u.roles.map((r, i) => (
                        <span key={i} className={`role-badge role-${r === 'cleaning_service' ? 'cs' : r.replace('_', '')}`}>
                          {r.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(u)}
                      disabled={togglingId === u.id || (currentUser?.id === u.id) || (isSupervisor && u.roles?.includes('admin'))}
                      title={
                        currentUser?.id === u.id 
                          ? 'Tidak dapat menonaktifkan akun sendiri'
                          : isSupervisor && u.roles?.includes('admin')
                            ? 'Supervisor tidak dapat menonaktifkan Admin'
                            : `Klik untuk ${u.is_active ? 'Menonaktifkan' : 'Mengaktifkan'} pengguna ini`
                      }
                      style={{
                        cursor: (currentUser?.id === u.id || (isSupervisor && u.roles?.includes('admin'))) ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: u.is_active ? '1px solid #86efac' : '1px solid #fca5a5',
                        background: u.is_active ? '#ecfdf5' : '#fef2f2',
                        color: u.is_active ? '#15803d' : '#b91c1c',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                      }}
                    >
                      <span style={{ 
                        width: '7px', 
                        height: '7px', 
                        borderRadius: '50%', 
                        background: u.is_active ? '#22c55e' : '#ef4444',
                        display: 'inline-block'
                      }}></span>
                      <span>{togglingId === u.id ? 'Memproses...' : u.is_active ? 'Aktif' : 'Non-aktif'}</span>
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleOpenEditForm(u)}
                        style={{ padding: '6px' }}
                        title="Edit Pengguna"
                        aria-label={`Edit pengguna ${u.name}`}
                      >
                        <Edit2 size={14} />
                      </button>
                      {!u.roles?.includes('admin') && (
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => handleDeactivate(u.id)}
                          style={{ padding: '6px', color: 'var(--danger)' }}
                          title="Hapus Permanen"
                          aria-label={`Hapus pengguna ${u.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada data pengguna yang cocok dengan filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
