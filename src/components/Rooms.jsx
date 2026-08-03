import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Plus, Edit2, Trash2, Check, X, ShieldAlert, QrCode, Download, Eye } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext.jsx';

export default function Rooms() {
  const confirm = useConfirm();
  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [users, setUsers] = useState([]); // Filtered for PICs
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [floor, setFloor] = useState(1);
  const [buildingId, setBuildingId] = useState('');
  const [picUserId, setPicUserId] = useState('');

  // QR Code Preview State
  const [previewingRoom, setPreviewingRoom] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);

  // Filter State
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState('');
  const [selectedPicFilter, setSelectedPicFilter] = useState('');

  // Logika Filter Ruangan berdasarkan Gedung + PIC Aktif
  const filteredRooms = rooms.filter(r => {
    const matchBuilding = selectedBuildingFilter === '' ||
      r.building_id === selectedBuildingFilter ||
      (r.building && r.building.id === selectedBuildingFilter);

    const activePicId = r.active_pic?.user_id || r.active_pic?.user?.id || r.pic_user_id || null;
    const matchPic = selectedPicFilter === '' ||
      (selectedPicFilter === '__no_pic__' && !activePicId) ||
      activePicId === selectedPicFilter;

    return matchBuilding && matchPic;
  });

  const hasActiveFilter = selectedBuildingFilter !== '' || selectedPicFilter !== '';

  const handleResetFilters = () => {
    setSelectedBuildingFilter('');
    setSelectedPicFilter('');
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [roomsRes, buildingsRes, usersRes] = await Promise.all([
        api.get('/rooms?per_page=1000'),
        api.get('/buildings?is_active=true&per_page=1000'),
        api.get('/users?per_page=1000') // Admin only route
      ]);

      if (roomsRes.success) setRooms(roomsRes.data.data || roomsRes.data || []);
      if (buildingsRes.success) setBuildings(buildingsRes.data.data || buildingsRes.data || []);
      
      if (usersRes.success) {
        const allUsers = usersRes.data.data || usersRes.data || [];
        const pics = allUsers.filter(u => u.roles && u.roles.includes('pic'));
        setUsers(pics);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat data master.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
    setEditingRoom(null);
    setName('');
    setCode('');
    setFloor(1);
    setBuildingId(buildings[0]?.id || '');
    setPicUserId(users[0]?.id || '');
    setShowForm(true);
    setPreviewingRoom(null);
  };

  const handleOpenEditForm = (room) => {
    setEditingRoom(room);
    setName(room.name);
    setCode(room.code);
    setFloor(room.floor);
    setBuildingId(room.building_id || room.building?.id || '');
    setPicUserId(room.active_pic?.user_id || room.active_pic?.user?.id || '');
    setShowForm(true);
    setPreviewingRoom(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const payload = {
      building_id: buildingId,
      name,
      code,
      floor: parseInt(floor),
      pic_user_id: picUserId
    };

    try {
      let response;
      if (editingRoom) {
        response = await api.put(`/rooms/${editingRoom.id}`, payload);
      } else {
        response = await api.post('/rooms', payload);
      }

      if (response.success) {
        setSuccessMsg(editingRoom ? 'Ruangan berhasil diperbarui.' : 'Ruangan baru berhasil ditambahkan.');
        setShowForm(false);
        fetchData();
      }
    } catch (err) {
      if (err.errors) {
        setError(Object.values(err.errors).flat().join(' '));
      } else {
        setError(err.message || 'Terjadi kesalahan saat menyimpan data.');
      }
    }
  };

  const handleDelete = async (id) => {
    if (!(await confirm({
      title: 'Hapus Ruangan Permanen',
      message: 'Apakah Anda yakin ingin menghapus ruangan ini secara permanen? Semua data tugas, jadwal, riwayat laporan, dan temuan terkait ruangan ini juga akan dihapus.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger'
    }))) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await api.delete(`/rooms/${id}`);
      if (response.success) {
        setSuccessMsg('Ruangan dan data terkait berhasil dihapus sepenuhnya.');
        fetchData();
      }
    } catch (err) {
      setError(err.message || 'Gagal menghapus ruangan.');
    }
  };

  const handleViewQrCode = async (room) => {
    setPreviewingRoom(room);
    setLoadingQr(true);
    setQrCodeUrl(null);
    try {
      const blob = await api.get(`/rooms/${room.id}/qr-code/download`);
      const url = URL.createObjectURL(blob);
      setQrCodeUrl(url);
    } catch (err) {
      setError('Gagal memuat QR Code.');
    } finally {
      setLoadingQr(false);
    }
  };

  const handleDownloadQrCode = async (room) => {
    try {
      const blob = await api.get(`/rooms/${room.id}/qr-code/download`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qrcode-room-${room.code}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError('Gagal mengunduh QR Code.');
    }
  };

  return (
    <div>
      <div className="flex-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>Kelola Ruangan</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manajemen ruangan, alokasi PIC, dan unduh QR Code scan</p>
        </div>
        {!showForm && !previewingRoom && (
          <button className="btn btn-primary" onClick={handleOpenNewForm}>
            <Plus size={16} /> Tambah Ruangan
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
      {!showForm && !previewingRoom && (
        <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap' }}>

            {/* Filter Gedung */}
            <div style={{ flex: '1', minWidth: '200px', maxWidth: '280px' }}>
              <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '5px', display: 'block' }}>Filter Gedung</label>
              <select
                className="form-control form-select"
                value={selectedBuildingFilter}
                onChange={(e) => setSelectedBuildingFilter(e.target.value)}
                style={{ height: '36px', fontSize: '0.88rem' }}
              >
                <option value="">Semua Gedung</option>
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>

            {/* Filter PIC Aktif */}
            <div style={{ flex: '1', minWidth: '200px', maxWidth: '300px' }}>
              <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '5px', display: 'block' }}>Filter PIC Aktif</label>
              <select
                className="form-control form-select"
                value={selectedPicFilter}
                onChange={(e) => setSelectedPicFilter(e.target.value)}
                style={{ height: '36px', fontSize: '0.88rem' }}
              >
                <option value="">Semua PIC</option>
                <option value="__no_pic__">— Belum ada PIC —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Reset & Counter */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', paddingBottom: '1px' }}>
              {hasActiveFilter && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleResetFilters}
                  style={{ height: '36px', whiteSpace: 'nowrap' }}
                >
                  <X size={13} /> Reset Filter
                </button>
              )}
              <div style={{
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                background: hasActiveFilter ? 'rgba(14, 49, 146, 0.07)' : 'rgba(0,0,0,0.03)',
                borderRadius: 'var(--radius-lg)',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: hasActiveFilter ? 'var(--primary)' : 'var(--text-muted)',
                whiteSpace: 'nowrap',
                gap: '6px',
              }}>
                <span style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: hasActiveFilter ? 'var(--primary)' : 'var(--text-muted)',
                  color: 'white', display: 'inline-flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700
                }}>{filteredRooms.length}</span>
                ruangan ditemukan
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CREATE/EDIT FORM */}
      {showForm && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-md)', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>
            {editingRoom ? 'Edit Ruangan' : 'Tambah Ruangan Baru'}
          </h2>
          <form onSubmit={handleSave}>
            <div className="grid-2-cols">
              <div className="form-group">
                <label className="form-label">Nama Ruangan</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Contoh: R. Sterilisasi A"
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Kode Ruang (Unik)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={code} 
                  onChange={(e) => setCode(e.target.value)} 
                  placeholder="Contoh: STR-A"
                  required 
                />
              </div>
            </div>

            <div className="grid-3-cols">
              <div className="form-group">
                <label className="form-label">Lantai</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={floor} 
                  onChange={(e) => setFloor(e.target.value)} 
                  min="1"
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Gedung</label>
                <select 
                  className="form-control form-select"
                  value={buildingId}
                  onChange={(e) => setBuildingId(e.target.value)}
                  required
                >
                  <option value="" disabled>Pilih Gedung</option>
                  {buildings.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">PIC Ruangan (Penanggung Jawab)</label>
                <select 
                  className="form-control form-select"
                  value={picUserId}
                  onChange={(e) => setPicUserId(e.target.value)}
                  required
                >
                  <option value="" disabled>Pilih User PIC</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="submit" className="btn btn-primary">Simpan</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
            </div>
          </form>
        </div>
      )}

      {/* QR PREVIEW SECTION */}
      {previewingRoom && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-md)', marginBottom: '30px', display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '200px', height: '200px', border: '1px solid var(--border-color)' }}>
            {loadingQr ? (
              <div className="spinner"></div>
            ) : qrCodeUrl ? (
              <img src={qrCodeUrl} alt="QR Code Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ color: 'black', fontSize: '0.8rem' }}>Eror QR</span>
            )}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>QR Code: {previewingRoom.name}</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.9rem' }}>
              Kode Ruangan: <code>{previewingRoom.code}</code> | Lantai {previewingRoom.floor} | Gedung: {previewingRoom.building?.name}
            </p>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '0.8rem', fontStyle: 'italic' }}>
              Token QR aktif: <code>{previewingRoom.qr_code_token}</code>
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button 
                className="btn btn-primary btn-sm" 
                onClick={() => handleDownloadQrCode(previewingRoom)}
                disabled={loadingQr}
              >
                <Download size={14} /> Unduh File PNG
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setPreviewingRoom(null)}>Tutup Preview</button>
            </div>
          </div>
        </div>
      )}

      {/* LIST ROOMS */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Ruangan</th>
                <th>Kode</th>
                <th>Lantai</th>
                <th>Gedung</th>
                <th>PIC Aktif</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td><code>{r.code}</code></td>
                  <td>Lantai {r.floor}</td>
                  <td>{r.building?.name || '-'}</td>
                  <td>
                    <span className="role-badge role-pic" style={{ textTransform: 'none' }}>
                      {r.active_pic?.user?.name || 'Belum ada PIC'}
                    </span>
                  </td>
                  <td>
                    <span className={`role-badge ${r.is_active ? 'role-cs' : 'role-admin'}`}>
                      {r.is_active ? 'Aktif' : 'Non-aktif'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleOpenEditForm(r)}
                        style={{ padding: '6px' }}
                        title="Edit Ruangan"
                        aria-label={`Edit ruangan ${r.name}`}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleViewQrCode(r)}
                        style={{ padding: '6px', color: 'var(--secondary)' }}
                        title="Preview QR Code"
                        aria-label={`Pratinjau QR Code ruangan ${r.name}`}
                      >
                        <QrCode size={14} />
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleDelete(r.id)}
                        style={{ padding: '6px', color: 'var(--danger)' }}
                        title="Hapus Ruangan"
                        aria-label={`Hapus ruangan ${r.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRooms.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 24px' }}>
                    {hasActiveFilter
                      ? 'Tidak ada ruangan yang cocok dengan filter yang dipilih.'
                      : 'Belum ada data ruangan.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
