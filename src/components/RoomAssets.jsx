import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Plus, Edit2, Trash2, Check, X, ShieldAlert, Wrench, Box, Filter, ListPlus } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext.jsx';

export default function RoomAssets({ initialRoomId = null }) {
  const confirm = useConfirm();
  const [assets, setAssets] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState(initialRoomId || '');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');

  // Form State (Multi-row dynamic items)
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [roomId, setRoomId] = useState(initialRoomId || '');
  const [items, setItems] = useState([
    { id: 'item-1', nama_aset: '', kode_aset: '', merk: '', status: 'active' }
  ]);
  const [saving, setSaving] = useState(false);

  const generateAssetCode = () => `AST-${Math.floor(1000 + Math.random() * 9000)}`;

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/room-assets?per_page=100';
      if (selectedRoomFilter) url += `&room_id=${encodeURIComponent(selectedRoomFilter)}`;
      if (selectedStatusFilter) url += `&status=${encodeURIComponent(selectedStatusFilter)}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const [assetsRes, roomsRes] = await Promise.all([
        api.get(url),
        api.get('/rooms?is_active=true&per_page=500')
      ]);

      if (assetsRes.success) {
        setAssets(assetsRes.data.data || assetsRes.data || []);
      }
      if (roomsRes.success) {
        setRooms(roomsRes.data.data || roomsRes.data || []);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat daftar aset ruangan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedRoomFilter, selectedStatusFilter, search]);

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

  const handleOpenNew = () => {
    setEditingAsset(null);
    setRoomId(selectedRoomFilter || rooms[0]?.id || '');
    setItems([
      { id: `item-${Date.now()}-1`, nama_aset: '', kode_aset: generateAssetCode(), merk: '', status: 'active' }
    ]);
    setShowModal(true);
  };

  const handleOpenEdit = (asset) => {
    setEditingAsset(asset);
    setRoomId(asset.room_id || '');
    setItems([
      {
        id: asset.id,
        nama_aset: asset.nama_aset || '',
        kode_aset: asset.kode_aset || '',
        merk: asset.merk || '',
        status: asset.status || 'active'
      }
    ]);
    setShowModal(true);
  };

  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        nama_aset: '',
        kode_aset: generateAssetCode(),
        merk: '',
        status: 'active'
      }
    ]);
  };

  const handleRemoveItemRow = (index) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(
      updated.length > 0
        ? updated
        : [{ id: `item-${Date.now()}`, nama_aset: '', kode_aset: generateAssetCode(), merk: '', status: 'active' }]
    );
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!roomId) {
      setError('Ruangan penempatan wajib dipilih.');
      return;
    }

    if (editingAsset) {
      const singleItem = items[0];
      if (!singleItem.nama_aset.trim() || !singleItem.kode_aset.trim()) {
        setError('Nama dan kode aset wajib diisi.');
        return;
      }

      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      try {
        const payload = {
          room_id: roomId,
          nama_aset: singleItem.nama_aset.trim(),
          kode_aset: singleItem.kode_aset.trim(),
          merk: singleItem.merk ? singleItem.merk.trim() : null,
          status: singleItem.status || 'active',
        };
        const res = await api.put(`/room-assets/${editingAsset.id}`, payload);
        if (res.success) {
          setSuccessMsg('Aset ruangan berhasil diperbarui.');
          setShowModal(false);
          fetchData();
        }
      } catch (err) {
        setError(err.message || 'Gagal menyimpan pembaruan aset.');
      } finally {
        setSaving(false);
      }
    } else {
      // Batch mode
      const validItems = items.filter(
        (i) => i.nama_aset && i.nama_aset.trim() !== '' && i.kode_aset && i.kode_aset.trim() !== ''
      );

      if (validItems.length === 0) {
        setError('Minimal isi 1 baris nama aset dan kode aset.');
        return;
      }

      // Check duplicate kode_aset within current batch
      const codes = validItems.map((i) => i.kode_aset.trim().toLowerCase());
      const uniqueCodes = new Set(codes);
      if (uniqueCodes.size !== codes.length) {
        setError('Terdapat kode aset duplikat dalam daftar yang Anda masukkan. Pastikan setiap kode aset berbeda.');
        return;
      }

      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      try {
        const payload = {
          room_id: roomId,
          assets: validItems.map((i) => ({
            nama_aset: i.nama_aset.trim(),
            kode_aset: i.kode_aset.trim(),
            merk: i.merk ? i.merk.trim() : null,
            status: i.status || 'active',
          })),
        };
        const res = await api.post('/room-assets', payload);
        if (res.success) {
          setSuccessMsg(
            validItems.length > 1
              ? `${validItems.length} aset ruangan berhasil ditambahkan sekaligus!`
              : 'Aset ruangan baru berhasil ditambahkan.'
          );
          setShowModal(false);
          fetchData();
        }
      } catch (err) {
        setError(err.message || 'Gagal menambahkan aset ruangan.');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleDelete = async (asset) => {
    if (
      !(await confirm({
        title: 'Hapus Aset Ruangan',
        message: `Apakah Anda yakin ingin menghapus aset "${asset.nama_aset}" (${asset.kode_aset})? Riwayat temuan terkait aset ini tetap tersimpan.`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        type: 'danger',
      }))
    ) {
      return;
    }

    try {
      const res = await api.delete(`/room-assets/${asset.id}`);
      if (res.success) {
        setSuccessMsg('Aset ruangan berhasil dihapus.');
        fetchData();
      }
    } catch (err) {
      setError(err.message || 'Gagal menghapus aset ruangan.');
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'active':
        return <span className="status-badge status-completed">🟢 Baik / Aktif</span>;
      case 'damaged':
        return <span className="status-badge status-rejected">🔴 Rusak</span>;
      case 'repaired':
        return <span className="status-badge status-waiting_verification">🟡 Dalam Perbaikan</span>;
      default:
        return <span className="status-badge status-pending">{st}</span>;
    }
  };

  const filledItemsCount = items.filter((i) => i.nama_aset && i.nama_aset.trim() !== '').length;

  return (
    <div className="container-fluid">
      <div className="flex-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>Master Aset Ruangan</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Pelacakan inventaris fasilitas & peralatan per ruangan untuk akurasi laporan temuan kerusakan
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenNew} style={{ display: 'inline-flex', gap: '6px' }}>
          <Plus size={16} /> Tambah Aset Ruangan
        </button>
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

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Cari nama, kode aset, atau merk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: '280px' }}
        />

        <select
          className="form-control"
          value={selectedRoomFilter}
          onChange={(e) => setSelectedRoomFilter(e.target.value)}
          style={{ maxWidth: '240px' }}
        >
          <option value="">Semua Ruangan</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nama_ruangan || r.name} ({r.kode_ruangan || r.code})
            </option>
          ))}
        </select>

        <select
          className="form-control"
          value={selectedStatusFilter}
          onChange={(e) => setSelectedStatusFilter(e.target.value)}
          style={{ maxWidth: '180px' }}
        >
          <option value="">Semua Status</option>
          <option value="active">Baik / Aktif</option>
          <option value="damaged">Rusak</option>
          <option value="repaired">Sedang Diperbaiki</option>
        </select>

        {(selectedRoomFilter || selectedStatusFilter || search) && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSelectedRoomFilter('');
              setSelectedStatusFilter('');
              setSearch('');
            }}
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* Assets Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner"></div>
        </div>
      ) : assets.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <Box size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p>Tidak ada data aset ruangan yang sesuai filter.</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th>Kode Aset</th>
                <th>Nama Aset</th>
                <th>Merk / Brand</th>
                <th>Ruangan</th>
                <th>Status Kondisi</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                    {asset.kode_aset}
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    {asset.nama_aset}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {asset.merk || '-'}
                  </td>
                  <td>
                    <span style={{ fontWeight: 500 }}>{asset.room_name || asset.room?.nama_ruangan}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', display: 'block' }}>
                      ({asset.room_code || asset.room?.kode_ruangan})
                    </span>
                  </td>
                  <td>
                    {getStatusBadge(asset.status)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(asset)} title="Edit Aset">
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(asset)} title="Hapus Aset">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Form Aset (Dynamic Multi-Row Input) */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div 
            className="glass-panel" 
            style={{ 
              maxWidth: editingAsset ? '560px' : '860px', 
              width: '94vw', 
              maxHeight: '90vh', 
              overflowY: 'auto', 
              padding: '28px', 
              borderRadius: 'var(--radius-2xl)', 
              background: '#ffffff' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {editingAsset ? 'Edit Data Aset' : 'Tambah Aset Ruangan'}
                </span>
                <h2 className="modal-title" style={{ marginTop: '2px' }}>
                  {editingAsset ? 'Edit Aset Ruangan' : 'Tambah Daftar Aset Ruangan'}
                </h2>
              </div>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => setShowModal(false)}
                title="Tutup formulir"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                
                {/* 1. Pilih Ruangan */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Ruangan Penempatan *</label>
                  <select
                    className="form-control form-select"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    required
                  >
                    <option value="">Pilih Ruangan...</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nama_ruangan || r.name} ({r.kode_ruangan || r.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Daftar Baris Aset (Dynamic Multi-Row Input) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                      {editingAsset ? 'Detail Aset *' : `Daftar Aset (${items.length} Baris)`}
                    </label>
                    {!editingAsset && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {filledItemsCount} dari {items.length} item terisi
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {items.map((item, index) => (
                      <div 
                        key={item.id || index}
                        style={{
                          background: '#f9fafb',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-lg)',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          position: 'relative'
                        }}
                      >
                        {!editingAsset && items.length > 1 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                              Aset #{index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(index)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#dc2626',
                                cursor: 'pointer',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem'
                              }}
                              title="Hapus baris ini"
                            >
                              <Trash2 size={13} /> Hapus Baris
                            </button>
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: editingAsset ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '4px', display: 'block' }}>
                              Nama Aset *
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Contoh: AC Daikin 2PK, Wastafel"
                              value={item.nama_aset}
                              onChange={(e) => handleItemChange(index, 'nama_aset', e.target.value)}
                              required
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '4px', display: 'block' }}>
                              Kode Aset / Serial *
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Contoh: AST-5538"
                              value={item.kode_aset}
                              onChange={(e) => handleItemChange(index, 'kode_aset', e.target.value)}
                              required
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '4px', display: 'block' }}>
                              Merk / Brand
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Contoh: Daikin, Toto, Informa"
                              value={item.merk}
                              onChange={(e) => handleItemChange(index, 'merk', e.target.value)}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '4px', display: 'block' }}>
                              Status Kondisi *
                            </label>
                            <select
                              className="form-control form-select"
                              value={item.status}
                              onChange={(e) => handleItemChange(index, 'status', e.target.value)}
                              required
                            >
                              <option value="active">🟢 Baik / Normal</option>
                              <option value="damaged">🔴 Rusak</option>
                              <option value="repaired">🟡 Dalam Perbaikan</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tombol Tambah Baris Aset (Hanya mode tambah baru) */}
                  {!editingAsset && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleAddItemRow}
                      style={{
                        width: '100%',
                        marginTop: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        borderStyle: 'dashed',
                        fontWeight: 600,
                        background: '#eff6ff',
                        color: '#2563eb',
                        borderColor: '#bfdbfe'
                      }}
                    >
                      <Plus size={16} /> + Tambah Baris Aset Baru
                    </button>
                  )}
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ fontWeight: 700 }}>
                  {saving
                    ? 'Menyimpan...'
                    : editingAsset
                    ? '✓ Simpan Perubahan'
                    : filledItemsCount > 1
                    ? `✓ Simpan Semua Aset (${filledItemsCount} Item)`
                    : '✓ Simpan Aset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

