import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Plus, Edit2, Trash2, Check, X, ShieldAlert, Layers, ListPlus, FileText } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext.jsx';

export default function ChecklistTemplates() {
  const confirm = useConfirm();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [search, setSearch] = useState('');

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [namaTemplate, setNamaTemplate] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [items, setItems] = useState([{ nama_item: '', deskripsi: '', frekuensi: 'harian', hari_minggu: 5, tanggal_bulan: 1 }]);
  const [saving, setSaving] = useState(false);

  const DAY_OPTIONS = [
    { value: 1, label: 'Senin' },
    { value: 2, label: 'Selasa' },
    { value: 3, label: 'Rabu' },
    { value: 4, label: 'Kamis' },
    { value: 5, label: 'Jumat' },
    { value: 6, label: 'Sabtu' },
    { value: 0, label: 'Minggu' },
  ];

  const formatFrequencyLabel = (freq, dayOfWeek, dayOfMonth) => {
    const f = (freq || 'harian').toLowerCase();
    if (f === 'mingguan' || f === 'weekly') {
      const dayNames = { 0: 'Minggu', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu' };
      const dName = dayNames[dayOfWeek] !== undefined ? dayNames[dayOfWeek] : 'Jumat';
      return `Mingguan (${dName})`;
    }
    if (f === 'bulanan' || f === 'monthly') {
      const dNum = dayOfMonth || 1;
      return `Bulanan (Tgl ${dNum})`;
    }
    return 'Harian';
  };

  const getFrequencyBadgeStyle = (freq) => {
    const f = (freq || 'harian').toLowerCase();
    if (f === 'mingguan' || f === 'weekly') {
      return { background: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed', border: '1px solid rgba(124, 58, 237, 0.3)' };
    }
    if (f === 'bulanan' || f === 'monthly') {
      return { background: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.3)' };
    }
    return { background: 'rgba(14, 49, 146, 0.08)', color: 'var(--primary)', border: '1px solid rgba(14, 49, 146, 0.2)' };
  };

  const fetchTemplates = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const url = search ? `/checklist-templates?search=${encodeURIComponent(search)}` : '/checklist-templates?per_page=100';
      const res = await api.get(url);
      if (res.success) {
        setTemplates(res.data.data || res.data || []);
      }
    } catch (err) {
      if (showLoading) setError(err.message || 'Gagal memuat daftar template checklist.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates(true);
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
    setEditingTemplate(null);
    setNamaTemplate('');
    setDeskripsi('');
    setItems([
      { nama_item: 'Sapu dan pel seluruh area lantai', deskripsi: 'Pastikan bersih, harum, dan tidak licin', frekuensi: 'harian', hari_minggu: 5, tanggal_bulan: 1 },
      { nama_item: 'Lap meja, kursi, dan debu perabotan', deskripsi: 'Gunakan kain mikrofiber lembap', frekuensi: 'harian', hari_minggu: 5, tanggal_bulan: 1 },
      { nama_item: 'Kuras tempat sampah dan pasang plastik baru', deskripsi: 'Ikat rapi dan buang ke TPS utama', frekuensi: 'harian', hari_minggu: 5, tanggal_bulan: 1 },
      { nama_item: 'Bersihkan noda dinding/tembok & lap kaca luar', deskripsi: 'Bersihkan noda bercak dan debu luar', frekuensi: 'mingguan', hari_minggu: 5, tanggal_bulan: 1 },
      { nama_item: 'Bersihkan plafon & sarang laba-laba sudut ruangan', deskripsi: 'Gunakan sapu langit-langit panjang', frekuensi: 'bulanan', hari_minggu: 5, tanggal_bulan: 1 },
      { nama_item: 'Deep cleaning exhaust fan & filter kisi-kisi AC', deskripsi: 'Bersihkan filter debu AC dan exhaust', frekuensi: 'bulanan', hari_minggu: 5, tanggal_bulan: 15 },
    ]);
    setShowModal(true);
  };

  const handleOpenEdit = (template) => {
    setEditingTemplate(template);
    setNamaTemplate(template.nama_template || '');
    setDeskripsi(template.deskripsi || '');
    setItems(
      template.items && template.items.length > 0
        ? template.items.map((i) => ({
            id: i.id,
            nama_item: i.nama_item,
            deskripsi: i.deskripsi || '',
            frekuensi: i.frekuensi || 'harian',
            hari_minggu: i.hari_minggu !== null && i.hari_minggu !== undefined ? Number(i.hari_minggu) : 5,
            tanggal_bulan: i.tanggal_bulan !== null && i.tanggal_bulan !== undefined ? Number(i.tanggal_bulan) : 1,
          }))
        : [{ nama_item: '', deskripsi: '', frekuensi: 'harian', hari_minggu: 5, tanggal_bulan: 1 }]
    );
    setShowModal(true);
  };

  const handleAddItemRow = () => {
    setItems([...items, { nama_item: '', deskripsi: '', frekuensi: 'harian', hari_minggu: 5, tanggal_bulan: 1 }]);
  };

  const handleRemoveItemRow = (index) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated.length > 0 ? updated : [{ nama_item: '', deskripsi: '', frekuensi: 'harian', hari_minggu: 5, tanggal_bulan: 1 }]);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!namaTemplate.trim()) {
      setError('Nama template wajib diisi.');
      return;
    }

    const validItems = items.filter((i) => i.nama_item.trim() !== '');
    if (validItems.length === 0) {
      setError('Minimal harus ada satu item checklist pada template.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      nama_template: namaTemplate,
      deskripsi: deskripsi,
      items: validItems,
    };

    try {
      let res;
      if (editingTemplate) {
        res = await api.put(`/checklist-templates/${editingTemplate.id}`, payload);
      } else {
        res = await api.post('/checklist-templates', payload);
      }

      if (res.success) {
        const savedTpl = res.data;
        if (savedTpl && savedTpl.id) {
          if (editingTemplate) {
            setTemplates((prev) => prev.map((t) => (t.id === editingTemplate.id ? { ...t, ...savedTpl } : t)));
          } else {
            setTemplates((prev) => [savedTpl, ...prev]);
          }
        }
        setSuccessMsg(editingTemplate ? 'Template checklist berhasil diperbarui.' : 'Template checklist berhasil dibuat.');
        setShowModal(false);
        setEditingTemplate(null);
        fetchTemplates(false);
      }
    } catch (err) {
      setError(err.message || 'Gagal menyimpan template checklist.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (template) => {
    if (
      !(await confirm({
        title: 'Hapus Template Checklist',
        message: `Apakah Anda yakin ingin menghapus template "${template.nama_template}"? Ruangan yang menggunakan template ini tidak akan kehilangan data historis.`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        type: 'danger',
      }))
    ) {
      return;
    }

    try {
      const res = await api.delete(`/checklist-templates/${template.id}`);
      if (res.success) {
        setTemplates((prev) => prev.filter((t) => t.id !== template.id));
        setSuccessMsg('Template checklist berhasil dihapus.');
        fetchTemplates(false);
      }
    } catch (err) {
      setError(err.message || 'Gagal menghapus template checklist.');
    }
  };

  return (
    <div className="container-fluid">
      <div className="flex-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>Master Template Checklist</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Standardisasi item kebersihan massal per tipe ruangan untuk efisiensi penugasan industri
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenNew} style={{ display: 'inline-flex', gap: '6px' }}>
          <Plus size={16} /> Buat Template Baru
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
      <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Cari nama template atau deskripsi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: '400px' }}
        />
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <Layers size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p>Belum ada template checklist. Silakan buat template baru.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {templates.map((tpl) => (
            <div
              key={tpl.id}
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
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--on-surface)' }}>{tpl.nama_template}</h3>
                  <span className="role-badge role-supervisor" style={{ fontSize: '0.75rem' }}>
                    {tpl.items?.length || tpl.items_count || 0} Item
                  </span>
                </div>
                {tpl.deskripsi && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '14px', lineHeight: 1.4 }}>
                    {tpl.deskripsi}
                  </p>
                )}

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '10px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Daftar Item Aktivitas:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {tpl.items && tpl.items.slice(0, 5).map((item, idx) => (
                      <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '0.82rem' }}>
                        <span style={{ color: 'var(--on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          &bull; {item.nama_item}
                        </span>
                        <span 
                          style={{ 
                            ...getFrequencyBadgeStyle(item.frekuensi),
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            fontSize: '0.7rem', 
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}
                        >
                          {formatFrequencyLabel(item.frekuensi, item.hari_minggu, item.tanggal_bulan)}
                        </span>
                      </div>
                    ))}
                    {tpl.items && tpl.items.length > 5 && (
                      <div style={{ fontStyle: 'italic', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        +{tpl.items.length - 5} item lainnya...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(tpl)} title="Edit Template">
                  <Edit2 size={14} /> Edit
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tpl)} title="Hapus Template">
                  <Trash2 size={14} /> Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form Template (Floating Pop-up) */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div 
            className="glass-panel" 
            style={{ 
              maxWidth: '720px', 
              width: '94vw', 
              maxHeight: '88vh', 
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
                  {editingTemplate ? 'Edit Data Template' : 'Formulir Pembuatan'}
                </span>
                <h2 className="modal-title" style={{ marginTop: '2px' }}>
                  {editingTemplate ? 'Edit Template Checklist' : 'Buat Template Checklist Baru'}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Nama Template Checklist *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Standar Ruang Produksi Steril, Standar Toilet Kantor"
                    value={namaTemplate}
                    onChange={(e) => setNamaTemplate(e.target.value)}
                    required
                    style={{ fontSize: '0.95rem' }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Deskripsi / Petunjuk Umum (Opsional)</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Keterangan standar kebersihan atau SOP khusus untuk template ini..."
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                    style={{ fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              {/* DAFTAR ITEM CHECKLIST */}
              <div style={{ background: 'rgba(14, 49, 146, 0.02)', border: '1px solid rgba(14, 49, 146, 0.1)', borderRadius: 'var(--radius-xl)', padding: '18px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <label className="form-label" style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary)' }}>
                      Daftar Item Aktivitas Kebersihan *
                    </label>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Tentukan nama aktivitas, detail SOP, dan frekuensi pelaksanaan (Harian / Mingguan / Bulanan)
                    </div>
                  </div>
                  <span className="role-badge role-supervisor" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    {items.length} Item
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {items.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start',
                        background: '#ffffff',
                        padding: '14px',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid rgba(14, 49, 146, 0.12)',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
                      }}
                    >
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)', width: '24px', paddingTop: '8px', textAlign: 'center' }}>
                        #{index + 1}
                      </span>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Nama aktivitas (misal: Sapu & pel lantai, Bersihkan noda tembok)..."
                            value={item.nama_item}
                            onChange={(e) => handleItemChange(index, 'nama_item', e.target.value)}
                            required
                            style={{ padding: '8px 12px', fontSize: '0.9rem', fontWeight: 600 }}
                          />
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Detail SOP singkat (opsional, misal: Gunakan disinfektan konsentrasi 5%)..."
                            value={item.deskripsi}
                            onChange={(e) => handleItemChange(index, 'deskripsi', e.target.value)}
                            style={{ padding: '6px 12px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}
                          />
                        </div>

                        {/* Pengaturan Frekuensi Dinamis per Item */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', background: 'rgba(248, 250, 252, 0.9)', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Frekuensi:</span>
                            <select
                              className="form-control"
                              value={item.frekuensi || 'harian'}
                              onChange={(e) => handleItemChange(index, 'frekuensi', e.target.value)}
                              style={{ padding: '4px 8px', fontSize: '0.78rem', height: '30px', fontWeight: 600, minWidth: '110px' }}
                            >
                              <option value="harian">Harian (Tiap Hari)</option>
                              <option value="mingguan">Mingguan (Pilih Hari)</option>
                              <option value="bulanan">Bulanan (Pilih Tgl)</option>
                            </select>
                          </div>

                          {/* Opsi Hari jika Mingguan */}
                          {item.frekuensi === 'mingguan' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed' }}>Hari:</span>
                              <select
                                className="form-control"
                                value={item.hari_minggu !== undefined && item.hari_minggu !== null ? item.hari_minggu : 5}
                                onChange={(e) => handleItemChange(index, 'hari_minggu', Number(e.target.value))}
                                style={{ padding: '4px 8px', fontSize: '0.78rem', height: '30px', fontWeight: 600, borderColor: '#c4b5fd', background: '#f5f3ff', color: '#6d28d9' }}
                              >
                                {DAY_OPTIONS.map((d) => (
                                  <option key={d.value} value={d.value}>Setiap Hari {d.label}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Opsi Tanggal jika Bulanan */}
                          {item.frekuensi === 'bulanan' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>Tanggal:</span>
                              <select
                                className="form-control"
                                value={item.tanggal_bulan || 1}
                                onChange={(e) => handleItemChange(index, 'tanggal_bulan', Number(e.target.value))}
                                style={{ padding: '4px 8px', fontSize: '0.78rem', height: '30px', fontWeight: 600, borderColor: '#a7f3d0', background: '#ecfdf5', color: '#047857' }}
                              >
                                {Array.from({ length: 31 }, (_, i) => i + 1).map((tgl) => (
                                  <option key={tgl} value={tgl}>Setiap Tanggal {tgl}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          <span 
                            style={{ 
                              ...getFrequencyBadgeStyle(item.frekuensi),
                              padding: '2px 8px', 
                              borderRadius: '10px', 
                              fontSize: '0.72rem', 
                              fontWeight: 700,
                              marginLeft: 'auto'
                            }}
                          >
                            {formatFrequencyLabel(item.frekuensi, item.hari_minggu, item.tanggal_bulan)}
                          </span>
                        </div>
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleRemoveItemRow(index)}
                          style={{ padding: '8px 10px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)', marginTop: '2px' }}
                          title="Hapus baris item ini"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* TOMBOL TAMBAH BARIS ITEM DI BAWAH ITEM TERAKHIR */}
                  <button 
                    type="button" 
                    className="btn" 
                    onClick={handleAddItemRow} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '8px', 
                      fontWeight: 700, 
                      fontSize: '0.92rem',
                      border: '2px dashed var(--primary)', 
                      background: 'rgba(14, 49, 146, 0.04)',
                      color: 'var(--primary)',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-lg)',
                      marginTop: '4px',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    <Plus size={18} /> + Tambah Baris Item Baru
                  </button>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving} style={{ minWidth: '100px' }}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: '160px', fontWeight: 700 }}>
                  {saving ? 'Menyimpan Template...' : 'Simpan Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
