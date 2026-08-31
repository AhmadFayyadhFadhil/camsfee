import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Plus, Edit2, Trash2, Check, X, ShieldAlert, Award, Star, CheckCircle } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext.jsx';

export default function SlaParameters() {
  const confirm = useConfirm();
  const [parameters, setParameters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [search, setSearch] = useState('');

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [editingParam, setEditingParam] = useState(null);
  const [namaParameter, setNamaParameter] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [tipePenilaian, setTipePenilaian] = useState('scale_1_5');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchParameters = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = search ? `/sla-parameters?search=${encodeURIComponent(search)}` : '/sla-parameters?per_page=100';
      const res = await api.get(url);
      if (res.success) {
        setParameters(res.data.data || res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat parameter SLA.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParameters();
  }, [search]);

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
    setEditingParam(null);
    setNamaParameter('');
    setDeskripsi('');
    setTipePenilaian('scale_1_5');
    setIsActive(true);
    setShowModal(true);
  };

  const handleOpenEdit = (param) => {
    setEditingParam(param);
    setNamaParameter(param.nama_parameter || '');
    setDeskripsi(param.deskripsi || '');
    setTipePenilaian(param.tipe_penilaian || 'scale_1_5');
    setIsActive(param.is_active !== undefined ? param.is_active : true);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!namaParameter.trim()) {
      setError('Nama parameter SLA wajib diisi.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      nama_parameter: namaParameter,
      deskripsi: deskripsi,
      tipe_penilaian: tipePenilaian,
      is_active: isActive,
    };

    try {
      let res;
      if (editingParam) {
        res = await api.put(`/sla-parameters/${editingParam.id}`, payload);
      } else {
        res = await api.post('/sla-parameters', payload);
      }

      if (res.success) {
        setSuccessMsg(editingParam ? 'Parameter SLA berhasil diperbarui.' : 'Parameter SLA baru berhasil dibuat.');
        setShowModal(false);
        fetchParameters();
      }
    } catch (err) {
      setError(err.message || 'Gagal menyimpan parameter SLA.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (param) => {
    if (
      !(await confirm({
        title: 'Hapus Parameter SLA',
        message: `Apakah Anda yakin ingin menghapus "${param.nama_parameter}"? Riwayat penilaian verifikasi lampau tetap tersimpan utuh.`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        type: 'danger',
      }))
    ) {
      return;
    }

    try {
      const res = await api.delete(`/sla-parameters/${param.id}`);
      if (res.success) {
        setSuccessMsg('Parameter SLA berhasil dihapus.');
        fetchParameters();
      }
    } catch (err) {
      setError(err.message || 'Gagal menghapus parameter SLA.');
    }
  };

  return (
    <div className="container-fluid">
      <div className="flex-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>Master Parameter SLA Kuantitatif</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Kriteria scorecard penilaian kebersihan terukur untuk verifikasi standar higienitas & KPI audit industri
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenNew} style={{ display: 'inline-flex', gap: '6px' }}>
          <Plus size={16} /> Buat Parameter SLA
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

      {/* Search Bar */}
      <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Cari parameter SLA atau deskripsi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: '400px' }}
        />
      </div>

      {/* Parameter Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner"></div>
        </div>
      ) : parameters.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <Award size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p>Belum ada parameter SLA kuantitatif.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {parameters.map((param) => (
            <div
              key={param.id}
              className="glass-panel"
              style={{
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--on-surface)' }}>{param.nama_parameter}</h3>
                  <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                    {param.tipe_penilaian === 'scale_1_5' ? 'Skala 1 - 5' : 'Ya / Tidak'}
                  </span>
                </div>

                {param.deskripsi && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '14px', lineHeight: 1.4 }}>
                    {param.deskripsi}
                  </p>
                )}

                <div style={{ marginTop: '12px' }}>
                  {param.tipe_penilaian === 'scale_1_5' ? (
                    <div style={{ display: 'flex', gap: '4px', color: '#eab308' }}>
                      <Star size={16} fill="#eab308" />
                      <Star size={16} fill="#eab308" />
                      <Star size={16} fill="#eab308" />
                      <Star size={16} fill="#eab308" />
                      <Star size={16} fill="#eab308" />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>Rating 1-5 Bintang</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: '#22c55e', fontSize: '0.8rem' }}>
                      <CheckCircle size={16} />
                      <span>Kepatuhan Binary (Sesuai / Tidak Sesuai)</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(param)} title="Edit Parameter">
                  <Edit2 size={14} /> Edit
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(param)} title="Hapus Parameter">
                  <Trash2 size={14} /> Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form (Floating Pop-up) */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div 
            className="glass-panel" 
            style={{ maxWidth: '540px', width: '92vw', maxHeight: '88vh', overflowY: 'auto', padding: '28px', borderRadius: 'var(--radius-2xl)', background: '#ffffff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {editingParam ? 'Edit Data Parameter' : 'Tambah Parameter'}
                </span>
                <h2 className="modal-title" style={{ marginTop: '2px' }}>
                  {editingParam ? 'Edit Parameter SLA' : 'Buat Parameter SLA Baru'}
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
                  <label className="form-label" style={{ fontWeight: 700 }}>Nama Parameter SLA *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Kilau Lantai & Bebas Debu, Kesegaran Aroma Ruangan"
                    value={namaParameter}
                    onChange={(e) => setNamaParameter(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Deskripsi & Standar Pengujian</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Panduan bagi verifikator untuk memberikan skor..."
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Tipe Skala Penilaian *</label>
                  <select
                    className="form-control form-select"
                    value={tipePenilaian}
                    onChange={(e) => setTipePenilaian(e.target.value)}
                    required
                  >
                    <option value="scale_1_5">Skala Angka 1 sampai 5 (1 = Buruk, 5 = Sempurna)</option>
                    <option value="yes_no">Binary Ya / Tidak (Yes / No Compliance)</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(14, 49, 146, 0.03)', padding: '12px 14px', borderRadius: 'var(--radius-lg)' }}>
                  <input
                    type="checkbox"
                    id="isSlaActiveCheck"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <label htmlFor="isSlaActiveCheck" style={{ margin: 0, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
                    Parameter Aktif Digunakan Saat Verifikasi
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ fontWeight: 700 }}>
                  {saving ? 'Menyimpan...' : 'Simpan Parameter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
