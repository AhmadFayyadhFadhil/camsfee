import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Plus, Edit2, Trash2, Check, X, ShieldAlert, Sparkles, Wrench, FlaskConical } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext.jsx';

export default function CleaningMaterials() {
  const confirm = useConfirm();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [search, setSearch] = useState('');
  const [jenisFilter, setJenisFilter] = useState('');

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [namaMaterial, setNamaMaterial] = useState('');
  const [jenis, setJenis] = useState('chemical');
  const [kodeMaterial, setKodeMaterial] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchMaterials = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/cleaning-materials?per_page=100';
      if (jenisFilter) url += `&jenis=${encodeURIComponent(jenisFilter)}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await api.get(url);
      if (res.success) {
        setMaterials(res.data.data || res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat daftar bahan kimia & alat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [jenisFilter, search]);

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
    setEditingMaterial(null);
    setNamaMaterial('');
    setJenis('chemical');
    setKodeMaterial(`MAT-${Math.floor(100 + Math.random() * 900)}`);
    setIsActive(true);
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingMaterial(item);
    setNamaMaterial(item.nama_material || '');
    setJenis(item.jenis || 'chemical');
    setKodeMaterial(item.kode_material || '');
    setIsActive(item.is_active !== undefined ? item.is_active : true);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!namaMaterial.trim() || !kodeMaterial.trim()) {
      setError('Nama dan kode material wajib diisi.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      nama_material: namaMaterial,
      jenis: jenis,
      kode_material: kodeMaterial,
      is_active: isActive,
    };

    try {
      let res;
      if (editingMaterial) {
        res = await api.put(`/cleaning-materials/${editingMaterial.id}`, payload);
      } else {
        res = await api.post('/cleaning-materials', payload);
      }

      if (res.success) {
        setSuccessMsg(editingMaterial ? 'Bahan/alat berhasil diperbarui.' : 'Bahan/alat baru berhasil ditambahkan.');
        setShowModal(false);
        fetchMaterials();
      }
    } catch (err) {
      setError(err.message || 'Gagal menyimpan data.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (
      !(await confirm({
        title: 'Hapus Bahan/Alat Kebersihan',
        message: `Apakah Anda yakin ingin menghapus "${item.nama_material}" (${item.kode_material})? Data historis laporan yang mencatat penggunaan bahan ini tetap utuh.`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        type: 'danger',
      }))
    ) {
      return;
    }

    try {
      const res = await api.delete(`/cleaning-materials/${item.id}`);
      if (res.success) {
        setSuccessMsg('Bahan/alat berhasil dihapus.');
        fetchMaterials();
      }
    } catch (err) {
      setError(err.message || 'Gagal menghapus data.');
    }
  };

  return (
    <div className="container-fluid">
      <div className="flex-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>Master Bahan Kimia & Alat Kerja</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Ketertelusuran (traceability) bahan pembersih & disinfektan industri sesuai kepatuhan standar GMP & HACCP
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenNew} style={{ display: 'inline-flex', gap: '6px' }}>
          <Plus size={16} /> Tambah Bahan / Alat
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
          placeholder="Cari nama atau kode bahan/alat..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: '300px' }}
        />

        <select
          className="form-control"
          value={jenisFilter}
          onChange={(e) => setJenisFilter(e.target.value)}
          style={{ maxWidth: '200px' }}
        >
          <option value="">Semua Kategori</option>
          <option value="chemical">Bahan Kimia / Disinfektan</option>
          <option value="tool">Alat Kerja / Mesin Pembersih</option>
        </select>

        {(jenisFilter || search) && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setJenisFilter('');
              setSearch('');
            }}
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* Table List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner"></div>
        </div>
      ) : materials.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <Sparkles size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p>Belum ada data bahan kimia & alat kerja.</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '14px 16px' }}>Kode</th>
                <th style={{ padding: '14px 16px' }}>Nama Bahan / Alat</th>
                <th style={{ padding: '14px 16px' }}>Kategori</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--primary)' }}>
                    {item.kode_material}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 500 }}>
                    {item.nama_material}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {item.jenis === 'chemical' ? (
                      <span className="role-badge role-cs" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <FlaskConical size={12} /> Chemical
                      </span>
                    ) : (
                      <span className="role-badge role-supervisor" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Wrench size={12} /> Tool
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {item.is_active ? (
                      <span className="badge badge-success">Aktif</span>
                    ) : (
                      <span className="badge badge-danger">Nonaktif</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(item)} title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item)} title="Hapus">
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

      {/* Modal Form (Floating Pop-up) */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div 
            className="glass-panel" 
            style={{ maxWidth: '520px', width: '92vw', maxHeight: '88vh', overflowY: 'auto', padding: '28px', borderRadius: 'var(--radius-2xl)', background: '#ffffff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {editingMaterial ? 'Edit Data Material' : 'Tambah Material'}
                </span>
                <h2 className="modal-title" style={{ marginTop: '2px' }}>
                  {editingMaterial ? 'Edit Bahan / Alat' : 'Tambah Bahan / Alat Baru'}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Kategori Material *</label>
                  <select
                    className="form-control form-select"
                    value={jenis}
                    onChange={(e) => setJenis(e.target.value)}
                    required
                  >
                    <option value="chemical">Bahan Kimia / Disinfektan (Chemical)</option>
                    <option value="tool">Alat Kerja / Mesin (Tool)</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Nama Bahan / Alat *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Alkohol 70% Food Grade, Karbol Sereh, Vacuum Extractor"
                    value={namaMaterial}
                    onChange={(e) => setNamaMaterial(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Kode Material / Alat *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: CHM-DIS-01, TOL-VAC-02"
                    value={kodeMaterial}
                    onChange={(e) => setKodeMaterial(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(14, 49, 146, 0.03)', padding: '12px 14px', borderRadius: 'var(--radius-lg)' }}>
                  <input
                    type="checkbox"
                    id="isActiveCheck"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <label htmlFor="isActiveCheck" style={{ margin: 0, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
                    Material Aktif Digunakan dalam Operasional
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ fontWeight: 700 }}>
                  {saving ? 'Menyimpan...' : 'Simpan Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
