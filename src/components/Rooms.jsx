import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Plus, Edit2, Trash2, Check, X, ShieldAlert, QrCode, Download, Eye, Printer, Layers } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext.jsx';
import BulkQrPrint from './BulkQrPrint.jsx';

export default function Rooms() {
  const confirm = useConfirm();
  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [users, setUsers] = useState([]); // Filtered for PICs
  const [templates, setTemplates] = useState([]); // Checklist Templates
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Bulk QR Print View State
  const [showBulkPrint, setShowBulkPrint] = useState(false);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [floor, setFloor] = useState(1);
  const [buildingId, setBuildingId] = useState('');
  const [picUserId, setPicUserId] = useState('');
  const [checklistTemplateId, setChecklistTemplateId] = useState('');

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

  // Refetch hanya data ruangan tanpa memuat ulang master lookup
  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms?per_page=1000');
      if (res.success) {
        setRooms(res.data.data || res.data || []);
      }
    } catch (err) {
      console.error('Failed to refresh rooms list:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [roomsRes, buildingsRes, usersRes, templatesRes] = await Promise.all([
        api.get('/rooms?per_page=1000'),
        api.get('/buildings?is_active=true&per_page=1000', { lookup: true }),
        api.get('/users?per_page=1000', { lookup: true }), // Admin only route
        api.get('/checklist-templates?per_page=100', { lookup: true })
      ]);

      if (roomsRes.success) setRooms(roomsRes.data.data || roomsRes.data || []);
      if (buildingsRes.success) setBuildings(buildingsRes.data.data || buildingsRes.data || []);
      if (templatesRes.success) setTemplates(templatesRes.data.data || templatesRes.data || []);
      
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
    setChecklistTemplateId('');
    setShowForm(true);
    setPreviewingRoom(null);
  };

  const handleOpenEditForm = (room) => {
    setEditingRoom(room);
    setName(room.name || room.nama_ruangan || '');
    setCode(room.code || room.kode_ruangan || '');
    setFloor(room.floor || room.lantai || 1);
    setBuildingId(room.building_id || room.building?.id || '');
    setPicUserId(room.active_pic?.user_id || room.active_pic?.user?.id || room.pic_user_id || '');
    setChecklistTemplateId(room.checklist_template_id || room.template?.id || '');
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
      pic_user_id: picUserId || null,
      checklist_template_id: checklistTemplateId || null,
    };

    try {
      let response;
      if (editingRoom) {
        response = await api.put(`/rooms/${editingRoom.id}`, payload);
      } else {
        response = await api.post('/rooms', payload);
      }

      if (response.success) {
        const savedRoom = response.data;
        if (savedRoom && savedRoom.id) {
          if (editingRoom) {
            setRooms(prev => prev.map(r => r.id === editingRoom.id ? { ...r, ...savedRoom } : r));
          } else {
            setRooms(prev => [savedRoom, ...prev]);
          }
        }
        setSuccessMsg(editingRoom ? 'Ruangan berhasil diperbarui.' : 'Ruangan baru berhasil ditambahkan.');
        setShowForm(false);
        setEditingRoom(null);
        // Refresh background ruangan saja tanpa memblokir UI
        fetchRooms();
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
      title: 'Nonaktifkan / Soft Delete Ruangan',
      message: 'Apakah Anda yakin ingin menonaktifkan ruangan ini? Seluruh data historis tugas, jadwal, bukti laporan, dan audit trail akan tetap tersimpan aman di database.',
      confirmText: 'Ya, Nonaktifkan',
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
        setRooms(prev => prev.filter(r => r.id !== id));
        setSuccessMsg('Ruangan berhasil dinonaktifkan.');
        fetchRooms();
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
      link.download = `qrcode-room-${room.code || room.kode_ruangan}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError('Gagal mengunduh QR Code.');
    }
  };

  return (
    <div>
      {showBulkPrint && <BulkQrPrint onClose={() => setShowBulkPrint(false)} />}

      <div className="flex-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>Kelola Ruangan</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manajemen ruangan, alokasi PIC, template checklist, dan cetak massal QR Code</p>
        </div>
        {!showForm && !previewingRoom && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setShowBulkPrint(true)} style={{ display: 'inline-flex', gap: '6px' }}>
              <Printer size={16} /> Cetak Massal QR Code
            </button>
            <button className="btn btn-primary" onClick={handleOpenNewForm} style={{ display: 'inline-flex', gap: '6px' }}>
              <Plus size={16} /> Tambah Ruangan
            </button>
          </div>
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

      {/* CREATE/EDIT FORM (Floating Pop-up) */}
      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div 
            className="glass-panel" 
            style={{ maxWidth: '640px', width: '92vw', maxHeight: '88vh', overflowY: 'auto', padding: '28px', borderRadius: 'var(--radius-2xl)', background: '#ffffff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {editingRoom ? 'Edit Data Ruangan' : 'Tambah Ruangan'}
                </span>
                <h2 className="modal-title" style={{ marginTop: '2px' }}>
                  {editingRoom ? 'Edit Ruangan' : 'Tambah Ruangan Baru'}
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
                    <label className="form-label" style={{ fontWeight: 700 }}>Nama Ruangan *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="Contoh: R. Sterilisasi A"
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Kode Ruang (Unik) *</label>
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

                <div className="grid-3-cols" style={{ gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Lantai *</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={floor} 
                      onChange={(e) => setFloor(e.target.value)} 
                      min="1"
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Gedung *</label>
                    <select 
                      className="form-control form-select"
                      value={buildingId}
                      onChange={(e) => setBuildingId(e.target.value)}
                      required
                    >
                      <option value="" disabled>Pilih Gedung</option>
                      {buildings.map(b => (
                        <option key={b.id} value={b.id}>{b.name || b.nama_gedung} ({b.code || b.kode_gedung})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>PIC Penanggung Jawab</label>
                    <select 
                      className="form-control form-select"
                      value={picUserId}
                      onChange={(e) => setPicUserId(e.target.value)}
                    >
                      <option value="">— Belum Ditentukan —</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name || u.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Template Checklist Kebersihan (Otomatisasi Massal)</label>
                  <select
                    className="form-control form-select"
                    value={checklistTemplateId}
                    onChange={(e) => setChecklistTemplateId(e.target.value)}
                  >
                    <option value="">— Gunakan Jadwal Kustom / Tanpa Template —</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nama_template} ({t.items?.length || 0} item kebersihan standar)
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Jika dipilih, ruangan ini akan otomatis mengadopsi seluruh item kebersihan dari template setiap hari.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>
                  ✓ Simpan Ruangan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR PREVIEW MODAL (Floating Pop-up) */}
      {previewingRoom && (
        <div className="modal-backdrop" onClick={() => setPreviewingRoom(null)}>
          <div 
            className="glass-panel" 
            style={{ maxWidth: '480px', width: '92vw', padding: '28px', borderRadius: 'var(--radius-2xl)', background: '#ffffff', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">QR Code Ruangan</h2>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => setPreviewingRoom(null)}
                title="Tutup preview"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#ffffff', padding: '16px', borderRadius: 'var(--radius-xl)', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', width: '220px', height: '220px', border: '2px solid rgba(14, 49, 146, 0.1)', margin: '10px auto' }}>
              {loadingQr ? (
                <div className="spinner"></div>
              ) : qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>Gagal memuat QR Code</span>
              )}
            </div>

            <h3 style={{ margin: '14px 0 4px 0', fontSize: '1.2rem', fontWeight: 800 }}>
              {previewingRoom.name || previewingRoom.nama_ruangan}
            </h3>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.88rem' }}>
              Kode: <strong>{previewingRoom.code || previewingRoom.kode_ruangan}</strong> • Lantai {previewingRoom.floor || previewingRoom.lantai} • Gedung: {previewingRoom.building?.nama_gedung || previewingRoom.building?.name}
            </p>

            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => handleDownloadQrCode(previewingRoom)}
                disabled={loadingQr}
                style={{ fontWeight: 700 }}
              >
                <Download size={16} /> Unduh File PNG
              </button>
              <button className="btn btn-secondary" onClick={() => setPreviewingRoom(null)}>
                Tutup
              </button>
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
                <th>Template Checklist</th>
                <th>PIC Aktif</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.name || r.nama_ruangan}</td>
                  <td><code>{r.code || r.kode_ruangan}</code></td>
                  <td>Lantai {r.floor || r.lantai}</td>
                  <td>{r.building?.nama_gedung || r.building?.name || '-'}</td>
                  <td>
                    {r.template_name || r.template?.nama_template ? (
                      <span className="role-badge role-supervisor" style={{ fontSize: '0.75rem', textTransform: 'none' }}>
                        {r.template_name || r.template?.nama_template}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Kustom</span>
                    )}
                  </td>
                  <td>
                    <span className="role-badge role-pic" style={{ textTransform: 'none' }}>
                      {r.active_pic?.user?.name || r.pic?.full_name || 'Belum ada PIC'}
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
