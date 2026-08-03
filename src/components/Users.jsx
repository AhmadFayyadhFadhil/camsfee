import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { ROLES } from '../utils/constants';
import { Users, Plus, Edit2, Trash2, Check, X, ShieldAlert, Key } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext.jsx';

export default function UsersList() {
  const confirm = useConfirm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

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

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/users?per_page=1000');
      if (response.success) {
        setUsers(response.data.data || response.data || []);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat data pengguna.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
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
        setSuccessMsg(editingUser ? 'User berhasil diperbarui.' : 'User baru berhasil ditambahkan.');
        setShowForm(false);
        fetchUsers();
      }
    } catch (err) {
      if (err.errors) {
        setError(Object.values(err.errors).flat().join(' '));
      } else {
        setError(err.message || 'Terjadi kesalahan saat menyimpan data.');
      }
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

      {/* CREATE/EDIT FORM */}
      {showForm && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-md)', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>
            {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
          </h2>
          <form onSubmit={handleSave}>
            <div className="grid-2-cols">
              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Contoh: Budi Santoso"
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Alamat Email</label>
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

            <div className="grid-2-cols">
              <div className="form-group">
                <label className="form-label">
                  Kata Sandi {editingUser && <span style={{ color: 'var(--text-muted)' }}>(Kosongkan jika tidak diganti)</span>}
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
              <div className="form-group">
                <label className="form-label">Status Keaktifan</label>
                <select 
                  className="form-control form-select"
                  value={isActive ? 'true' : 'false'}
                  onChange={(e) => setIsActive(e.target.value === 'true')}
                >
                  <option value="true">Aktif</option>
                  <option value="false">Non-aktif</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '25px' }}>
              <label className="form-label">Pilih Otoritas Peran (Roles)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '6px' }}>
                {ROLES.map(role => (
                  <label 
                    key={role.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      padding: '8px 14px', 
                      background: 'rgba(255,255,255,0.02)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer' 
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={selectedRoles.includes(role.name)} 
                      onChange={() => handleRoleCheckboxChange(role.name)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                    />
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{role.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary">Simpan</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
            </div>
          </form>
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
                    <span className={`role-badge ${u.is_active ? 'role-cs' : 'role-admin'}`}>
                      {u.is_active ? 'Aktif' : 'Non-aktif'}
                    </span>
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
